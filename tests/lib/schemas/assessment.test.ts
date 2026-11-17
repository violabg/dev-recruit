import { assessmentAnswerSchema, submitAnswerSchema } from "@/lib/schemas";
import { describe, expect, it } from "vitest";

describe("assessmentAnswerSchema", () => {
  it("accepts a text, an option index and a code answer", () => {
    expect(assessmentAnswerSchema.parse("Una risposta")).toBe("Una risposta");
    expect(assessmentAnswerSchema.parse(2)).toBe(2);
    expect(assessmentAnswerSchema.parse({ code: "const a = 1;" })).toEqual({
      code: "const a = 1;",
    });
  });

  it("never turns a non-numeric value into an option index", () => {
    for (const value of [null, true, false, [], undefined]) {
      expect(assessmentAnswerSchema.safeParse(value).success).toBe(false);
    }
  });

  it("rejects an empty text, a negative index and an empty code", () => {
    expect(assessmentAnswerSchema.safeParse("").success).toBe(false);
    expect(assessmentAnswerSchema.safeParse(-1).success).toBe(false);
    expect(assessmentAnswerSchema.safeParse(1.5).success).toBe(false);
    expect(assessmentAnswerSchema.safeParse({ code: "" }).success).toBe(false);
  });
});

describe("submitAnswerSchema", () => {
  it("requires the token and the question id", () => {
    expect(
      submitAnswerSchema.safeParse({ token: "", questionId: "q1", answer: 0 })
        .success,
    ).toBe(false);
    expect(
      submitAnswerSchema.safeParse({ token: "t", questionId: "", answer: 0 })
        .success,
    ).toBe(false);
    expect(
      submitAnswerSchema.safeParse({ token: "t", questionId: "q1", answer: 0 })
        .success,
    ).toBe(true);
  });
});
