import { getOptimalModel, LLM_MODELS } from "@/lib/services/ai/models";
import { describe, expect, it } from "vitest";

describe("getOptimalModel", () => {
  it("returns the specific model when given", () => {
    expect(getOptimalModel("scorecard_generation", "some/model")).toBe(
      "some/model",
    );
  });

  it("returns the small model for simple_task", () => {
    expect(getOptimalModel("simple_task")).toBe(LLM_MODELS.GPT_OSS_20B);
  });

  it.each([
    "scorecard_generation",
    "guide_generation",
    "kit_generation",
    "decision_review",
    "quiz_generation",
    "question_generation",
    "evaluation",
    "overall_evaluation",
    "resume_evaluation",
  ] as const)("returns the large model for %s", (task) => {
    expect(getOptimalModel(task)).toBe(LLM_MODELS.GPT_OSS_120B);
  });
});
