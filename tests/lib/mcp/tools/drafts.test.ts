import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/positions", () => ({ getPositionById: vi.fn() }));
vi.mock("@/lib/data/reference-data", () => ({ getPositionFieldOptions: vi.fn() }));
vi.mock("@/lib/services/positions", () => ({
  createPosition: vi.fn(),
  publishPositionDraft: vi.fn(),
}));
vi.mock("@/lib/services/quizzes", () => ({ saveQuiz: vi.fn() }));
vi.mock("@/lib/services/interview-proposals", () => ({
  proposeInterviewSlot: vi.fn(),
  confirmInterviewProposal: vi.fn(),
}));
vi.mock("@/lib/services/interview-kit-patch", () => ({
  patchInterviewKit: vi.fn(),
  loadStoredKit: vi.fn(),
}));
vi.mock("@/lib/services/interview-kits", () => ({ setInterviewKitStatus: vi.fn() }));
vi.mock("@/lib/mcp/views", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mcp/views")>()),
  buildInterviewKitView: vi.fn(),
}));
vi.mock("@/lib/mcp/scheduling", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mcp/scheduling")>()),
  buildSchedulingOptions: vi.fn(),
}));

import { getPositionById } from "@/lib/data/positions";
import { getPositionFieldOptions } from "@/lib/data/reference-data";
import type { McpActor } from "@/lib/mcp/auth";
import { APP_URL } from "@/lib/mcp/config";
import { buildSchedulingOptions } from "@/lib/mcp/scheduling";
import { buildInterviewKitView } from "@/lib/mcp/views";
import { loadStoredKit, patchInterviewKit } from "@/lib/services/interview-kit-patch";
import { setInterviewKitStatus } from "@/lib/services/interview-kits";
import {
  createPositionDraftTool,
  draftTools,
  openPositionFormTool,
  getInterviewKitTool,
  getSchedulingOptionsTool,
  saveInterviewKitDraftTool,
  proposeInterviewSlotTool,
  publishDraftTool,
  saveQuizDraftTool,
  saveQuizTool,
  writeTools,
} from "@/lib/mcp/tools/drafts";
import {
  confirmInterviewProposal,
  proposeInterviewSlot,
} from "@/lib/services/interview-proposals";
import { createPosition, publishPositionDraft } from "@/lib/services/positions";
import { saveQuiz } from "@/lib/services/quizzes";

const actor: McpActor = {
  userId: "u1",
  role: "user",
  clientId: "client-1",
  scopes: new Set(["recruit:read", "recruit:draft", "recruit:write"]),
} as unknown as McpActor;

const position = {
  title: "Frontend",
  description: "",
  experienceLevel: "Senior",
  skills: ["React"],
  softSkills: [],
  contractType: "",
};

const quiz = {
  positionId: "pos-1",
  title: "Quiz React",
  timeLimit: 30,
  questions: [
    {
      id: "q1",
      type: "open_question" as const,
      question: "Spiega gli hook di React",
      keywords: [],
      sampleAnswer: "",
    },
  ],
} as any;

const options = {
  application: {
    id: "app-1",
    candidateName: "Ada Lovelace",
    positionId: "pos-1",
    positionTitle: "Frontend",
    stage: "screening",
  },
  nextRound: 2,
  guides: [{ id: "guide-1", title: "Tecnico", round: 1, durationMinutes: 60 }],
  teamMembers: [
    { id: "u1", name: "Paola" },
    { id: "u2", name: "Marco" },
  ],
  pendingProposals: [],
};

const slot = {
  applicationId: "app-1",
  guideId: "guide-1",
  round: 2,
  scheduledAt: "2026-11-25T10:00:00+01:00",
  durationMinutes: 45,
  participants: [
    { userId: "u1", role: "lead" as const },
    { userId: "u2", role: "observer" as const },
  ],
};

beforeEach(() => {
  vi.mocked(createPosition).mockResolvedValue({ positionId: "pos-1" });
  vi.mocked(getPositionById).mockResolvedValue({
    id: "pos-1",
    status: "open",
    ...position,
    description: null,
    contractType: null,
  } as any);
  vi.mocked(buildSchedulingOptions).mockResolvedValue(options as any);
});

describe("draft and write tools", () => {
  it("draft tools need recruit:draft (scheduling options only read), the write tool recruit:write", () => {
    expect(draftTools.map((tool) => [tool.name, tool.scope])).toEqual([
      ["open_position_form", "recruit:draft"],
      ["create_position_draft", "recruit:draft"],
      ["save_quiz_draft", "recruit:draft"],
      ["save_quiz", "recruit:draft"],
      ["get_scheduling_options", "recruit:read"],
      ["propose_interview_slot", "recruit:draft"],
      ["get_interview_kit", "recruit:read"],
      ["save_interview_kit_draft", "recruit:draft"],
    ]);
    expect(writeTools.map((tool) => [tool.name, tool.scope, tool.group])).toEqual([
      ["publish_draft", "recruit:write", "write"],
    ]);
  });

  it("keeps the confirmations app-only: the model cannot save a quiz or publish", () => {
    const appOnly = [...draftTools, ...writeTools]
      .filter((tool) => tool.appOnly)
      .map((tool) => tool.name);
    expect(appOnly).toEqual(["save_quiz", "publish_draft"]);
  });
});

describe("create_position_draft", () => {
  it("creates the draft and offers the publish confirmation", async () => {
    const result = await createPositionDraftTool.handler(actor, position);

    expect(createPosition).toHaveBeenCalledWith(actor, position);
    expect(result.invalidate).toEqual([{ kind: "position", positionId: "pos-1" }]);
    expect(result.text).toContain(`${APP_URL}/dashboard/positions/pos-1`);
    expect(result.structured?.widget).toMatchObject({
      kind: "draft-preview",
      draft: "position",
      confirm: { tool: "publish_draft", arguments: { kind: "position", id: "pos-1" } },
    });
  });
});

describe("open_position_form", () => {
  it("opens the prefilled form and creates nothing", async () => {
    vi.mocked(getPositionFieldOptions).mockResolvedValue({
      allSkills: [{ label: "React", value: "React", category: "Framework" }],
      allSoftSkills: [],
      experienceLevels: ["Senior"],
      contractTypes: [],
    });

    const result = await openPositionFormTool.handler(actor, {
      title: " Frontend ",
      skills: ["React", "Remix"],
    });

    expect(createPosition).not.toHaveBeenCalled();
    expect(result.invalidate).toBeUndefined();
    expect(result.text).toContain(`${APP_URL}/dashboard/positions/new`);
    expect(result.structured?.widget).toMatchObject({
      kind: "position-form",
      prefill: { title: "Frontend", skills: ["React", "Remix"], experienceLevel: "" },
      tools: { save: "create_position_draft", publish: "publish_draft" },
    });
    expect(result.auditSummary).toBe("position_form prefilled=2");
  });
});

describe("quiz tools", () => {
  it("save_quiz_draft writes nothing and hands the payload to the save button", async () => {
    const result = await saveQuizDraftTool.handler(actor, quiz);

    expect(saveQuiz).not.toHaveBeenCalled();
    expect(saveQuizDraftTool.readOnly).toBe(true);
    expect(result.invalidate).toBeUndefined();
    expect(result.structured?.widget).toMatchObject({
      draft: "quiz",
      status: { label: "Non salvato" },
      confirm: { tool: "save_quiz", arguments: quiz },
    });
  });

  it("save_quiz saves through the editor path and invalidates the quiz", async () => {
    vi.mocked(saveQuiz).mockResolvedValue({ quizId: "quiz-1", positionId: "pos-1", created: true });

    const result = await saveQuizTool.handler(actor, quiz);

    expect(saveQuiz).toHaveBeenCalledWith(actor, quiz);
    expect(result.invalidate).toEqual([{ kind: "quiz", quizId: "quiz-1", positionId: "pos-1" }]);
    expect(result.structured?.widget).toMatchObject({
      status: { label: "Salvato" },
      confirm: null,
      url: `${APP_URL}/dashboard/quizzes/quiz-1`,
    });
  });

  it("refuses a quiz for a missing position", async () => {
    vi.mocked(getPositionById).mockResolvedValueOnce(null);
    await expect(saveQuizDraftTool.handler(actor, quiz)).rejects.toThrow("Posizione non trovata");
  });
});

describe("scheduling tools", () => {
  it("get_scheduling_options lists guides and team with ids, no email", async () => {
    const result = await getSchedulingOptionsTool.handler(actor, { applicationId: "app-1" });

    expect(result.text).toContain("guideId guide-1");
    expect(result.text).toContain("Paola · userId u1");
    expect(result.text).toContain("Prossimo round: 2");
    expect(JSON.stringify(result.structured)).not.toContain("@");
  });

  it("propose_interview_slot stores a proposal and offers the scheduling confirmation", async () => {
    vi.mocked(proposeInterviewSlot).mockResolvedValue({ proposalId: "prop-1", applicationId: "app-1" });

    const result = await proposeInterviewSlotTool.handler(actor, slot);

    expect(proposeInterviewSlot).toHaveBeenCalledWith(actor, slot);
    expect(result.invalidate).toEqual([{ kind: "interview_proposal", applicationId: "app-1" }]);
    expect(result.text).toContain("non pianificata");
    expect(result.structured?.widget).toMatchObject({
      draft: "proposal",
      confirm: { tool: "publish_draft", arguments: { kind: "proposal", id: "prop-1" } },
      sections: [{ title: "Partecipanti", items: ["Paola · Conduttore", "Marco · Osservatore"] }],
    });
  });
});

describe("publish_draft", () => {
  it("opens a position draft and returns its confirmed widget", async () => {
    vi.mocked(publishPositionDraft).mockResolvedValue({ positionId: "pos-1" });

    const result = await publishDraftTool.handler(actor, { kind: "position", id: "pos-1" });

    expect(publishPositionDraft).toHaveBeenCalledWith(actor, "pos-1");
    expect(result.invalidate).toEqual([{ kind: "position", positionId: "pos-1" }]);
    expect(result.structured?.widget).toMatchObject({ status: { label: "Aperta" }, confirm: null });
  });

  it("schedules a proposal and refreshes interview, proposals and the moved stage", async () => {
    vi.mocked(confirmInterviewProposal).mockResolvedValue({
      interviewId: "int-1",
      applicationId: "app-1",
      stage: {
        changed: true,
        candidateId: "c1",
        positionId: "pos-1",
        applicationId: "app-1",
      } as any,
    });

    const result = await publishDraftTool.handler(actor, { kind: "proposal", id: "prop-1" });

    expect(confirmInterviewProposal).toHaveBeenCalledWith(actor, "prop-1");
    expect(result.invalidate).toEqual([
      { kind: "interview", interviewId: "int-1", applicationId: "app-1" },
      { kind: "interview_proposal", applicationId: "app-1" },
      { kind: "candidate", candidateId: "c1", positionId: "pos-1", applicationId: "app-1" },
    ]);
    expect(result.text).toContain("Nessuna email");
  });
});

describe("kit tools", () => {
  const view = {
    interviewId: "int-1",
    applicationId: "app-1",
    positionTitle: "Frontend",
    round: 1,
    scheduledAt: new Date("2026-11-25T09:00:00Z"),
    status: "scheduled",
    kitStatus: "draft",
    editable: true,
    sections: [
      {
        id: "s1",
        title: "Tecnica",
        kind: "technical",
        minutes: 20,
        items: [
          {
            id: "i1",
            text: "Spiega il rendering di React",
            followUps: ["E con i Server Components?"],
            criterionIds: ["k1"],
            required: true,
            origin: "template",
          },
        ],
      },
    ],
    criteria: [{ id: "k1", name: "React", priority: "must" }],
    briefing: [],
    hypotheses: [],
    checklist: [{ id: "c1", category: "logistics", text: "Link della call", done: false }],
    url: `${APP_URL}/dashboard/applications/app-1/interviews/int-1/prepare`,
  } as any;

  beforeEach(() => {
    vi.mocked(buildInterviewKitView).mockResolvedValue(view);
  });

  it("get_interview_kit lists the ids the patch needs, without candidate identity", async () => {
    const result = await getInterviewKitTool.handler(actor, { interviewId: "int-1" });

    expect(result.text).toContain("sectionId s1");
    expect(result.text).toContain("id i1");
    expect(result.text).toContain("React · criterionId k1");
    expect(result.text).toContain("id c1");
    expect(result.text).not.toContain("Ada");
  });

  it("save_interview_kit_draft saves the patch and shows the kit read fresh", async () => {
    vi.mocked(patchInterviewKit).mockResolvedValue({
      kitId: "kit-1",
      interviewId: "int-1",
      applicationId: "app-1",
    });
    const stored = { briefing: [], hypotheses: [], checklist: [], missingSources: [], sections: [], items: [] };
    vi.mocked(loadStoredKit).mockResolvedValue(stored as any);
    const patch = {
      interviewId: "int-1",
      addItems: [{ sectionId: "s1", text: "Come gestisci lo stato globale?" }],
      removeItemIds: ["i9"],
    };

    const result = await saveInterviewKitDraftTool.handler(actor, patch);

    expect(patchInterviewKit).toHaveBeenCalledWith(actor, patch);
    expect(buildInterviewKitView).toHaveBeenCalledWith(actor, "int-1", stored);
    expect(result.invalidate).toEqual([{ kind: "interview", interviewId: "int-1", applicationId: "app-1" }]);
    expect(result.structured?.widget).toMatchObject({
      draft: "kit",
      status: { label: "Bozza" },
      confirm: { tool: "publish_draft", arguments: { kind: "kit", id: "int-1" } },
      facts: expect.arrayContaining([
        { label: "Modifiche salvate", value: "1 domanda nuova, 1 rimossa" },
      ]),
    });
    const sections = (result.structured?.widget as any).sections;
    expect(sections[0].items[0]).toBe(
      "★ Spiega il rendering di React\n  ↳ E con i Server Components?\n  criteri: React",
    );
  });

  it("publish_draft marks a kit ready", async () => {
    vi.mocked(setInterviewKitStatus).mockResolvedValue({
      status: "ready",
      interviewId: "int-1",
      applicationId: "app-1",
    });

    const result = await publishDraftTool.handler(actor, { kind: "kit", id: "int-1" });

    expect(setInterviewKitStatus).toHaveBeenCalledWith(actor, { interviewId: "int-1", status: "ready" });
    expect(result.invalidate).toEqual([{ kind: "interview", interviewId: "int-1", applicationId: "app-1" }]);
    expect(result.text).toContain("pronto");
  });
});
