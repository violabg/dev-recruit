import type { CriterionPriority } from "@/lib/schemas";

/**
 * Criteria coverage of the live mode and pre-fill of the interviewer
 * scorecard. Pure functions: criterion ids are resolved through the given
 * criteria (active and archived); unknown ids are ignored.
 */

export type CoverageCriterion = {
  id: string;
  name: string;
  priority: CriterionPriority;
  order: number;
  archived: boolean;
};

export type CoverageItem = {
  id: string;
  criterionIds: string[];
  covered: boolean;
  ownScore: number | null;
};

export type CriterionCoverage = {
  criterionId: string;
  name: string;
  priority: CriterionPriority;
  archived: boolean;
  hasEvidence: boolean;
  coveredCount: number;
  itemCount: number;
};

const PRIORITY_RANK: Record<CriterionPriority, number> = { must: 0, nice: 1 };

/** Criteria cited by the kit, must first then scorecard order; hasEvidence = an item citing it is covered or has the viewer's own score. */
export function computeCriterionCoverage(
  criteria: readonly CoverageCriterion[],
  items: readonly CoverageItem[],
): CriterionCoverage[] {
  return criteria
    .map((criterion) => ({
      criterion,
      citing: items.filter((item) => item.criterionIds.includes(criterion.id)),
    }))
    .filter(({ citing }) => citing.length > 0)
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.criterion.priority] -
          PRIORITY_RANK[b.criterion.priority] ||
        a.criterion.order - b.criterion.order,
    )
    .map(({ criterion, citing }) => ({
      criterionId: criterion.id,
      name: criterion.name,
      priority: criterion.priority,
      archived: criterion.archived,
      hasEvidence: citing.some(
        (item) => item.covered || item.ownScore != null,
      ),
      coveredCount: citing.filter((item) => item.covered).length,
      itemCount: citing.length,
    }));
}

export type OwnNote = {
  kitItemId: string;
  criterionIds: string[];
  note: string | null;
  score: number | null;
  evidenceQuote: string | null;
};

const hasText = (value: string | null): value is string =>
  value != null && value.trim().length > 0;

/** Pre-fill per criterion: score = Math.round(mean of own note scores on items citing it) or null; evidence = own notes and evidence quotes of those items joined by '\n'. */
export function buildFeedbackPrefill(
  criteria: readonly { id: string }[],
  notes: readonly OwnNote[],
): { criterionId: string; score: number | null; evidence: string }[] {
  return criteria.map((criterion) => {
    const citing = notes.filter((note) =>
      note.criterionIds.includes(criterion.id),
    );
    const scores = citing
      .map((note) => note.score)
      .filter((score): score is number => score != null);
    const score =
      scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : null;
    const evidence = citing
      .flatMap((note) => [note.note, note.evidenceQuote].filter(hasText))
      .join("\n");
    return { criterionId: criterion.id, score, evidence };
  });
}
