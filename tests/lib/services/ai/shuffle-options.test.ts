import { shuffleOptions } from "@/lib/services/ai/core";
import { describe, expect, it } from "vitest";

describe("shuffleOptions", () => {
  const question = {
    type: "multiple_choice",
    question: "Q",
    options: ["giusta", "b", "c", "d"],
    correctAnswer: 0,
  };

  it("moves correctAnswer with the shuffled options", () => {
    // random() = 0 always swaps with the first element
    const shuffled = shuffleOptions(question, () => 0);
    expect(shuffled.options).toHaveLength(4);
    expect([...shuffled.options].sort()).toEqual([...question.options].sort());
    expect(shuffled.options[shuffled.correctAnswer]).toBe("giusta");
    expect(shuffled.correctAnswer).not.toBe(0);
  });

  it("leaves other types and invalid answers unchanged", () => {
    const open = { type: "open_question", question: "Q" };
    expect(shuffleOptions(open)).toBe(open);
    const invalid = { ...question, correctAnswer: 7 };
    expect(shuffleOptions(invalid)).toBe(invalid);
  });
});
