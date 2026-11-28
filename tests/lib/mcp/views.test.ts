import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/applications", () => ({
  getApplicationDetail: vi.fn(),
  getApplicationDecision: vi.fn(),
}));

vi.mock("@/lib/data/interviews", () => ({
  getAgendaInterviews: vi.fn(),
  getInterviewForPreparation: vi.fn(),
  getInterviewsByApplication: vi.fn(),
}));

vi.mock("@/lib/utils/decision-score", () => ({
  computeDecisionScore: vi.fn(() => ({ overall: 3.8 })),
}));

vi.mock("@/lib/mcp/untrusted", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mcp/untrusted")>()),
  loadCandidateCvText: vi.fn(),
}));

import {
  getApplicationDecision,
  getApplicationDetail,
} from "@/lib/data/applications";
import {
  getAgendaInterviews,
  getInterviewForPreparation,
  getInterviewsByApplication,
} from "@/lib/data/interviews";
import { links } from "@/lib/mcp/links";
import { loadCandidateCvText } from "@/lib/mcp/untrusted";
import {
  buildApplicationView,
  buildInterviewPrepView,
  buildInterviewRows,
} from "@/lib/mcp/views";
import type { Actor } from "@/lib/services/actor";

const actor: Actor = { userId: "u1", role: "user" };
const at = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000);

const detail = {
  id: "app-1",
  stage: "interview",
  stageChangedAt: at(-2),
  createdAt: at(-10),
  owner: { id: "owner-1", name: "Laura" },
  decision: null,
  decidedAt: null,
  candidate: {
    id: "cand-1",
    firstName: "Mario",
    lastName: "Rossi",
    email: "mario@example.com",
    resumeUrl: "https://r2.example.com/cv.pdf",
    doNotContact: false,
    doNotContactNote: null,
  },
  position: { id: "pos-1", title: "Dev", experienceLevel: "senior", status: "open" },
  otherApplications: [],
  assessments: [
    {
      id: "as-1",
      quiz: { id: "q1", title: "React", timeLimit: null },
      evaluation: { id: "ev-2", quizScore: 72, fitScore: 7, createdAt: at(-3) },
    },
    { id: "as-2", quiz: { id: "q2", title: "Node", timeLimit: null }, evaluation: null },
  ],
  resumeEvaluation: {
    id: "ev-1",
    fitScore: 8,
    recommendation: "Procedere",
    createdAt: at(-5),
    evaluation: "testo",
    strengths: [],
    weaknesses: [],
    criteriaAssessment: null,
  },
  availableQuizzes: [],
  interviews: [],
};

const decisionWith = (interviews: { participantIds: string[]; submittedInterviewerIds: string[] }[]) => ({
  criteria: [],
  sources: [],
  recorded: { outcome: "offer", decidedAt: at(-1), weights: null, rationale: "ok", decidedBy: null },
  interviews: interviews.map((interview, index) => ({ id: `int-${index}`, ...interview })),
});

beforeEach(() => {
  vi.mocked(getApplicationDetail).mockResolvedValue(detail as any);
  vi.mocked(getApplicationDecision).mockResolvedValue(decisionWith([]) as any);
  vi.mocked(getInterviewsByApplication).mockResolvedValue([]);
  vi.mocked(loadCandidateCvText).mockResolvedValue("Esperienza in React");
});

describe("buildApplicationView", () => {
  it("returns null for a missing application", async () => {
    vi.mocked(getApplicationDetail).mockResolvedValue(null);

    await expect(buildApplicationView(actor, "nope", { includeCv: false })).resolves.toBeNull();
  });

  it("shows the read-only scores and the overall score to a non-participant", async () => {
    const view = await buildApplicationView(actor, "app-1", { includeCv: false });

    expect(view).toMatchObject({
      id: "app-1",
      candidate: { id: "cand-1", name: "Mario Rossi", doNotContact: false },
      position: { id: "pos-1", title: "Dev" },
      decision: { outcome: "offer", overallScore: 3.8, hidden: false },
      url: links.application("app-1"),
      decisionUrl: links.applicationDecision("app-1"),
    });
    expect(view!.evaluations).toEqual([
      expect.objectContaining({ kind: "resume", fitScore: 8, recommendation: "Procedere" }),
      expect.objectContaining({ kind: "assessment", quizScore: 72, fitScore: 7 }),
    ]);
  });

  it("hides the overall score from a participant who has not submitted, keeping the outcome", async () => {
    vi.mocked(getApplicationDecision).mockResolvedValue(
      decisionWith([{ participantIds: ["u1", "u2"], submittedInterviewerIds: ["u2"] }]) as any,
    );

    const view = await buildApplicationView(actor, "app-1", { includeCv: false });

    expect(view!.decision).toEqual({
      outcome: "offer",
      decidedAt: expect.any(Date),
      overallScore: null,
      hidden: true,
    });
  });

  it("shows the score again once the participant has submitted", async () => {
    vi.mocked(getApplicationDecision).mockResolvedValue(
      decisionWith([{ participantIds: ["u1"], submittedInterviewerIds: ["u1"] }]) as any,
    );

    const view = await buildApplicationView(actor, "app-1", { includeCv: false });

    expect(view!.decision).toMatchObject({ hidden: false, overallScore: 3.8 });
  });

  it("never carries scorecards, notes, email or the resume URL", async () => {
    const view = await buildApplicationView(actor, "app-1", { includeCv: false });
    const json = JSON.stringify(view);

    expect(json).not.toContain("mario@example.com");
    expect(json).not.toContain("r2.example.com");
    expect(json).not.toMatch(/scorecard|notes|kitItemNote/i);
  });

  it("omits the CV unless asked for", async () => {
    const view = await buildApplicationView(actor, "app-1", { includeCv: false });

    expect(view!.cvText).toBeNull();
    expect(view!.cvRequested).toBe(false);
    expect(loadCandidateCvText).not.toHaveBeenCalled();
  });

  it("returns the CV wrapped as untrusted data when asked for", async () => {
    const view = await buildApplicationView(actor, "app-1", { includeCv: true });

    expect(loadCandidateCvText).toHaveBeenCalledWith("cand-1");
    expect(view!.cvText).toContain("<cv>\nEsperienza in React\n</cv>");
    expect(view!.cvText).toContain("dati non attendibili");
  });

  it("flags an unreadable CV with cvText null", async () => {
    vi.mocked(loadCandidateCvText).mockResolvedValue(null);

    const view = await buildApplicationView(actor, "app-1", { includeCv: true });

    expect(view).toMatchObject({ cvRequested: true, cvText: null });
  });
});

describe("buildInterviewRows", () => {
  const agendaRow = (id: string, overrides: Record<string, unknown> = {}) => ({
    id,
    applicationId: "app-1",
    round: 1,
    status: "scheduled",
    scheduledAt: at(1),
    durationMinutes: 60,
    kitStatus: "draft",
    candidateName: "Mario Rossi",
    positionTitle: "Dev",
    ownerId: "owner-1",
    participants: [{ userId: "u2", name: "Piero", role: "lead" }],
    ...overrides,
  });

  it("lists the agenda with prepare links", async () => {
    vi.mocked(getAgendaInterviews).mockResolvedValue([agendaRow("int-1")] as any);

    const rows = await buildInterviewRows(actor, { mineOnly: false });

    expect(rows).toEqual([
      expect.objectContaining({
        id: "int-1",
        candidateName: "Mario Rossi",
        url: links.interviewPrepare("app-1", "int-1"),
      }),
    ]);
  });

  it("with mineOnly keeps interviews where the actor takes part or owns the application", async () => {
    vi.mocked(getAgendaInterviews).mockResolvedValue([
      agendaRow("participant", { participants: [{ userId: "u1", name: "Io", role: "observer" }] }),
      agendaRow("owner", { ownerId: "u1" }),
      agendaRow("other"),
    ] as any);

    const rows = await buildInterviewRows(actor, { mineOnly: true });

    expect(rows.map((row) => row.id)).toEqual(["participant", "owner"]);
  });

  it("filters by date", async () => {
    vi.mocked(getAgendaInterviews).mockResolvedValue([
      agendaRow("soon", { scheduledAt: at(1) }),
      agendaRow("later", { scheduledAt: at(10) }),
    ] as any);

    const rows = await buildInterviewRows(actor, { mineOnly: false, from: at(0), to: at(5) });

    expect(rows.map((row) => row.id)).toEqual(["soon"]);
  });

  it("for one application reads its interviews with the application names", async () => {
    vi.mocked(getInterviewsByApplication).mockResolvedValue([
      {
        id: "int-9",
        applicationId: "app-1",
        round: 2,
        status: "completed",
        scheduledAt: at(-1),
        durationMinutes: 45,
        meetingUrl: null,
        sequence: 0,
        kitStatus: "ready",
        guideTitle: "Tecnico",
        participants: [{ userId: "u2", name: "Piero", role: "lead" }],
        submittedFeedback: [],
      },
    ]);

    const rows = await buildInterviewRows(actor, { applicationId: "app-1", mineOnly: false });

    expect(getInterviewsByApplication).toHaveBeenCalledWith("app-1");
    expect(rows).toEqual([
      expect.objectContaining({
        id: "int-9",
        candidateName: "Mario Rossi",
        positionTitle: "Dev",
        status: "completed",
      }),
    ]);
  });

  it("returns nothing for a missing application", async () => {
    vi.mocked(getApplicationDetail).mockResolvedValue(null);

    await expect(
      buildInterviewRows(actor, { applicationId: "nope", mineOnly: false }),
    ).resolves.toEqual([]);
  });
});

describe("buildInterviewPrepView", () => {
  const preparation = {
    id: "int-1",
    applicationId: "app-1",
    round: 1,
    status: "scheduled",
    scheduledAt: at(1),
    durationMinutes: 60,
    meetingUrl: "https://meet.example.com/x",
    sequence: 0,
    kitStatus: "draft",
    guideTitle: "Tecnico",
    participants: [
      { userId: "u2", name: "Piero Bianchi", role: "lead" },
      { userId: "u3", name: "Sara Verdi", role: "observer" },
    ],
    submittedFeedback: [
      { id: "f1", interviewerId: "u3", interviewerName: "Sara Verdi", hireRecommendation: "yes", submittedAt: at(-1) },
    ],
    candidate: { id: "cand-1", firstName: "Mario", lastName: "Rossi" },
    position: { id: "pos-1", title: "Dev" },
    kit: {
      id: "kit-1",
      status: "draft",
      briefing: ["Punto"],
      hypotheses: [{ criterionId: "c1", hypothesis: "Ipotesi", howToVerify: "Chiedi" }],
      checklist: [{ id: "k1", category: "communicate", text: "RAL e benefit", done: false }],
      missingSources: [],
      sections: [
        { id: "s2", title: "Tecnica", minutes: 30, order: 1, kind: "technical" },
        { id: "s1", title: "Intro", minutes: 5, order: 0, kind: "intro" },
      ],
      items: [
        { id: "i2", sectionId: "s2", text: "Stato?", followUps: ["Perché?"], criterionIds: ["c1", "gone"], required: true, order: 0, origin: "cv", rationale: "Dal CV di Mario Rossi", sourceRef: "cv:1", sourceRound: null, edited: false, covered: false, anchors: { weak: "", medium: "", strong: "" } },
        { id: "i1", sectionId: "s1", text: "Presentati", followUps: [], criterionIds: [], required: false, order: 0, origin: "template", rationale: null, sourceRef: null, sourceRound: null, edited: false, covered: false, anchors: { weak: "", medium: "", strong: "" } },
      ],
    },
    criteria: [{ id: "c1", name: "React", priority: "must", order: 0, archived: false }],
  };

  it("returns null for a missing interview", async () => {
    vi.mocked(getInterviewForPreparation).mockResolvedValue(null);

    await expect(buildInterviewPrepView(actor, "nope")).resolves.toBeNull();
  });

  it("maps the kit in section order with criteria names", async () => {
    vi.mocked(getInterviewForPreparation).mockResolvedValue(preparation as any);

    const view = await buildInterviewPrepView(actor, "int-1");

    expect(view).toMatchObject({
      positionTitle: "Dev",
      round: 1,
      participantRoles: ["lead", "observer"],
      guideTitle: "Tecnico",
      briefing: ["Punto"],
      hypotheses: [{ criterion: "React", hypothesis: "Ipotesi", howToVerify: "Chiedi" }],
      checklist: [{ category: "communicate", text: "RAL e benefit", done: false }],
      url: links.interviewPrepare("app-1", "int-1"),
    });
    expect(view!.sections).toEqual([
      { title: "Intro", kind: "intro", items: [{ text: "Presentati", followUps: [], criteria: [], required: false }] },
      { title: "Tecnica", kind: "technical", items: [{ text: "Stato?", followUps: ["Perché?"], criteria: ["React"], required: true }] },
    ]);
  });

  it("carries no candidate identity, CV, interviewer names, notes or meeting link", async () => {
    vi.mocked(getInterviewForPreparation).mockResolvedValue(preparation as any);

    const json = JSON.stringify(await buildInterviewPrepView(actor, "int-1"));

    for (const forbidden of ["Mario", "Rossi", "Piero", "Sara", "meet.example.com", "rationale", "cv:1", "hireRecommendation"]) {
      expect(json).not.toContain(forbidden);
    }
  });
});
