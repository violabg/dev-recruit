import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    user: { findUnique: vi.fn() },
    interview: { findUnique: vi.fn(), findMany: vi.fn() },
    interviewKit: { findUnique: vi.fn(), update: vi.fn() },
    scorecardCriterion: { findMany: vi.fn() },
    evaluation: { findFirst: vi.fn() },
    assessment: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/services/scorecards", () => ({
  getActiveCriteria: vi.fn(),
  FOREIGN_CRITERIA_MESSAGE:
    "Uno o più criteri non appartengono a questa posizione",
}));

vi.mock("@/lib/services/resume-evaluation", () => ({
  extractTextFromPDF: vi.fn(),
}));

vi.mock("@/lib/services/ai/sanitize", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/ai/sanitize")>();
  return {
    ...actual,
    redactBirthDate: vi.fn(actual.redactBirthDate),
    sanitizeInput: vi.fn(actual.sanitizeInput),
  };
});

import prisma from "@/lib/prisma";
import { MAX_ANSWER_CHARS, MAX_RESUME_CHARS } from "@/lib/services/ai/evaluation-prompts";
import { redactBirthDate, sanitizeInput } from "@/lib/services/ai/sanitize";
import {
  buildKitGenerationContext,
  cleanKitCriteria,
  loadGuideForSnapshot,
  saveInterviewKit,
  setInterviewKitStatus,
  syncKitItems,
} from "@/lib/services/interview-kits";
import { extractTextFromPDF } from "@/lib/services/resume-evaluation";
import { getActiveCriteria } from "@/lib/services/scorecards";

const db = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
});

// ====================
// loadGuideForSnapshot
// ====================

describe("loadGuideForSnapshot", () => {
  const client = () => ({ interviewGuide: { findUnique: vi.fn() } });

  it("returns the ordered guide with normalized anchors", async () => {
    const c = client();
    c.interviewGuide.findUnique.mockResolvedValue({
      id: "g1",
      positionId: "pos-1",
      title: "Tecnico",
      round: 1,
      durationMinutes: 60,
      sections: [
        {
          id: "s1",
          title: "Tecnica",
          minutes: 30,
          kind: "technical",
          questions: [
            {
              id: "q1",
              text: "Domanda",
              followUps: [],
              criterionIds: ["c1"],
              anchors: { weak: "w", medium: 3 },
              required: true,
            },
          ],
        },
      ],
    });

    const guide = await loadGuideForSnapshot(c as any, "g1", "pos-1");

    expect(guide.sections[0].questions[0].anchors).toEqual({
      weak: "w",
      medium: "",
      strong: "",
    });
    const select = c.interviewGuide.findUnique.mock.calls[0][0].select;
    expect(select.sections.orderBy).toEqual({ order: "asc" });
    expect(select.sections.select.questions.orderBy).toEqual({ order: "asc" });
  });

  it("refuses a missing guide and a guide of another position", async () => {
    const c = client();
    c.interviewGuide.findUnique.mockResolvedValueOnce(null);
    await expect(loadGuideForSnapshot(c as any, "g1", "pos-1")).rejects.toThrow(
      "Traccia non trovata per questa posizione",
    );

    c.interviewGuide.findUnique.mockResolvedValueOnce({
      id: "g1",
      positionId: "pos-other",
      sections: [],
    });
    await expect(loadGuideForSnapshot(c as any, "g1", "pos-1")).rejects.toThrow(
      "Traccia non trovata per questa posizione",
    );
  });
});

// ====================
// syncKitItems
// ====================

function makeTx() {
  return {
    kitItem: {
      findMany: vi.fn().mockResolvedValue([
        { id: "t1", text: "Template", followUps: [], criterionIds: ["c1"], origin: "template", edited: false },
        { id: "ai1", text: "AI uno", followUps: ["f"], criterionIds: ["c1"], origin: "cv", edited: false },
        { id: "ai2", text: "AI due", followUps: [], criterionIds: [], origin: "quiz_answer", edited: false },
        { id: "m1", text: "Manuale", followUps: [], criterionIds: [], origin: "manual", edited: false },
        { id: "gone", text: "Da togliere", followUps: [], criterionIds: [], origin: "template", edited: false },
      ]),
      update: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    kitSection: {
      findMany: vi.fn().mockResolvedValue([{ id: "s1" }, { id: "s2" }]),
    },
    // Must never be touched by the kit save
    kitItemNote: { deleteMany: vi.fn(), update: vi.fn() },
  };
}

const row = (overrides: Record<string, unknown>) => ({
  sectionId: "s1",
  text: "Testo",
  followUps: [],
  criterionIds: [],
  required: false,
  origin: "manual" as const,
  ...overrides,
});

describe("syncKitItems", () => {
  it("updates, creates and deletes rows, with order per section", async () => {
    const tx = makeTx();

    const result = await syncKitItems(tx as any, "kit-1", [
      row({ id: "t1", text: "Template ritoccato", criterionIds: ["c1"] }),
      row({ id: "ai1", sectionId: "s2", text: "AI uno", followUps: ["f"], criterionIds: ["c1"], origin: "cv" }),
      row({ id: "ai2", text: "AI due cambiata", origin: "quiz_answer" }),
      row({ text: "Nuova manuale" }),
      row({ sectionId: "s2", text: "Nuova AI", origin: "resume_gap", rationale: "perché", sourceRef: "cv:x" }),
      row({ id: "m1", text: "Manuale cambiata" }),
    ]);

    expect(result).toEqual({ deletedIds: ["gone"] });
    expect(tx.kitItem.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["gone"] } } });

    const updates = Object.fromEntries(
      tx.kitItem.update.mock.calls.map((call) => [call[0].where.id, call[0].data]),
    );
    // Template and manual rows never become edited
    expect(updates.t1).toMatchObject({ text: "Template ritoccato", edited: false, order: 0 });
    expect(updates.m1).toMatchObject({ edited: false, order: 3 });
    // AI row unchanged: not edited
    expect(updates.ai1).toMatchObject({ edited: false, sectionId: "s2", order: 0 });
    // AI row with a changed text: edited
    expect(updates.ai2).toMatchObject({ edited: true, order: 1 });
    // The origin never changes on update
    for (const data of Object.values(updates)) {
      expect(data).not.toHaveProperty("origin");
    }

    const creates = tx.kitItem.create.mock.calls.map((call) => call[0].data);
    expect(creates).toEqual([
      expect.objectContaining({ kitId: "kit-1", text: "Nuova manuale", origin: "manual", edited: false, order: 2 }),
      expect.objectContaining({
        kitId: "kit-1",
        text: "Nuova AI",
        origin: "resume_gap",
        rationale: "perché",
        sourceRef: "cv:x",
        edited: false,
        order: 1,
      }),
    ]);

    // covered is shared and only the live action writes it
    for (const data of [...Object.values(updates), ...creates]) {
      expect(data).not.toHaveProperty("covered");
      expect(data).not.toHaveProperty("coveredAt");
    }
    expect(tx.kitItemNote.deleteMany).not.toHaveBeenCalled();
    expect(tx.kitItemNote.update).not.toHaveBeenCalled();
  });

  it("marks an AI row edited when follow-ups or criteria change", async () => {
    const tx = makeTx();
    await syncKitItems(tx as any, "kit-1", [
      row({ id: "ai1", text: "AI uno", followUps: ["f", "g"], criterionIds: ["c1"], origin: "cv" }),
      row({ id: "ai2", text: "AI due", followUps: [], criterionIds: ["c2"], origin: "quiz_answer" }),
    ]);
    const updates = tx.kitItem.update.mock.calls.map((call) => call[0].data);
    expect(updates.every((data) => data.edited === true)).toBe(true);
  });

  it("never creates a new template row: it becomes manual", async () => {
    const tx = makeTx();
    await syncKitItems(tx as any, "kit-1", [row({ text: "Finta", origin: "template" })]);
    expect(tx.kitItem.create.mock.calls[0][0].data.origin).toBe("manual");
  });

  it("refuses an id of another kit and an unknown section", async () => {
    const tx = makeTx();
    await expect(
      syncKitItems(tx as any, "kit-1", [row({ id: "foreign" })]),
    ).rejects.toThrow("Una o più domande non appartengono a questa preparazione");

    await expect(
      syncKitItems(tx as any, "kit-1", [row({ sectionId: "s-other" })]),
    ).rejects.toThrow("Sezione della preparazione non valida");

    expect(tx.kitItem.update).not.toHaveBeenCalled();
    expect(tx.kitItem.create).not.toHaveBeenCalled();
    expect(tx.kitItem.deleteMany).not.toHaveBeenCalled();
  });
});

// ====================
// cleanKitCriteria
// ====================

describe("cleanKitCriteria", () => {
  const client = (storedItemCriteria: string[][], storedHypotheses: unknown = []) => ({
    scorecardCriterion: {
      findMany: vi.fn().mockResolvedValue([
        { id: "active", archivedAt: null },
        { id: "archived-stored", archivedAt: new Date() },
        { id: "archived-new", archivedAt: new Date() },
      ]),
    },
    interviewKit: {
      findUnique: vi.fn().mockResolvedValue({
        hypotheses: storedHypotheses,
        items: storedItemCriteria.map((criterionIds) => ({ criterionIds })),
      }),
    },
  });

  it("drops unknown ids and keeps active and already-stored archived ids", async () => {
    const c = client([["archived-stored"]]);

    const cleaned = await cleanKitCriteria(c as any, "kit-1", "pos-1", {
      items: [row({ criterionIds: ["active", "deleted", "archived-stored"] })] as any,
      hypotheses: [
        { criterionId: "active", hypothesis: "Ipotesi", howToVerify: "Chiedi" },
        { criterionId: "deleted", hypothesis: "Ipotesi", howToVerify: "Chiedi" },
      ],
    });

    expect(cleaned.items[0].criterionIds).toEqual(["active", "archived-stored"]);
    expect(cleaned.hypotheses).toEqual([
      { criterionId: "active", hypothesis: "Ipotesi", howToVerify: "Chiedi" },
    ]);
    expect(c.scorecardCriterion.findMany).toHaveBeenCalledWith({
      where: { scorecard: { positionId: "pos-1" } },
      select: { id: true, archivedAt: true },
    });
  });

  it("accepts an archived id already cited by a stored hypothesis", async () => {
    const c = client([], [{ criterionId: "archived-stored" }]);
    const cleaned = await cleanKitCriteria(c as any, "kit-1", "pos-1", {
      items: [],
      hypotheses: [
        { criterionId: "archived-stored", hypothesis: "Ipotesi", howToVerify: "Chiedi" },
      ],
    });
    expect(cleaned.hypotheses).toHaveLength(1);
  });

  it("refuses an archived criterion new to the kit, on items and on hypotheses", async () => {
    await expect(
      cleanKitCriteria(client([]) as any, "kit-1", "pos-1", {
        items: [row({ criterionIds: ["archived-new"] })] as any,
        hypotheses: [],
      }),
    ).rejects.toThrow(
      "Uno o più criteri non appartengono a questa posizione",
    );

    await expect(
      cleanKitCriteria(client([]) as any, "kit-1", "pos-1", {
        items: [],
        hypotheses: [
          { criterionId: "archived-new", hypothesis: "Ipotesi", howToVerify: "Chiedi" },
        ],
      }),
    ).rejects.toThrow(
      "Uno o più criteri non appartengono a questa posizione",
    );
  });
});

// ====================
// saveInterviewKit / setInterviewKitStatus
// ====================

const KIT_LOCKED = "La preparazione si modifica solo prima del colloquio";
const SESSION_EXPIRED = "Sessione scaduta. Accedi di nuovo per continuare.";
const actor = { userId: "user-123", role: "user" } as const;

const scheduledInterviewRow = (status: string) => ({
  id: "int-1",
  applicationId: "app-1",
  status,
  round: 1,
  application: { candidateId: "cand-1", positionId: "pos-1" },
});

const kitInput = {
  interviewId: "int-1",
  briefing: ["Punto"],
  hypotheses: [
    { criterionId: "active", hypothesis: "Ipotesi", howToVerify: "Chiedi" },
    { criterionId: "deleted", hypothesis: "Ipotesi", howToVerify: "Chiedi" },
  ],
  checklist: [
    { id: "k1", category: "communicate" as const, text: "RAL e benefit", done: true },
  ],
  items: [row({ id: "t1", text: "Template", criterionIds: ["c1"] })] as any,
  missingSources: ["cv" as const],
};

/** Kit-save transaction: syncKitItems delegates plus the kit update */
function makeSaveTx() {
  return { ...makeTx(), interviewKit: { update: vi.fn() } };
}

function armKitSave(status = "scheduled", kitStatus = "draft") {
  db.user.findUnique.mockResolvedValue({ emailVerified: true, banned: false });
  db.interview.findUnique.mockResolvedValue(scheduledInterviewRow(status));
  db.interviewKit.findUnique.mockImplementation(async (args: any) =>
    args.where.interviewId
      ? { id: "kit-1", status: kitStatus }
      : { hypotheses: [], items: [] },
  );
  db.scorecardCriterion.findMany.mockResolvedValue([
    { id: "active", archivedAt: null },
    { id: "c1", archivedAt: null },
  ]);
  const tx = makeSaveTx();
  db.$transaction.mockImplementation(async (fn: any) => fn(tx));
  return tx;
}

describe("saveInterviewKit", () => {
  it("cleans the criteria, syncs the items and updates the kit in one transaction", async () => {
    const tx = armKitSave();

    const result = await saveInterviewKit(actor, kitInput);

    expect(result).toEqual({
      kitId: "kit-1",
      interviewId: "int-1",
      applicationId: "app-1",
    });
    // syncKitItems ran on the transaction
    expect(tx.kitItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { kitId: "kit-1" } }),
    );
    expect(tx.kitItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "t1" } }),
    );
    expect(tx.interviewKit.update).toHaveBeenCalledWith({
      where: { id: "kit-1" },
      data: {
        briefing: ["Punto"],
        // The hypothesis citing a deleted criterion is dropped
        hypotheses: [kitInput.hypotheses[0]],
        checklist: kitInput.checklist,
        missingSources: ["cv"],
      },
    });
    // The status is never changed by a save, and nothing is written outside the transaction
    expect(tx.interviewKit.update.mock.calls[0][0].data).not.toHaveProperty("status");
    expect(db.interviewKit.update).not.toHaveBeenCalled();
    expect(tx.kitItemNote.deleteMany).not.toHaveBeenCalled();
  });

  it.each(["in_progress", "completed", "cancelled", "no_show"])(
    "is refused when the interview is %s",
    async (status) => {
      armKitSave(status);

      await expect(saveInterviewKit(actor, kitInput)).rejects.toThrow(KIT_LOCKED);
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );

  it("saves a ready kit from the dashboard (no draft-only check)", async () => {
    const tx = armKitSave("scheduled", "ready");

    await expect(saveInterviewKit(actor, kitInput)).resolves.toMatchObject({
      kitId: "kit-1",
    });
    expect(tx.interviewKit.update).toHaveBeenCalled();
  });

  it("with requireDraftStatus refuses a ready kit and saves nothing", async () => {
    armKitSave("scheduled", "ready");

    await expect(
      saveInterviewKit(actor, kitInput, { requireDraftStatus: true }),
    ).rejects.toThrow(
      "La preparazione è pronta: riportala in bozza dalla dashboard per modificarla",
    );
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("with requireDraftStatus saves a draft kit", async () => {
    const tx = armKitSave("scheduled", "draft");

    await saveInterviewKit(actor, kitInput, { requireDraftStatus: true });

    expect(tx.interviewKit.update).toHaveBeenCalled();
  });

  it("refuses a disabled actor before reading the interview", async () => {
    armKitSave();
    db.user.findUnique.mockResolvedValue({ emailVerified: true, banned: true });

    await expect(saveInterviewKit(actor, kitInput)).rejects.toThrow(SESSION_EXPIRED);
    expect(db.interview.findUnique).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("refuses invalid input with the schema", async () => {
    armKitSave();

    await expect(
      saveInterviewKit(actor, { ...kitInput, interviewId: "" } as any),
    ).rejects.toThrow();
    expect(db.interview.findUnique).not.toHaveBeenCalled();
  });

  it("propagates a transaction failure", async () => {
    armKitSave();
    db.$transaction.mockRejectedValue(new Error("db down"));

    await expect(saveInterviewKit(actor, kitInput)).rejects.toThrow("db down");
  });
});

describe("setInterviewKitStatus", () => {
  it("sets the status while scheduled and returns it with the ids", async () => {
    armKitSave();

    const result = await setInterviewKitStatus(actor, {
      interviewId: "int-1",
      status: "ready",
    });

    expect(result).toEqual({
      status: "ready",
      interviewId: "int-1",
      applicationId: "app-1",
    });
    expect(db.interviewKit.update).toHaveBeenCalledWith({
      where: { id: "kit-1" },
      data: { status: "ready" },
    });
  });

  it("is refused after the interview started", async () => {
    armKitSave("completed");

    await expect(
      setInterviewKitStatus(actor, { interviewId: "int-1", status: "draft" }),
    ).rejects.toThrow(KIT_LOCKED);
    expect(db.interviewKit.update).not.toHaveBeenCalled();
  });

  it("refuses a missing kit", async () => {
    armKitSave();
    db.interviewKit.findUnique.mockResolvedValue(null);

    await expect(
      setInterviewKitStatus(actor, { interviewId: "int-1", status: "ready" }),
    ).rejects.toThrow("Colloquio non trovato");
  });

  it("refuses an unverified actor", async () => {
    armKitSave();
    db.user.findUnique.mockResolvedValue({ emailVerified: false, banned: false });

    await expect(
      setInterviewKitStatus(actor, { interviewId: "int-1", status: "ready" }),
    ).rejects.toThrow(SESSION_EXPIRED);
    expect(db.interviewKit.update).not.toHaveBeenCalled();
  });
});

// ====================
// buildKitGenerationContext
// ====================

const criteria = [
  { id: "c1", name: "React", description: null, category: "technical", priority: "must", weight: 3, expectedLevel: 3 },
  { id: "c2", name: "SQL", description: null, category: "technical", priority: "nice", weight: 2, expectedLevel: 4 },
  { id: "c3", name: "Comunicazione", description: null, category: "soft", priority: "nice", weight: 1, expectedLevel: 3 },
];

const interviewRow = (resumeUrl: string | null = "https://r2/cv.pdf") => ({
  id: "int-1",
  round: 2,
  durationMinutes: 60,
  applicationId: "app-1",
  application: {
    candidateId: "cand-1",
    positionId: "pos-1",
    candidate: { resumeUrl },
    position: {
      title: "Frontend",
      experienceLevel: "senior",
      skills: ["React"],
      softSkills: ["Comunicazione"],
    },
  },
  kit: {
    sections: [{ id: "s1", title: "Tecnica", minutes: 30, kind: "technical" }],
    items: [
      { origin: "template", edited: false, text: "Presentati" },
      { origin: "template", edited: true, text: "Progetto complesso?" },
      { origin: "template", edited: false, text: "Accessibilità" },
      { origin: "cv", edited: true, text: "Ruolo da PM" },
      { origin: "quiz_answer", edited: false, text: "Concorrenza" },
      { origin: "manual", edited: false, text: "Domanda manuale" },
    ],
  },
});

const weakQuestion = (n: number, type = "open_question") => ({
  question: { id: `q${n}`, type, question: `Domanda ${n}`, options: ["A", "B", "C"] },
});

function arrangeFullContext() {
  db.interview.findUnique.mockResolvedValue(interviewRow());
  vi.mocked(getActiveCriteria).mockResolvedValue(criteria as any);
  vi.mocked(extractTextFromPDF).mockResolvedValue(
    "Mario Rossi\nNato il 12/03/1990\nmario@example.com\nReact developer",
  );
  db.evaluation.findFirst.mockResolvedValue({
    weaknesses: ["Poca esperienza di test"],
    criteriaAssessment: {
      c1: { score: 2, evidence: "" },
      c2: { score: 4, evidence: "" },
      c3: { score: null, evidence: "" },
    },
  });
  db.assessment.findFirst.mockResolvedValue({
    answers: { q1: "risposta uno", q2: 1, q3: { code: "let x" }, q4: "r4", q5: "r5", q6: "r6", q7: "r7", q8: "r8" },
    evaluation: {
      answerEvaluations: {
        q1: { score: 6, strengths: [], weaknesses: ["vaga"] },
        q2: { score: 1, strengths: [], weaknesses: [] },
        q3: { score: 2, strengths: [], weaknesses: [] },
        q4: { score: 5, strengths: [], weaknesses: [] },
        q5: { score: 3, strengths: [], weaknesses: [] },
        q6: { score: 4, strengths: [], weaknesses: [] },
        q7: { score: 0, strengths: [], weaknesses: [] },
        q8: { score: 7, strengths: [], weaknesses: [] },
        q9: { score: 9, strengths: [], weaknesses: [] },
      },
    },
    quiz: {
      quizQuestions: [
        weakQuestion(1),
        weakQuestion(2, "multiple_choice"),
        weakQuestion(3, "code_snippet"),
        weakQuestion(4),
        weakQuestion(5),
        weakQuestion(6),
        weakQuestion(7),
        weakQuestion(8),
        weakQuestion(9),
      ],
    },
  });
  db.interview.findMany.mockResolvedValue([
    {
      feedback: [
        {
          id: "fb1",
          scores: [
            { criterionId: "c1", score: 2 },
            { criterionId: "c3", score: 3 },
          ],
        },
        {
          id: "fb2",
          scores: [
            { criterionId: "c1", score: 5 },
            { criterionId: "c3", score: 4 },
          ],
        },
      ],
    },
    { feedback: [] },
  ]);
}

describe("buildKitGenerationContext", () => {
  it("gathers every source with counts, gaps, weak answers and previous rounds", async () => {
    arrangeFullContext();

    const context = await buildKitGenerationContext("int-1");

    expect(context.interview).toEqual({ id: "int-1", round: 2, durationMinutes: 60 });
    expect(context.templateQuestionCount).toBe(3);
    expect(context.keptAiItemCount).toBe(1);
    expect(context.existingQuestions).toEqual([
      "Presentati",
      "Progetto complesso?",
      "Accessibilità",
      "Ruolo da PM",
    ]);
    expect(context.sections).toEqual([
      { id: "s1", title: "Tecnica", minutes: 30, kind: "technical" },
    ]);
    expect(context.missingSources).toEqual([]);
    expect(context.resumeWeaknesses).toEqual(["Poca esperienza di test"]);
    expect(context.resumeCriteriaGaps).toEqual([
      { criterionId: "c1", score: 2, expectedLevel: 3 },
      { criterionId: "c3", score: null, expectedLevel: 3 },
    ]);

    // score < 7, lowest first, at most 6
    expect(context.weakAnswers.map((answer) => [answer.questionId, answer.score])).toEqual([
      ["q7", 0],
      ["q2", 1],
      ["q3", 2],
      ["q5", 3],
      ["q6", 4],
      ["q4", 5],
    ]);
    const byId = Object.fromEntries(context.weakAnswers.map((a) => [a.questionId, a]));
    // Multiple choice: the text of the chosen option
    expect(byId.q2.answer).toBe("B");
    expect(byId.q3.answer).toBe("let x");
    expect(byId.q2.question).toBe("Domanda 2");

    // Previous completed rounds: statistics only
    expect(db.interview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { applicationId: "app-1", status: "completed", round: { lt: 2 } },
      }),
    );
    expect(context.previousRounds).toEqual([
      {
        feedbackIds: ["fb1", "fb2"],
        criteria: [
          { criterionId: "c1", status: "discordant", scores: [2, 5] },
          { criterionId: "c2", status: "no_evidence", scores: [] },
        ],
      },
    ]);
  });

  it("redacts the birth date BEFORE sanitizing the CV, with the resume cap", async () => {
    arrangeFullContext();

    const context = await buildKitGenerationContext("int-1");

    const raw = "Mario Rossi\nNato il 12/03/1990\nmario@example.com\nReact developer";
    expect(redactBirthDate).toHaveBeenCalledWith(raw);
    const redacted = vi.mocked(redactBirthDate).mock.results[0].value;
    expect(redacted).toContain("[rimosso]");
    const cvCall = vi
      .mocked(sanitizeInput)
      .mock.calls.findIndex((call) => call[0] === redacted);
    expect(cvCall).toBeGreaterThanOrEqual(0);
    expect(vi.mocked(sanitizeInput).mock.calls[cvCall][1]).toBe(MAX_RESUME_CHARS);
    expect(vi.mocked(redactBirthDate).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(sanitizeInput).mock.invocationCallOrder[cvCall],
    );
    expect(context.resumeText).not.toContain("12/03/1990");
  });

  it("sanitizes every answer with the answer cap", async () => {
    arrangeFullContext();
    await buildKitGenerationContext("int-1");

    const answerCalls = vi
      .mocked(sanitizeInput)
      .mock.calls.filter((call) => call[1] === MAX_ANSWER_CHARS);
    expect(answerCalls.map((call) => call[0])).toEqual(
      expect.arrayContaining(["r7", "B", "let x", "r5", "r6", "r4"]),
    );
    expect(answerCalls).toHaveLength(6);
  });

  it("never reads nor returns the candidate's name, email, birth date or resume URL", async () => {
    arrangeFullContext();

    const context = await buildKitGenerationContext("int-1");

    const select = db.interview.findUnique.mock.calls[0][0].select;
    expect(select.application.select.candidate.select).toEqual({ resumeUrl: true });
    const serialized = JSON.stringify(context);
    expect(serialized).not.toContain("https://r2/cv.pdf");
    expect(serialized).not.toContain("12/03/1990");
    expect(serialized).not.toMatch(/dateOfBirth|firstName|lastName|email"/);
  });

  it("reports the missing CV, CV evaluation and test", async () => {
    db.interview.findUnique.mockResolvedValue(interviewRow(null));
    vi.mocked(getActiveCriteria).mockResolvedValue(criteria as any);
    db.evaluation.findFirst.mockResolvedValue(null);
    db.assessment.findFirst.mockResolvedValue(null);
    db.interview.findMany.mockResolvedValue([]);

    const context = await buildKitGenerationContext("int-1");

    expect(extractTextFromPDF).not.toHaveBeenCalled();
    expect(context.resumeText).toBeNull();
    expect(context.missingSources).toEqual(["cv", "cv_evaluation", "assessment"]);
    expect(context.weakAnswers).toEqual([]);
    expect(context.previousRounds).toEqual([]);
  });

  it("reports the CV as missing when the PDF cannot be read, and the answer detail when absent", async () => {
    arrangeFullContext();
    vi.mocked(extractTextFromPDF).mockRejectedValue(new Error("PDF rotto"));
    db.assessment.findFirst.mockResolvedValue({
      answers: {},
      evaluation: { answerEvaluations: null },
      quiz: { quizQuestions: [] },
    });

    const context = await buildKitGenerationContext("int-1");

    expect(context.resumeText).toBeNull();
    expect(context.missingSources).toEqual(["cv", "answer_detail"]);
  });

  it("asks for the scorecard first when there are no active criteria", async () => {
    db.interview.findUnique.mockResolvedValue(interviewRow());
    vi.mocked(getActiveCriteria).mockResolvedValue([]);

    await expect(buildKitGenerationContext("int-1")).rejects.toThrow(
      "Aggiungi prima i criteri della posizione",
    );
  });

  it("refuses a missing interview", async () => {
    db.interview.findUnique.mockResolvedValue(null);
    await expect(buildKitGenerationContext("nope")).rejects.toThrow(
      "Colloquio non trovato",
    );
  });
});
