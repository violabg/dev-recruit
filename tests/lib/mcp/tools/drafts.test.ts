import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/positions", () => ({ getPositionById: vi.fn() }));
vi.mock("@/lib/services/positions", () => ({
  createPosition: vi.fn(),
  publishPositionDraft: vi.fn(),
}));
vi.mock("@/lib/services/quizzes", () => ({ saveQuiz: vi.fn() }));
vi.mock("@/lib/services/interview-proposals", () => ({
  proposeInterviewSlot: vi.fn(),
  confirmInterviewProposal: vi.fn(),
}));
vi.mock("@/lib/mcp/scheduling", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mcp/scheduling")>()),
  buildSchedulingOptions: vi.fn(),
}));

import { getPositionById } from "@/lib/data/positions";
import type { McpActor } from "@/lib/mcp/auth";
import { APP_URL } from "@/lib/mcp/config";
import { buildSchedulingOptions } from "@/lib/mcp/scheduling";
import {
  createPositionDraftTool,
  draftTools,
  getSchedulingOptionsTool,
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
      ["create_position_draft", "recruit:draft"],
      ["save_quiz_draft", "recruit:draft"],
      ["save_quiz", "recruit:draft"],
      ["get_scheduling_options", "recruit:read"],
      ["propose_interview_slot", "recruit:draft"],
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
