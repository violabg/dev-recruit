import {
  evaluateAnswer,
  generateOverallEvaluation,
} from "@/lib/actions/evaluations";
import prisma from "@/lib/prisma";
import { generateObject } from "ai";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

vi.mock("@/lib/services/ai-service", () => ({
  getOptimalModel: vi.fn(() => "test-model"),
}));

describe("evaluations actions", () => {
  beforeEach(() => {
    vi.mocked(prisma.interview.findUnique).mockResolvedValue({
      id: "int1",
      quizId: "quiz1",
    } as any);
    vi.mocked(prisma.quiz.findUnique).mockResolvedValue({ id: "quiz1" } as any);
    vi.mocked(prisma.evaluation.create).mockResolvedValue({
      id: "eval1",
    } as any);
    vi.mocked(prisma.evaluation.findMany).mockResolvedValue([]);
  });

  it("evaluateAnswer evaluates an answer", async () => {
    const question = {
      type: "multiple_choice" as const,
      question: "Test question",
      options: ["A", "B"],
      correctAnswer: 0,
    };
    const answer = "0";

    // Mock the AI response
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        evaluation: "Good answer",
        score: 8,
        strengths: ["Correct"],
        weaknesses: ["None"],
      },
    } as any);

    const result = await evaluateAnswer(question, answer);

    expect(result).toEqual({
      evaluation: "Good answer",
      score: 8,
      strengths: ["Correct"],
      weaknesses: ["None"],
      maxScore: 10,
    });
  });

  it("generateOverallEvaluation generates evaluation", async () => {
    const evaluations = {
      q1: {
        evaluation: "Good",
        score: 8,
        strengths: ["Correct"],
        weaknesses: ["None"],
      },
    };

    // Mock the AI response
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        evaluation: "Overall good",
        strengths: ["Knowledge"],
        weaknesses: ["Depth"],
        recommendation: "Proceed",
        fitScore: 80,
      },
    } as any);

    await generateOverallEvaluation("John", 1, 1, 80, evaluations);

    expect(generateObject).toHaveBeenCalled();
  });
});
