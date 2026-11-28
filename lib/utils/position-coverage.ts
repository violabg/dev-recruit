import type { CriterionPriority } from "@/lib/schemas/scorecard";

/**
 * Coverage of a position's criteria by the questions that verify them: the
 * single counting rule of the coverage table and of the Candidati warning.
 * Pure module: no server imports.
 */

export type CoverageCriterionInput = {
  id: string;
  name: string;
  priority: CriterionPriority;
  order: number;
};

export type PositionCoverageRow = {
  criterionId: string;
  name: string;
  priority: CriterionPriority;
  quizQuestionCount: number;
  guideQuestionCount: number;
  total: number;
  uncovered: boolean;
};

export type PositionCoverage = {
  rows: PositionCoverageRow[];
  /** The rows no question verifies, in scorecard order */
  uncovered: PositionCoverageRow[];
};

/**
 * One row per active criterion, in input order. Every quiz link and every
 * guide question citing the criterion counts once; a link citing two criteria
 * counts for both. Ids that are not among the given criteria are ignored.
 */
export function computePositionCoverage(
  criteria: CoverageCriterionInput[],
  quizLinks: { criterionIds: string[] }[],
  guideQuestions: { criterionIds: string[] }[],
): PositionCoverage {
  const rows = criteria.map((criterion) => {
    const quizQuestionCount = quizLinks.filter((link) =>
      link.criterionIds.includes(criterion.id),
    ).length;
    const guideQuestionCount = guideQuestions.filter((question) =>
      question.criterionIds.includes(criterion.id),
    ).length;
    const total = quizQuestionCount + guideQuestionCount;

    return {
      criterionId: criterion.id,
      name: criterion.name,
      priority: criterion.priority,
      quizQuestionCount,
      guideQuestionCount,
      total,
      uncovered: total === 0,
    };
  });

  return { rows, uncovered: rows.filter((row) => row.uncovered) };
}

/**
 * Where to add a question for a criterion: the editor of the position's first
 * traccia (lowest round), or the new traccia page when there is none. The
 * criterion id travels as `?criterio=` so the editor can preselect it.
 */
export function coverageFixHref(
  positionId: string,
  guides: { id: string; round: number }[],
  criterionId: string,
): string {
  const first = guides[0];
  const base = first
    ? `/dashboard/positions/${positionId}/guides/${first.id}/edit`
    : `/dashboard/positions/${positionId}/guides/new`;
  return `${base}?criterio=${criterionId}`;
}
