/**
 * Score of the evaluation dashboard of an application. Computed, never stored:
 * the weighted average of the parts that are present.
 */

export type EvaluationScoreInput = {
  /** 0–100 */
  quizScore: number | null | undefined;
  rubric:
    | {
        communicationScore: number;
        collaborationScore: number;
        problemSolvingScore: number;
        cultureFitScore: number;
      }
    | null
    | undefined;
  hireRecommendation: string | null | undefined;
};

export type EvaluationScore = {
  /** 0–10 */
  quiz: number | null;
  /** 0–10 */
  behavioral: number | null;
  /** 0–10 */
  hiring: number | null;
  /** 0–10 */
  overall: number | null;
};

export const EVALUATION_SCORE_WEIGHTS = {
  quiz: 0.5,
  behavioral: 0.3,
  hiring: 0.2,
} as const;

const HIRE_RECOMMENDATION_SCORES: Record<string, number> = {
  strong_yes: 10,
  yes: 8,
  maybe: 6,
  no: 4,
  strong_no: 2,
};

export function computeEvaluationScore(
  input: EvaluationScoreInput,
): EvaluationScore {
  const quiz =
    typeof input.quizScore === "number"
      ? Math.round(input.quizScore / 10)
      : null;

  const rubric = input.rubric;
  const behavioral = rubric
    ? Math.round(
        ((rubric.communicationScore +
          rubric.collaborationScore +
          rubric.problemSolvingScore +
          rubric.cultureFitScore) /
          4) *
          2,
      )
    : null;

  const hiring = input.hireRecommendation
    ? (HIRE_RECOMMENDATION_SCORES[input.hireRecommendation] ?? null)
    : null;

  const candidates: { score: number | null; weight: number }[] = [
    { score: quiz, weight: EVALUATION_SCORE_WEIGHTS.quiz },
    { score: behavioral, weight: EVALUATION_SCORE_WEIGHTS.behavioral },
    { score: hiring, weight: EVALUATION_SCORE_WEIGHTS.hiring },
  ];
  const parts = candidates.filter(
    (part): part is { score: number; weight: number } => part.score !== null,
  );

  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
  const overall =
    parts.length > 0
      ? Math.round(
          parts.reduce((sum, part) => sum + part.score * part.weight, 0) /
            totalWeight,
        )
      : null;

  return { quiz, behavioral, hiring, overall };
}
