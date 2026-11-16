import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    assessment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    quiz: { findUnique: vi.fn(), findMany: vi.fn() },
    candidate: { findUnique: vi.fn(), findMany: vi.fn() },
    application: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidateAssessmentCache: vi.fn(),
  invalidateCandidateCache: vi.fn(),
}));

// Stage rules have their own tests: here the stage never changes
vi.mock("@/lib/services/applications", () => ({
  advanceApplicationStage: vi.fn(async (_client, applicationId: string) => ({
    applicationId,
    candidateId: "c1",
    positionId: "pos1",
    previousStage: "assessment",
    stage: "assessment",
    changed: false,
    cancelledAssessmentIds: [],
  })),
}));

vi.mock("@/lib/utils/token", () => ({
  generateAssessmentToken: vi.fn(async () => "new-token"),
}));

import {
  assignCandidatesToQuizAction,
  assignQuizzesToCandidateAction,
  closeExpiredAssessmentAction,
  completeAssessmentAction,
  deleteAssessmentAction,
  startAssessmentAction,
  submitAnswerAction,
} from "@/lib/actions/assessments";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { unwrap } from "@/lib/utils/action-result";
import { advanceApplicationStage } from "@/lib/services/applications";
import {
  invalidateAssessmentCache,
  invalidateCandidateCache,
} from "@/lib/utils/cache-utils";

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60 * 1000);

const stored = (overrides: Record<string, unknown> = {}) => ({
  id: "ass1",
  quizId: "quiz-1",
  status: "in_progress",
  startedAt: minutesAgo(5),
  answers: { q1: "a" },
  quiz: { timeLimit: 30 },
  ...overrides,
});

const findUnique = () => vi.mocked(prisma.assessment.findUnique);
const update = () => vi.mocked(prisma.assessment.update);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ id: "user1" } as any);
  vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
    quizQuestions: [{ questionId: "q1" }, { questionId: "q2" }],
  } as any);
});

describe("startAssessmentAction", () => {
  it("starts a pending assessment", async () => {
    findUnique().mockResolvedValueOnce(
      stored({ status: "pending", startedAt: null }) as any,
    );

    const result = unwrap(await startAssessmentAction("tok"));

    expect(result.success).toBe(true);
    expect(update()).toHaveBeenCalledWith({
      where: { id: "ass1" },
      data: { status: "in_progress", startedAt: expect.any(Date) },
    });
  });

  it("returns the original start time when already started", async () => {
    const startedAt = minutesAgo(10);
    findUnique().mockResolvedValueOnce(stored({ startedAt }) as any);

    const result = unwrap(await startAssessmentAction("tok"));

    expect(result.startedAt).toBe(startedAt.toISOString());
    expect(update()).not.toHaveBeenCalled();
  });

  it("throws when the token is unknown", async () => {
    findUnique().mockResolvedValueOnce(null);

    expect(await startAssessmentAction("nope")).toMatchObject({ success: false, error: expect.stringContaining("Test non trovato") });
  });
});

describe("submitAnswerAction", () => {
  it("stores the answer alongside the previous ones", async () => {
    findUnique().mockResolvedValueOnce(stored() as any);

    await submitAnswerAction("tok", "q2", "b");

    expect(update()).toHaveBeenCalledWith({
      where: { id: "ass1" },
      data: { answers: { q1: "a", q2: "b" } },
    });
  });

  it("accepts a last answer just after the time limit", async () => {
    findUnique().mockResolvedValueOnce(
      stored({ startedAt: minutesAgo(30.5) }) as any,
    );

    await expect(submitAnswerAction("tok", "q2", "b")).resolves.toEqual({
      success: true,
    });
  });

  it("closes the assessment as completed once time has run out", async () => {
    findUnique().mockResolvedValueOnce(
      stored({ startedAt: minutesAgo(45) }) as any,
    );

    expect(await submitAnswerAction("tok", "q2", "b")).toMatchObject({ success: false, error: expect.stringContaining("Il tempo a disposizione è scaduto") });
    expect(update()).toHaveBeenCalledTimes(1);
    expect(update()).toHaveBeenCalledWith({
      where: { id: "ass1" },
      data: { status: "completed", completedAt: expect.any(Date) },
    });
  });

  it.each(["completed", "cancelled"])(
    "refuses answers for a %s assessment",
    async (status) => {
      findUnique().mockResolvedValueOnce(stored({ status }) as any);

      expect(await submitAnswerAction("tok", "q2", "b")).toMatchObject({ success: false, error: expect.stringContaining("già concluso") });
      expect(update()).not.toHaveBeenCalled();
    },
  );

  it("refuses a question that does not belong to the assessment's quiz", async () => {
    findUnique().mockResolvedValueOnce(stored() as any);

    expect(await submitAnswerAction("tok", "q9", "b")).toMatchObject({
      success: false,
      error: "Domanda non valida per questo test",
    });
    expect(update()).not.toHaveBeenCalled();
  });

  it("refuses an invalid answer before reading the assessment", async () => {
    for (const answer of [null, true, "", { code: "" }]) {
      expect(await submitAnswerAction("token", "q2", answer)).toMatchObject({
        success: false,
      });
    }

    expect(prisma.assessment.findUnique).not.toHaveBeenCalled();
    expect(prisma.assessment.update).not.toHaveBeenCalled();
  });

  it("has no time limit when the quiz has none", async () => {
    findUnique().mockResolvedValueOnce(
      stored({ startedAt: minutesAgo(600), quiz: { timeLimit: null } }) as any,
    );

    await expect(submitAnswerAction("tok", "q2", "b")).resolves.toEqual({
      success: true,
    });
  });
});

describe("completeAssessmentAction", () => {
  it("completes an in-progress assessment", async () => {
    findUnique().mockResolvedValueOnce(stored() as any);

    await completeAssessmentAction("tok");

    expect(update()).toHaveBeenCalledWith({
      where: { id: "ass1" },
      data: { status: "completed", completedAt: expect.any(Date) },
    });
  });

  it.each(["completed", "cancelled"])(
    "leaves a %s assessment untouched",
    async (status) => {
      findUnique().mockResolvedValueOnce(stored({ status }) as any);

      await expect(completeAssessmentAction("tok")).resolves.toEqual({
        success: true,
      });
      expect(update()).not.toHaveBeenCalled();
    },
  );
});

describe("closeExpiredAssessmentAction", () => {
  it("requires a signed-in user", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    expect(await closeExpiredAssessmentAction("ass1")).toMatchObject({ success: false, error: expect.stringContaining("Sessione scaduta") });
    expect(findUnique()).not.toHaveBeenCalled();
  });

  it("completes an assessment that is past its time limit", async () => {
    findUnique().mockResolvedValueOnce(
      stored({ startedAt: minutesAgo(45) }) as any,
    );

    await expect(closeExpiredAssessmentAction("ass1")).resolves.toEqual({
      success: true,
      closed: true,
    });
    expect(update()).toHaveBeenCalledWith({
      where: { id: "ass1" },
      data: { status: "completed", completedAt: expect.any(Date) },
    });
  });

  it("does nothing while there is still time", async () => {
    findUnique().mockResolvedValueOnce(stored() as any);

    await expect(closeExpiredAssessmentAction("ass1")).resolves.toEqual({
      success: true,
      closed: false,
    });
    expect(update()).not.toHaveBeenCalled();
  });
});

describe("deleteAssessmentAction", () => {
  it("requires a signed-in user", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    expect(await deleteAssessmentAction("ass1")).toMatchObject({ success: false, error: expect.stringContaining("Sessione scaduta") });
    expect(prisma.assessment.delete).not.toHaveBeenCalled();
  });

  it("deletes the assessment and expires its caches", async () => {
    findUnique().mockResolvedValueOnce({ quizId: "quiz1" } as any);

    await expect(deleteAssessmentAction("ass1")).resolves.toEqual({ success: true });
    expect(prisma.assessment.delete).toHaveBeenCalledWith({
      where: { id: "ass1" },
    });
    expect(invalidateAssessmentCache).toHaveBeenCalledWith({
      assessmentId: "ass1",
      quizId: "quiz1",
      deleted: true,
    });
  });

  it("throws when the assessment does not exist", async () => {
    findUnique().mockResolvedValueOnce(null);

    expect(await deleteAssessmentAction("nope")).toMatchObject({ success: false, error: expect.stringContaining("Test non trovato") });
  });
});

describe("assignCandidatesToQuizAction", () => {
  // Applications of the candidates for the quiz position
  const applications = [
    {
      id: "app1",
      candidateId: "c1",
      candidate: { firstName: "Mario", lastName: "Rossi", email: "m@x.it" },
    },
    {
      id: "app2",
      candidateId: "c2",
      candidate: { firstName: "Anna", lastName: "Bianchi", email: "a@x.it" },
    },
  ];

  beforeEach(() => {
    vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
      id: "quiz1",
      positionId: "pos1",
    } as any);
    vi.mocked(prisma.application.findMany).mockResolvedValue(
      applications as any,
    );
    vi.mocked(prisma.assessment.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.assessment.create).mockResolvedValue({
      token: "new-token",
    } as any);
  });

  it("creates one pending assessment per candidate", async () => {
    const result = unwrap(await assignCandidatesToQuizAction({
      quizId: "quiz1",
      candidateIds: ["c1", "c2"],
    }));

    expect(result.skipped).toEqual([]);
    expect(result.created).toEqual([
      {
        candidateId: "c1",
        token: "new-token",
        candidateName: "Mario Rossi",
        candidateEmail: "m@x.it",
      },
      {
        candidateId: "c2",
        token: "new-token",
        candidateName: "Anna Bianchi",
        candidateEmail: "a@x.it",
      },
    ]);
    expect(prisma.assessment.create).toHaveBeenCalledTimes(2);
  });

  it("only accepts candidates linked to the quiz position", async () => {
    await assignCandidatesToQuizAction({ quizId: "quiz1", candidateIds: ["c1", "c2"] });

    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          positionId: "pos1",
          candidateId: { in: ["c1", "c2"] },
          stage: { notIn: ["rejected", "withdrawn"] },
        },
      }),
    );
  });

  it("rejects the request when a candidate is not valid for the position", async () => {
    vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
      applications[0],
    ] as any);

    expect(await assignCandidatesToQuizAction({ quizId: "quiz1", candidateIds: ["c1", "c2"] }),).toMatchObject({ success: false, error: expect.stringContaining("non sono validi") });
    expect(prisma.assessment.create).not.toHaveBeenCalled();
  });

  it("skips a candidate who already has an assessment for the quiz", async () => {
    vi.mocked(prisma.assessment.findFirst)
      .mockResolvedValueOnce({ id: "existing" } as any)
      .mockResolvedValueOnce(null);

    const result = unwrap(await assignCandidatesToQuizAction({
      quizId: "quiz1",
      candidateIds: ["c1", "c2"],
    }));

    expect(result.created.map((c) => c.candidateId)).toEqual(["c2"]);
    expect(result.skipped).toEqual(["Esiste già un test per Mario Rossi."]);
  });

  it("requires at least one candidate", async () => {
    expect(await assignCandidatesToQuizAction({ quizId: "quiz1", candidateIds: [] }),).toMatchObject({ success: false });
  });

  it("throws when the quiz does not exist", async () => {
    vi.mocked(prisma.quiz.findUnique).mockResolvedValueOnce(null);

    expect(await assignCandidatesToQuizAction({ quizId: "nope", candidateIds: ["c1"] }),).toMatchObject({ success: false, error: expect.stringContaining("Quiz non trovato") });
  });
});

describe("assignQuizzesToCandidateAction", () => {
  beforeEach(() => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({
      id: "c1",
      applications: [{ id: "app1", candidateId: "c1", positionId: "pos1" }],
    } as any);
    vi.mocked(prisma.quiz.findMany).mockResolvedValue([
      { id: "quiz1", title: "Quiz A", positionId: "pos1" },
      { id: "quiz2", title: "Quiz B", positionId: "pos1" },
    ] as any);
    vi.mocked(prisma.assessment.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.assessment.create).mockResolvedValue({
      token: "new-token",
    } as any);
  });

  it("creates one pending assessment per quiz", async () => {
    const result = unwrap(await assignQuizzesToCandidateAction({
      candidateId: "c1",
      quizIds: ["quiz1", "quiz2"],
    }));

    expect(result).toEqual({
      success: true,
      created: [
        { quizId: "quiz1", token: "new-token", quizTitle: "Quiz A" },
        { quizId: "quiz2", token: "new-token", quizTitle: "Quiz B" },
      ],
      skipped: [],
    });
  });

  it("only accepts quizzes of the candidate's positions", async () => {
    vi.mocked(prisma.quiz.findMany).mockResolvedValueOnce([
      { id: "quiz1", title: "Quiz A" },
    ] as any);

    expect(await assignQuizzesToCandidateAction({
        candidateId: "c1",
        quizIds: ["quiz1", "quiz2"],
      }),).toMatchObject({ success: false, error: expect.stringContaining("non sono validi") });
    expect(prisma.quiz.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["quiz1", "quiz2"] }, positionId: { in: ["pos1"] } },
      }),
    );
  });

  it("skips a quiz the candidate already has an assessment for", async () => {
    vi.mocked(prisma.assessment.findFirst)
      .mockResolvedValueOnce({ id: "existing" } as any)
      .mockResolvedValueOnce(null);

    const result = unwrap(await assignQuizzesToCandidateAction({
      candidateId: "c1",
      quizIds: ["quiz1", "quiz2"],
    }));

    expect(result.created.map((c) => c.quizId)).toEqual(["quiz2"]);
    expect(result.skipped).toEqual(["Esiste già un test per Quiz A."]);
  });

  it("throws when the candidate does not exist", async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValueOnce(null);

    expect(await assignQuizzesToCandidateAction({ candidateId: "nope", quizIds: ["quiz1"] }),).toMatchObject({ success: false, error: expect.stringContaining("Candidato non trovato") });
  });

  it("reads only applications that are neither rejected nor withdrawn", async () => {
    await assignQuizzesToCandidateAction({ candidateId: "c1", quizIds: ["quiz1"] });

    expect(prisma.candidate.findUnique).toHaveBeenCalledWith({
      where: { id: "c1" },
      select: {
        id: true,
        applications: {
          where: { stage: { notIn: ["rejected", "withdrawn"] } },
          select: { id: true, candidateId: true, positionId: true },
        },
      },
    });
  });

  it("refuses a quiz of a position without an open application", async () => {
    // The only application is closed, so none is returned
    vi.mocked(prisma.candidate.findUnique).mockResolvedValueOnce({
      id: "c1",
      applications: [],
    } as any);
    vi.mocked(prisma.quiz.findMany).mockResolvedValueOnce([]);

    expect(
      await assignQuizzesToCandidateAction({ candidateId: "c1", quizIds: ["quiz1"] }),
    ).toEqual({
      success: false,
      error: "Alcuni quiz non sono validi per le posizioni di questo candidato",
    });
    expect(prisma.assessment.create).not.toHaveBeenCalled();
  });

  it("creates the test on the application of the quiz position", async () => {
    vi.mocked(prisma.quiz.findMany).mockResolvedValueOnce([
      { id: "quiz1", title: "Quiz A", positionId: "pos1" },
    ] as any);

    await assignQuizzesToCandidateAction({ candidateId: "c1", quizIds: ["quiz1"] });

    expect(prisma.assessment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        applicationId: "app1",
        candidateId: "c1",
        quizId: "quiz1",
        status: "pending",
      }),
      select: { token: true },
    });
    expect(advanceApplicationStage).toHaveBeenCalledWith(
      prisma,
      "app1",
      "assessment_sent",
    );
  });
});

describe("assessments on applications", () => {
  beforeEach(() => {
    vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
      id: "quiz1",
      positionId: "pos1",
    } as any);
    vi.mocked(prisma.application.findMany).mockResolvedValue([
      {
        id: "app1",
        candidateId: "c1",
        candidate: { firstName: "Mario", lastName: "Rossi", email: "m@x.it" },
      },
    ] as any);
    vi.mocked(prisma.assessment.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.assessment.create).mockResolvedValue({
      token: "new-token",
    } as any);
  });

  it("creates the test with the application id", async () => {
    await assignCandidatesToQuizAction({ quizId: "quiz1", candidateIds: ["c1"] });

    expect(prisma.assessment.create).toHaveBeenCalledWith({
      data: {
        applicationId: "app1",
        candidateId: "c1",
        quizId: "quiz1",
        status: "pending",
        token: "new-token",
        answers: {},
      },
      select: { token: true },
    });
  });

  it("advances the stage and refreshes the candidate when it changed", async () => {
    vi.mocked(advanceApplicationStage).mockResolvedValueOnce({
      applicationId: "app1",
      candidateId: "c1",
      positionId: "pos1",
      previousStage: "screening",
      stage: "assessment",
      changed: true,
      cancelledAssessmentIds: [],
    });

    await assignCandidatesToQuizAction({ quizId: "quiz1", candidateIds: ["c1"] });

    expect(advanceApplicationStage).toHaveBeenCalledWith(
      prisma,
      "app1",
      "assessment_sent",
    );
    expect(invalidateCandidateCache).toHaveBeenCalledWith({
      candidateId: "c1",
      positionId: "pos1",
      applicationId: "app1",
    });
    expect(invalidateAssessmentCache).toHaveBeenCalledWith({ quizId: "quiz1" });
  });

  it("does not refresh the candidate when the stage did not change", async () => {
    await assignCandidatesToQuizAction({ quizId: "quiz1", candidateIds: ["c1"] });

    expect(invalidateCandidateCache).not.toHaveBeenCalled();
  });

  it("refuses a candidate without an application for the quiz position", async () => {
    vi.mocked(prisma.application.findMany).mockResolvedValueOnce([]);

    expect(
      await assignCandidatesToQuizAction({ quizId: "quiz1", candidateIds: ["c9"] }),
    ).toEqual({
      success: false,
      error: "Alcuni candidati non sono validi per la posizione di questo quiz",
    });
    expect(prisma.assessment.create).not.toHaveBeenCalled();
  });

  it("refuses a rejected or withdrawn application with the same error", async () => {
    // The stage filter leaves the closed application out
    vi.mocked(prisma.application.findMany).mockResolvedValueOnce([]);

    expect(
      await assignCandidatesToQuizAction({ quizId: "quiz1", candidateIds: ["c1"] }),
    ).toEqual({
      success: false,
      error: "Alcuni candidati non sono validi per la posizione di questo quiz",
    });
    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          stage: { notIn: ["rejected", "withdrawn"] },
        }),
      }),
    );
  });

  it("skips an existing pair without advancing the stage", async () => {
    vi.mocked(prisma.assessment.findFirst).mockResolvedValueOnce({
      id: "existing",
    } as any);

    const result = unwrap(
      await assignCandidatesToQuizAction({ quizId: "quiz1", candidateIds: ["c1"] }),
    );

    expect(result.skipped).toEqual(["Esiste già un test per Mario Rossi."]);
    expect(advanceApplicationStage).not.toHaveBeenCalled();
  });
});

describe("public token actions", () => {
  it("never ask for a signed-in user", async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(
      stored({ status: "pending", startedAt: null }) as any,
    );

    await startAssessmentAction("tok");
    await submitAnswerAction("tok", "q1", "a");
    await completeAssessmentAction("tok");

    expect(requireUser).not.toHaveBeenCalled();
  });
});
