import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidateQuestionCache: vi.fn(),
  invalidateQuizCache: vi.fn(),
}));

vi.mock("@/lib/services/logger", () => ({ logger: { error: vi.fn() } }));

import { deleteQuestionFromQuizAction } from "@/lib/actions/questions";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import {
  invalidateQuestionCache,
  invalidateQuizCache,
} from "@/lib/utils/cache-utils";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ id: "user-123" } as any);
  vi.mocked(prisma.question.findUnique).mockResolvedValue({
    id: "q1",
    isFavorite: false,
  } as any);
  vi.mocked(prisma.quizQuestion.findMany).mockResolvedValue([
    { quizId: "quiz-1" },
  ] as any);
  vi.mocked(prisma.question.delete).mockResolvedValue({ id: "q1" } as any);
  vi.mocked(prisma.quizQuestion.deleteMany).mockResolvedValue({
    count: 1,
  } as any);
});

describe("deleteQuestionFromQuizAction", () => {
  it("deletes the question when it is not a favorite and no other quiz links it", async () => {
    const result = await deleteQuestionFromQuizAction("quiz-1", "q1");

    expect(result).toEqual({
      success: true,
      wasDeleted: true,
      wasFavorite: false,
      wasLinkedElsewhere: false,
    });
    expect(prisma.question.delete).toHaveBeenCalledWith({
      where: { id: "q1" },
    });
    expect(prisma.quizQuestion.deleteMany).not.toHaveBeenCalled();
    expect(invalidateQuestionCache).toHaveBeenCalledWith({ questionId: "q1" });
    expect(invalidateQuizCache).toHaveBeenCalledWith({ quizId: "quiz-1" });
  });

  it("removes only the link when the question is a favorite", async () => {
    vi.mocked(prisma.question.findUnique).mockResolvedValue({
      id: "q1",
      isFavorite: true,
    } as any);

    const result = await deleteQuestionFromQuizAction("quiz-1", "q1");

    expect(result).toEqual({
      success: true,
      wasDeleted: false,
      wasFavorite: true,
      wasLinkedElsewhere: false,
    });
    expect(prisma.question.delete).not.toHaveBeenCalled();
    expect(prisma.quizQuestion.deleteMany).toHaveBeenCalledWith({
      where: { quizId: "quiz-1", questionId: "q1" },
    });
    expect(invalidateQuestionCache).not.toHaveBeenCalled();
    expect(invalidateQuizCache).toHaveBeenCalledWith({ quizId: "quiz-1" });
  });

  it("removes only the link when another quiz still links the question", async () => {
    vi.mocked(prisma.quizQuestion.findMany).mockResolvedValue([
      { quizId: "quiz-1" },
      { quizId: "quiz-2" },
    ] as any);

    const result = await deleteQuestionFromQuizAction("quiz-1", "q1");

    expect(result).toEqual({
      success: true,
      wasDeleted: false,
      wasFavorite: false,
      wasLinkedElsewhere: true,
    });
    expect(prisma.question.delete).not.toHaveBeenCalled();
    expect(prisma.quizQuestion.deleteMany).toHaveBeenCalledWith({
      where: { quizId: "quiz-1", questionId: "q1" },
    });
    expect(invalidateQuizCache).toHaveBeenCalledWith({ quizId: "quiz-1" });
  });

  it("reports a missing question with a UserError message", async () => {
    vi.mocked(prisma.question.findUnique).mockResolvedValueOnce(null);

    const result = await deleteQuestionFromQuizAction("quiz-1", "nope");

    expect(result).toEqual({ success: false, error: "Domanda non trovata" });
    expect(prisma.question.delete).not.toHaveBeenCalled();
    expect(prisma.quizQuestion.deleteMany).not.toHaveBeenCalled();
  });

  it("requires a signed-in user", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    const result = await deleteQuestionFromQuizAction("quiz-1", "q1");

    expect(result).toMatchObject({ success: false });
    expect(prisma.question.findUnique).not.toHaveBeenCalled();
  });
});
