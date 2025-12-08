import {
  createQuestionAction,
  deleteQuestionAction,
  updateQuestionAction,
} from "@/lib/actions/questions";
import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("questions actions", () => {
  beforeEach(() => {
    vi.mocked(prisma.question.findUnique).mockResolvedValue({
      id: "q1",
    } as any);
    vi.mocked(prisma.question.create).mockResolvedValue({ id: "new" } as any);
    vi.mocked(prisma.question.update).mockResolvedValue({ id: "q1" } as any);
    vi.mocked(prisma.question.delete).mockResolvedValue({ id: "q1" } as any);
  });

  it("createQuestionAction creates a question", async () => {
    const input = {
      type: "multiple_choice" as const,
      question: "Test question",
      keywords: [],
      options: ["A", "B", "C", "D"],
      correctAnswer: 0,
      isFavorite: false,
    };

    await createQuestionAction(input);

    expect(prisma.question.create).toHaveBeenCalled();
  });

  it("updateQuestionAction updates a question", async () => {
    const input = {
      id: "q1",
      question: "Updated question",
    };

    await updateQuestionAction(input);

    expect(prisma.question.update).toHaveBeenCalled();
  });

  it("deleteQuestionAction deletes a question", async () => {
    await deleteQuestionAction("q1");

    expect(prisma.question.delete).toHaveBeenCalled();
  });
});
