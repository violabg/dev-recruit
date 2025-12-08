import { deleteQuizById, upsertQuizAction } from "@/lib/actions/quizzes";
import prisma from "@/lib/prisma";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

describe("quizzes actions", () => {
  beforeEach(() => {
    vi.mocked(prisma.position.findUnique).mockResolvedValue({
      id: "pos1",
    } as any);
    vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
      id: "quiz1",
      positionId: "pos1",
    } as any);
    vi.mocked(prisma.quiz.create).mockResolvedValue({ id: "new" } as any);
    vi.mocked(prisma.quiz.update).mockResolvedValue({ id: "quiz1" } as any);
    vi.mocked(prisma.quiz.delete).mockResolvedValue({ id: "quiz1" } as any);
    vi.mocked(prisma.question.findMany).mockResolvedValue([]);
    vi.mocked(prisma.question.create).mockResolvedValue({ id: "q1" } as any);
    vi.mocked(prisma.quizQuestion.findMany).mockResolvedValue([]);
    vi.mocked(prisma.quizQuestion.create).mockResolvedValue({
      id: "qq1",
    } as any);
    vi.mocked(prisma.quizQuestion.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.question.deleteMany).mockResolvedValue({ count: 0 });
  });

  it("upsertQuizAction creates a quiz", async () => {
    const questions = [
      {
        type: "multiple_choice" as const,
        question: "Test question",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: 0,
      },
    ];
    const formData = new FormData();
    formData.append("title", "Test Quiz");
    formData.append("positionId", "pos1");
    formData.append("questions", JSON.stringify(questions));

    try {
      await upsertQuizAction(formData);

      expect(prisma.quiz.create).toHaveBeenCalled();
    } catch (error) {
      console.log("Error:", error);
      throw error;
    }
  });

  it("deleteQuizById deletes a quiz", async () => {
    await deleteQuizById("quiz1");

    expect(prisma.quiz.delete).toHaveBeenCalled();
  });
});
