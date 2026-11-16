import { aiQuizGenerationSchema, saveQuizSchema } from "@/lib/schemas";
import { mockOpenQuestion } from "@/tests/mocks";
import { describe, expect, it } from "vitest";

describe("aiQuizGenerationSchema", () => {
  it("parses questions without criterionKeys", () => {
    const result = aiQuizGenerationSchema.safeParse({
      title: "Quiz React",
      questions: [mockOpenQuestion()],
    });
    expect(result.success).toBe(true);
  });

  it("parses questions with criterionKeys and keeps them", () => {
    const result = aiQuizGenerationSchema.parse({
      title: "Quiz React",
      questions: [mockOpenQuestion({}), { ...mockOpenQuestion(), criterionKeys: ["C1", "C2"] }],
    });
    expect(result.questions[1]).toMatchObject({ criterionKeys: ["C1", "C2"] });
    expect(result.questions[0]).not.toHaveProperty("criterionKeys");
  });

  it("still applies the multiple choice rules of the flexible schema", () => {
    const result = aiQuizGenerationSchema.safeParse({
      title: "Quiz React",
      questions: [
        {
          type: "multiple_choice",
          question: "Domanda?",
          options: ["Uno"],
          criterionKeys: ["C1"],
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("saveQuizSchema", () => {
  it("keeps the criterionIds of each question", () => {
    const result = saveQuizSchema.parse({
      title: "Quiz React",
      positionId: "pos-1",
      timeLimit: null,
      questions: [mockOpenQuestion({ criterionIds: ["c-1", "c-2"] })],
    });
    expect(result.questions[0].criterionIds).toEqual(["c-1", "c-2"]);
  });

  it("keeps its refine: a quiz id or a position id is required", () => {
    const result = saveQuizSchema.safeParse({
      title: "Quiz React",
      timeLimit: null,
      questions: [mockOpenQuestion()],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "La posizione è obbligatoria per creare un quiz",
    );
  });
});
