import { syncQuizQuestions } from "@/lib/services/quiz-questions";
import { mockMultipleChoiceQuestion, mockOpenQuestion } from "@/tests/mocks";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeTx() {
  let created = 0;
  return {
    quizQuestion: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    question: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      create: vi.fn(() => Promise.resolve({ id: `q-new-${++created}` })),
      deleteMany: vi.fn(),
    },
  };
}

describe("syncQuizQuestions", () => {
  let tx: ReturnType<typeof makeTx>;

  beforeEach(() => {
    tx = makeTx();
  });

  it("creates the links in array order with their criterionIds ([] when none)", async () => {
    await syncQuizQuestions(
      tx as any,
      "quiz-1",
      [
        mockOpenQuestion({ criterionIds: ["c-1", "c-2"] }),
        mockMultipleChoiceQuestion(),
      ],
      "user-1",
    );

    expect(tx.quizQuestion.create).toHaveBeenNthCalledWith(1, {
      data: {
        quizId: "quiz-1",
        questionId: "q-new-1",
        order: 0,
        criterionIds: ["c-1", "c-2"],
      },
    });
    expect(tx.quizQuestion.create).toHaveBeenNthCalledWith(2, {
      data: {
        quizId: "quiz-1",
        questionId: "q-new-2",
        order: 1,
        criterionIds: [],
      },
    });
  });

  it("never writes criterionIds on the Question row", async () => {
    await syncQuizQuestions(
      tx as any,
      "quiz-1",
      [mockOpenQuestion({ criterionIds: ["c-1"] })],
      "user-1",
    );

    const createArgs = vi.mocked(tx.question.create).mock.calls[0] as unknown as [
      { data: Record<string, unknown> },
    ];
    expect(createArgs[0].data).not.toHaveProperty("criterionIds");
  });

  it("updates a question with an existing dbId and creates the others", async () => {
    tx.question.findUnique.mockImplementation((args: { where: { id: string } }) =>
      Promise.resolve(args.where.id === "q-1" ? { id: "q-1" } : null),
    );

    await syncQuizQuestions(
      tx as any,
      "quiz-1",
      [
        mockOpenQuestion({ dbId: "q-1", criterionIds: ["c-9"] }),
        mockOpenQuestion({ dbId: "q-gone" }),
      ],
      "user-1",
    );

    expect(tx.question.update).toHaveBeenCalledWith({
      where: { id: "q-1" },
      data: expect.not.objectContaining({ criterionIds: expect.anything() }),
    });
    expect(tx.question.create).toHaveBeenCalledTimes(1);
    expect(tx.quizQuestion.create).toHaveBeenNthCalledWith(1, {
      data: {
        quizId: "quiz-1",
        questionId: "q-1",
        order: 0,
        criterionIds: ["c-9"],
      },
    });
    expect(tx.quizQuestion.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({ questionId: "q-new-1", order: 1 }),
    });
  });

  it("deletes a dropped question only when it is not a favorite and has no other link", async () => {
    tx.quizQuestion.findMany.mockResolvedValue([
      { questionId: "q-1" },
      { questionId: "q-dropped" },
    ]);
    tx.question.findUnique.mockResolvedValue({ id: "q-1" });

    await syncQuizQuestions(
      tx as any,
      "quiz-1",
      [mockOpenQuestion({ dbId: "q-1" })],
      "user-1",
    );

    expect(tx.quizQuestion.deleteMany).toHaveBeenCalledWith({
      where: { quizId: "quiz-1" },
    });
    expect(tx.question.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["q-dropped"] },
        isFavorite: false,
        quizQuestions: { none: {} },
      },
    });
  });

  it("deletes nothing on a first save", async () => {
    await syncQuizQuestions(tx as any, "quiz-1", [mockOpenQuestion()], "user-1");

    expect(tx.quizQuestion.deleteMany).not.toHaveBeenCalled();
    expect(tx.question.deleteMany).not.toHaveBeenCalled();
  });
});
