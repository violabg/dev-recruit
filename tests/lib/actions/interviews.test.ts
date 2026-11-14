import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    interview: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    quiz: { findUnique: vi.fn(), findMany: vi.fn() },
    candidate: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidateInterviewCache: vi.fn(),
}));

vi.mock("@/lib/utils/token", () => ({
  generateInterviewToken: vi.fn(async () => "new-token"),
}));

import {
  assignCandidatesToQuiz,
  assignQuizzesToCandidate,
  closeExpiredInterviewAction,
  completeInterview,
  deleteInterview,
  startInterview,
  submitAnswer,
} from "@/lib/actions/interviews";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { unwrap } from "@/lib/utils/action-result";
import { invalidateInterviewCache } from "@/lib/utils/cache-utils";

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60 * 1000);

const stored = (overrides: Record<string, unknown> = {}) => ({
  id: "int1",
  status: "in_progress",
  startedAt: minutesAgo(5),
  answers: { q1: "a" },
  quiz: { timeLimit: 30 },
  ...overrides,
});

const findUnique = () => vi.mocked(prisma.interview.findUnique);
const update = () => vi.mocked(prisma.interview.update);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ id: "user1" } as any);
});

describe("startInterview", () => {
  it("starts a pending interview", async () => {
    findUnique().mockResolvedValueOnce(
      stored({ status: "pending", startedAt: null }) as any,
    );

    const result = unwrap(await startInterview("tok"));

    expect(result.success).toBe(true);
    expect(update()).toHaveBeenCalledWith({
      where: { id: "int1" },
      data: { status: "in_progress", startedAt: expect.any(Date) },
    });
  });

  it("returns the original start time when already started", async () => {
    const startedAt = minutesAgo(10);
    findUnique().mockResolvedValueOnce(stored({ startedAt }) as any);

    const result = unwrap(await startInterview("tok"));

    expect(result.startedAt).toBe(startedAt.toISOString());
    expect(update()).not.toHaveBeenCalled();
  });

  it("throws when the token is unknown", async () => {
    findUnique().mockResolvedValueOnce(null);

    expect(await startInterview("nope")).toMatchObject({ success: false, error: expect.stringContaining("Colloquio non trovato") });
  });
});

describe("submitAnswer", () => {
  it("stores the answer alongside the previous ones", async () => {
    findUnique().mockResolvedValueOnce(stored() as any);

    await submitAnswer("tok", "q2", "b");

    expect(update()).toHaveBeenCalledWith({
      where: { id: "int1" },
      data: { answers: { q1: "a", q2: "b" } },
    });
  });

  it("accepts a last answer just after the time limit", async () => {
    findUnique().mockResolvedValueOnce(
      stored({ startedAt: minutesAgo(30.5) }) as any,
    );

    await expect(submitAnswer("tok", "q2", "b")).resolves.toEqual({
      success: true,
    });
  });

  it("closes the interview as completed once time has run out", async () => {
    findUnique().mockResolvedValueOnce(
      stored({ startedAt: minutesAgo(45) }) as any,
    );

    expect(await submitAnswer("tok", "q2", "b")).toMatchObject({ success: false, error: expect.stringContaining("Il tempo a disposizione è scaduto") });
    expect(update()).toHaveBeenCalledTimes(1);
    expect(update()).toHaveBeenCalledWith({
      where: { id: "int1" },
      data: { status: "completed", completedAt: expect.any(Date) },
    });
  });

  it.each(["completed", "cancelled"])(
    "refuses answers for a %s interview",
    async (status) => {
      findUnique().mockResolvedValueOnce(stored({ status }) as any);

      expect(await submitAnswer("tok", "q2", "b")).toMatchObject({ success: false, error: expect.stringContaining("già concluso") });
      expect(update()).not.toHaveBeenCalled();
    },
  );

  it("has no time limit when the quiz has none", async () => {
    findUnique().mockResolvedValueOnce(
      stored({ startedAt: minutesAgo(600), quiz: { timeLimit: null } }) as any,
    );

    await expect(submitAnswer("tok", "q2", "b")).resolves.toEqual({
      success: true,
    });
  });
});

describe("completeInterview", () => {
  it("completes an in-progress interview", async () => {
    findUnique().mockResolvedValueOnce(stored() as any);

    await completeInterview("tok");

    expect(update()).toHaveBeenCalledWith({
      where: { id: "int1" },
      data: { status: "completed", completedAt: expect.any(Date) },
    });
  });

  it.each(["completed", "cancelled"])(
    "leaves a %s interview untouched",
    async (status) => {
      findUnique().mockResolvedValueOnce(stored({ status }) as any);

      await expect(completeInterview("tok")).resolves.toEqual({
        success: true,
      });
      expect(update()).not.toHaveBeenCalled();
    },
  );
});

describe("closeExpiredInterviewAction", () => {
  it("requires a signed-in user", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    expect(await closeExpiredInterviewAction("int1")).toMatchObject({ success: false, error: expect.stringContaining("Sessione scaduta") });
    expect(findUnique()).not.toHaveBeenCalled();
  });

  it("completes an interview that is past its time limit", async () => {
    findUnique().mockResolvedValueOnce(
      stored({ startedAt: minutesAgo(45) }) as any,
    );

    await expect(closeExpiredInterviewAction("int1")).resolves.toEqual({
      success: true,
      closed: true,
    });
    expect(update()).toHaveBeenCalledWith({
      where: { id: "int1" },
      data: { status: "completed", completedAt: expect.any(Date) },
    });
  });

  it("does nothing while there is still time", async () => {
    findUnique().mockResolvedValueOnce(stored() as any);

    await expect(closeExpiredInterviewAction("int1")).resolves.toEqual({
      success: true,
      closed: false,
    });
    expect(update()).not.toHaveBeenCalled();
  });
});

describe("deleteInterview", () => {
  it("requires a signed-in user", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    expect(await deleteInterview("int1")).toMatchObject({ success: false, error: expect.stringContaining("Sessione scaduta") });
    expect(prisma.interview.delete).not.toHaveBeenCalled();
  });

  it("deletes the interview and expires its caches", async () => {
    findUnique().mockResolvedValueOnce({ quizId: "quiz1" } as any);

    await expect(deleteInterview("int1")).resolves.toEqual({ success: true });
    expect(prisma.interview.delete).toHaveBeenCalledWith({
      where: { id: "int1" },
    });
    expect(invalidateInterviewCache).toHaveBeenCalledWith({
      interviewId: "int1",
      quizId: "quiz1",
      deleted: true,
    });
  });

  it("throws when the interview does not exist", async () => {
    findUnique().mockResolvedValueOnce(null);

    expect(await deleteInterview("nope")).toMatchObject({ success: false, error: expect.stringContaining("Colloquio non trovato") });
  });
});

describe("assignCandidatesToQuiz", () => {
  const candidates = [
    { id: "c1", firstName: "Mario", lastName: "Rossi", email: "m@x.it" },
    { id: "c2", firstName: "Anna", lastName: "Bianchi", email: "a@x.it" },
  ];

  beforeEach(() => {
    vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
      id: "quiz1",
      positionId: "pos1",
    } as any);
    vi.mocked(prisma.candidate.findMany).mockResolvedValue(candidates as any);
    vi.mocked(prisma.interview.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.interview.create).mockResolvedValue({
      token: "new-token",
    } as any);
  });

  it("creates one pending interview per candidate", async () => {
    const result = unwrap(await assignCandidatesToQuiz({
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
    expect(prisma.interview.create).toHaveBeenCalledTimes(2);
  });

  it("only accepts candidates linked to the quiz position", async () => {
    await assignCandidatesToQuiz({ quizId: "quiz1", candidateIds: ["c1", "c2"] });

    expect(prisma.candidate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ["c1", "c2"] },
          positions: { some: { positionId: "pos1" } },
        },
      }),
    );
  });

  it("rejects the request when a candidate is not valid for the position", async () => {
    vi.mocked(prisma.candidate.findMany).mockResolvedValueOnce([
      candidates[0],
    ] as any);

    expect(await assignCandidatesToQuiz({ quizId: "quiz1", candidateIds: ["c1", "c2"] }),).toMatchObject({ success: false, error: expect.stringContaining("non sono validi") });
    expect(prisma.interview.create).not.toHaveBeenCalled();
  });

  it("skips a candidate who already has an interview for the quiz", async () => {
    vi.mocked(prisma.interview.findFirst)
      .mockResolvedValueOnce({ id: "existing" } as any)
      .mockResolvedValueOnce(null);

    const result = unwrap(await assignCandidatesToQuiz({
      quizId: "quiz1",
      candidateIds: ["c1", "c2"],
    }));

    expect(result.created.map((c) => c.candidateId)).toEqual(["c2"]);
    expect(result.skipped).toEqual(["Esiste già un colloquio per Mario Rossi."]);
  });

  it("requires at least one candidate", async () => {
    expect(await assignCandidatesToQuiz({ quizId: "quiz1", candidateIds: [] }),).toMatchObject({ success: false });
  });

  it("throws when the quiz does not exist", async () => {
    vi.mocked(prisma.quiz.findUnique).mockResolvedValueOnce(null);

    expect(await assignCandidatesToQuiz({ quizId: "nope", candidateIds: ["c1"] }),).toMatchObject({ success: false, error: expect.stringContaining("Quiz non trovato") });
  });
});

describe("assignQuizzesToCandidate", () => {
  beforeEach(() => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({
      id: "c1",
      positions: [{ positionId: "pos1" }],
    } as any);
    vi.mocked(prisma.quiz.findMany).mockResolvedValue([
      { id: "quiz1", title: "Quiz A" },
      { id: "quiz2", title: "Quiz B" },
    ] as any);
    vi.mocked(prisma.interview.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.interview.create).mockResolvedValue({
      token: "new-token",
    } as any);
  });

  it("creates one pending interview per quiz", async () => {
    const result = unwrap(await assignQuizzesToCandidate({
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

    expect(await assignQuizzesToCandidate({
        candidateId: "c1",
        quizIds: ["quiz1", "quiz2"],
      }),).toMatchObject({ success: false, error: expect.stringContaining("non sono validi") });
    expect(prisma.quiz.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["quiz1", "quiz2"] }, positionId: { in: ["pos1"] } },
      }),
    );
  });

  it("skips a quiz the candidate already has an interview for", async () => {
    vi.mocked(prisma.interview.findFirst)
      .mockResolvedValueOnce({ id: "existing" } as any)
      .mockResolvedValueOnce(null);

    const result = unwrap(await assignQuizzesToCandidate({
      candidateId: "c1",
      quizIds: ["quiz1", "quiz2"],
    }));

    expect(result.created.map((c) => c.quizId)).toEqual(["quiz2"]);
    expect(result.skipped).toEqual(["Esiste già un colloquio per Quiz A."]);
  });

  it("throws when the candidate does not exist", async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValueOnce(null);

    expect(await assignQuizzesToCandidate({ candidateId: "nope", quizIds: ["quiz1"] }),).toMatchObject({ success: false, error: expect.stringContaining("Candidato non trovato") });
  });
});
