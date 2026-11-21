import { beforeEach, describe, expect, it, vi } from "vitest";

// Hand-built transaction: the quiz writes go through it, never through the
// client (question and quizQuestion writes belong to syncQuizQuestions)
const tx = {
  quiz: { create: vi.fn(), update: vi.fn() },
  question: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  quizQuestion: { create: vi.fn(), deleteMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({
  default: {
    user: { findUnique: vi.fn() },
    quiz: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    position: { findUnique: vi.fn() },
    quizQuestion: { findMany: vi.fn(), create: vi.fn() },
    scorecardCriterion: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/services/quiz-questions", () => ({
  syncQuizQuestions: vi.fn(),
}));

vi.mock("@/lib/services/scorecards", () => ({
  assertActiveCriteria: vi.fn(),
}));

import prisma from "@/lib/prisma";
import type { Actor } from "@/lib/services/actor";
import { syncQuizQuestions } from "@/lib/services/quiz-questions";
import { saveQuiz } from "@/lib/services/quizzes";
import { assertActiveCriteria } from "@/lib/services/scorecards";
import { UserError } from "@/lib/services/user-error";
import { mockMultipleChoiceQuestion, mockOpenQuestion } from "@/tests/mocks";

const actor: Actor = { userId: "user-123", role: "user" };

const CRITERIA_REFUSED =
  "Uno o più criteri selezionati non appartengono alla scheda della posizione";

/** New open question (no dbId), optionally citing criteria */
const openQuestion = (criterionIds?: string[]) =>
  mockOpenQuestion(criterionIds ? { criterionIds } : {});

beforeEach(() => {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    emailVerified: true,
    banned: false,
  } as any);
  vi.mocked(prisma.position.findUnique).mockResolvedValue({ id: "pos1" } as any);
  vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
    positionId: "pos1",
  } as any);
  vi.mocked(prisma.quizQuestion.findMany).mockResolvedValue([]);
  // Every criterion of the scorecard (active and archived); deleted ones are absent
  vi.mocked(prisma.scorecardCriterion.findMany).mockResolvedValue([
    { id: "c-active" },
    { id: "c-archived" },
  ] as any);
  vi.mocked(assertActiveCriteria).mockResolvedValue(undefined);
  vi.mocked(syncQuizQuestions).mockResolvedValue(undefined as any);
  tx.quiz.create.mockResolvedValue({ id: "new-quiz" });
  tx.quiz.update.mockResolvedValue({ id: "quiz1" });
  vi.mocked(prisma.$transaction).mockImplementation((async (
    callback: (client: unknown) => unknown,
  ) => callback(tx)) as any);
});

describe("saveQuiz: create", () => {
  it("creates the quiz for the position authored by the actor, syncing questions in the transaction", async () => {
    const question = openQuestion();

    const result = await saveQuiz(actor, {
      title: "Quiz React",
      positionId: "pos1",
      timeLimit: 30,
      questions: [question],
    } as any);

    expect(result).toEqual({
      quizId: "new-quiz",
      positionId: "pos1",
      created: true,
    });
    expect(tx.quiz.create).toHaveBeenCalledWith({
      data: {
        title: "Quiz React",
        positionId: "pos1",
        timeLimit: 30,
        createdBy: "user-123",
      },
      select: { id: true },
    });
    expect(syncQuizQuestions).toHaveBeenCalledWith(
      tx,
      "new-quiz",
      [expect.objectContaining({ question: question.question })],
      "user-123",
    );
    // Writes never go through the client outside the transaction
    expect(prisma.quiz.create).not.toHaveBeenCalled();
    expect(tx.quiz.update).not.toHaveBeenCalled();
    expect(tx.question.create).not.toHaveBeenCalled();
    expect(tx.quizQuestion.create).not.toHaveBeenCalled();
  });

  it("refuses a missing position and saves nothing", async () => {
    vi.mocked(prisma.position.findUnique).mockResolvedValueOnce(null);

    await expect(
      saveQuiz(actor, {
        title: "Quiz",
        positionId: "nope",
        timeLimit: null,
        questions: [openQuestion()],
      } as any),
    ).rejects.toThrow("Posizione non trovata o accesso negato.");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses input without quizId and positionId with the schema message", async () => {
    await expect(
      saveQuiz(actor, {
        title: "Quiz",
        timeLimit: null,
        questions: [openQuestion()],
      } as any),
    ).rejects.toBeInstanceOf(UserError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses invalid questions", async () => {
    await expect(
      saveQuiz(actor, {
        title: "Quiz",
        positionId: "pos1",
        questions: "invalid json",
      } as any),
    ).rejects.toBeInstanceOf(UserError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses a disabled actor before reading the quiz input", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      emailVerified: false,
      banned: false,
    } as any);

    await expect(
      saveQuiz(actor, {
        title: "Quiz",
        positionId: "pos1",
        timeLimit: null,
        questions: [openQuestion()],
      } as any),
    ).rejects.toThrow("Sessione scaduta. Accedi di nuovo per continuare.");
    expect(prisma.position.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("saveQuiz: update", () => {
  it("updates title and time limit and syncs the questions with the actor id", async () => {
    const question = mockMultipleChoiceQuestion({ dbId: "q1" });

    const result = await saveQuiz(actor, {
      quizId: "quiz1",
      title: "Aggiornato",
      timeLimit: 45,
      questions: [question],
    } as any);

    expect(result).toEqual({
      quizId: "quiz1",
      positionId: "pos1",
      created: false,
    });
    expect(tx.quiz.update).toHaveBeenCalledWith({
      where: { id: "quiz1" },
      data: { title: "Aggiornato", timeLimit: 45 },
    });
    expect(syncQuizQuestions).toHaveBeenCalledWith(
      tx,
      "quiz1",
      [expect.objectContaining({ dbId: "q1" })],
      "user-123",
    );
    expect(tx.quiz.create).not.toHaveBeenCalled();
    expect(prisma.position.findUnique).not.toHaveBeenCalled();
  });

  it("refuses a missing quiz and saves nothing", async () => {
    vi.mocked(prisma.quiz.findUnique).mockResolvedValueOnce(null);

    await expect(
      saveQuiz(actor, {
        quizId: "nope",
        title: "Quiz",
        timeLimit: null,
        questions: [openQuestion()],
      } as any),
    ).rejects.toThrow("Quiz non trovato o accesso negato.");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("propagates a transaction failure", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error("db down"));

    await expect(
      saveQuiz(actor, {
        quizId: "quiz1",
        title: "Quiz",
        timeLimit: null,
        questions: [openQuestion()],
      } as any),
    ).rejects.toThrow("db down");
  });
});

describe("saveQuiz: criteria", () => {
  it("refuses a criterion that is not active on the position and saves nothing", async () => {
    vi.mocked(assertActiveCriteria).mockRejectedValueOnce(
      new UserError(CRITERIA_REFUSED),
    );

    await expect(
      saveQuiz(actor, {
        title: "Quiz",
        positionId: "pos1",
        timeLimit: null,
        questions: [openQuestion(["c-active", "c-archived"])],
      } as any),
    ).rejects.toThrow(CRITERIA_REFUSED);
    expect(assertActiveCriteria).toHaveBeenCalledWith("pos1", [
      "c-active",
      "c-archived",
    ]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(syncQuizQuestions).not.toHaveBeenCalled();
  });

  it("reads every criterion of the position scorecard, active or archived", async () => {
    await saveQuiz(actor, {
      title: "Quiz",
      positionId: "pos1",
      timeLimit: null,
      questions: [openQuestion(["c-active"])],
    } as any);

    expect(prisma.scorecardCriterion.findMany).toHaveBeenCalledWith({
      where: { scorecard: { positionId: "pos1" } },
      select: { id: true },
    });
  });

  it("drops the ids of deleted criteria before saving", async () => {
    await saveQuiz(actor, {
      title: "Quiz",
      positionId: "pos1",
      timeLimit: null,
      questions: [openQuestion(["c-deleted", "c-active"])],
    } as any);

    expect(assertActiveCriteria).toHaveBeenCalledWith("pos1", ["c-active"]);
    expect(syncQuizQuestions).toHaveBeenCalledWith(
      tx,
      "new-quiz",
      [expect.objectContaining({ criterionIds: ["c-active"] })],
      "user-123",
    );
  });

  it("accepts an archived id already stored anywhere on the same quiz", async () => {
    vi.mocked(prisma.quizQuestion.findMany).mockResolvedValueOnce([
      { criterionIds: ["c-archived"] },
    ] as any);

    await saveQuiz(actor, {
      quizId: "quiz1",
      title: "Quiz",
      timeLimit: null,
      questions: [openQuestion(["c-archived", "c-active"])],
    } as any);

    expect(prisma.quizQuestion.findMany).toHaveBeenCalledWith({
      where: { quizId: "quiz1" },
      select: { criterionIds: true },
    });
    // Only the ids not already on the quiz must be active
    expect(assertActiveCriteria).toHaveBeenCalledWith("pos1", ["c-active"]);
    expect(syncQuizQuestions).toHaveBeenCalledWith(
      tx,
      "quiz1",
      [expect.objectContaining({ criterionIds: ["c-archived", "c-active"] })],
      "user-123",
    );
  });

  it("checks an archived id not yet on a new quiz as an active one", async () => {
    await saveQuiz(actor, {
      title: "Quiz",
      positionId: "pos1",
      timeLimit: null,
      questions: [openQuestion(["c-archived"])],
    } as any);

    // A new quiz has no stored links: nothing is read
    expect(prisma.quizQuestion.findMany).not.toHaveBeenCalled();
    expect(assertActiveCriteria).toHaveBeenCalledWith("pos1", ["c-archived"]);
  });

  it("skips the stored-links read and the active check without criteria", async () => {
    await saveQuiz(actor, {
      quizId: "quiz1",
      title: "Quiz",
      timeLimit: null,
      questions: [openQuestion()],
    } as any);

    expect(prisma.quizQuestion.findMany).not.toHaveBeenCalled();
    expect(assertActiveCriteria).not.toHaveBeenCalled();
    expect(syncQuizQuestions).toHaveBeenCalled();
  });
});
