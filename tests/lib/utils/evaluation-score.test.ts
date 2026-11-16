import {
  computeEvaluationScore,
  EVALUATION_SCORE_WEIGHTS,
} from "@/lib/utils/evaluation-score";
import { describe, expect, it } from "vitest";

const rubric = {
  communicationScore: 4,
  collaborationScore: 3,
  problemSolvingScore: 5,
  cultureFitScore: 4,
};

describe("computeEvaluationScore", () => {
  it("exposes the weights", () => {
    expect(EVALUATION_SCORE_WEIGHTS).toEqual({
      quiz: 0.5,
      behavioral: 0.3,
      hiring: 0.2,
    });
  });

  it("uses the quiz alone", () => {
    expect(
      computeEvaluationScore({ quizScore: 76, rubric: null, hireRecommendation: null }),
    ).toEqual({ quiz: 8, behavioral: null, hiring: null, overall: 8 });
  });

  it("uses the rubric alone: average of the four scores × 2", () => {
    // (4 + 3 + 5 + 4) / 4 = 4 → 8
    expect(
      computeEvaluationScore({ quizScore: null, rubric, hireRecommendation: null }),
    ).toEqual({ quiz: null, behavioral: 8, hiring: null, overall: 8 });
  });

  it("uses the hiring recommendation alone", () => {
    expect(
      computeEvaluationScore({
        quizScore: undefined,
        rubric: undefined,
        hireRecommendation: "strong_yes",
      }),
    ).toEqual({ quiz: null, behavioral: null, hiring: 10, overall: 10 });
  });

  it.each([
    ["strong_yes", 10],
    ["yes", 8],
    ["maybe", 6],
    ["no", 4],
    ["strong_no", 2],
  ])("maps %s to %i", (hireRecommendation, expected) => {
    expect(
      computeEvaluationScore({ quizScore: null, rubric: null, hireRecommendation })
        .hiring,
    ).toBe(expected);
  });

  it("weights all three parts and rounds", () => {
    // quiz 6 × 0.5 + behavioral 8 × 0.3 + hiring 4 × 0.2 = 6.2 → 6
    expect(
      computeEvaluationScore({ quizScore: 60, rubric, hireRecommendation: "no" }),
    ).toEqual({ quiz: 6, behavioral: 8, hiring: 4, overall: 6 });
  });

  it("weights only the parts present", () => {
    // (9 × 0.5 + 2 × 0.2) / 0.7 = 7
    expect(
      computeEvaluationScore({
        quizScore: 90,
        rubric: null,
        hireRecommendation: "strong_no",
      }).overall,
    ).toBe(7);
  });

  it("has no overall score without parts", () => {
    expect(
      computeEvaluationScore({ quizScore: null, rubric: null, hireRecommendation: null }),
    ).toEqual({ quiz: null, behavioral: null, hiring: null, overall: null });
  });

  it("counts a quiz score of 0", () => {
    expect(
      computeEvaluationScore({ quizScore: 0, rubric: null, hireRecommendation: null }),
    ).toEqual({ quiz: 0, behavioral: null, hiring: null, overall: 0 });
  });

  it("ignores an unknown hiring recommendation", () => {
    expect(
      computeEvaluationScore({
        quizScore: null,
        rubric: null,
        hireRecommendation: "forse",
      }).hiring,
    ).toBeNull();
  });
});
