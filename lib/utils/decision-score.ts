import type {
  AnswerEvaluations,
  CriterionCategory,
  CriterionPriority,
  DecisionWeights,
} from "@/lib/schemas";

// ====================
// DECISION SCORE
// ====================
// Pure scoring rules of the Decision page. Every source is expressed on the
// 1-5 scale; every derived score is rounded to one decimal place.

/** Minimum gap between interviewers' scores that signals a disagreement */
export const DISAGREEMENT_GAP = 2;

const round1 = (x: number): number => Math.round(x * 10) / 10;

/** 1 + 4*value/max, clamped to [1,5], one decimal. value 0..max */
export function toFivePointScale(value: number, max: number): number {
  if (max <= 0) return 1;
  const scaled = 1 + (4 * value) / max;
  return round1(Math.min(5, Math.max(1, scaled)));
}

/** Arithmetic mean, one decimal; null for an empty list */
export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return round1(sum / values.length);
}

/** true when at least 2 scores and max - min >= DISAGREEMENT_GAP */
export function isDisagreement(scores: readonly number[]): boolean {
  if (scores.length < 2) return false;
  return Math.max(...scores) - Math.min(...scores) >= DISAGREEMENT_GAP;
}

export type DecisionCriterion = {
  id: string;
  name: string;
  category: CriterionCategory;
  priority: CriterionPriority;
  expectedLevel: number;
  /** Live scorecard weight 1-5 */
  weight: number;
  archived: boolean;
  order: number;
};

export type InterviewerCriterionScore = {
  feedbackId: string;
  interviewId: string;
  round: number;
  interviewerId: string;
  interviewerName: string;
  /** 1-5 */
  score: number;
  evidence: string | null;
};

export type CriterionSources = {
  criterionId: string;
  /** 1-5, null = no CV evidence */
  cv: { score: number; evidence: string } | null;
  /** Already on 1-5 */
  test: { score: number; questionCount: number } | null;
  /** Submitted scorecards only */
  interviewers: InterviewerCriterionScore[];
};

export type MustWarning = {
  criterionId: string;
  criterionName: string;
  kind: "no_evidence" | "below_expected";
  value: number | null;
  expectedLevel: number;
};

export type CriterionDecisionRow = {
  criterion: DecisionCriterion;
  cv: number | null;
  test: number | null;
  interviewerMean: number | null;
  /** Mean of the available among cv, test, interviewerMean */
  value: number | null;
  /** value !== null */
  hasEvidence: boolean;
  /** isDisagreement(interviewer scores) */
  disagreement: boolean;
  /** decisionWeights[id] when decided (null if absent), else criterion.weight */
  weight: number | null;
  /** must only: no evidence, or value < expectedLevel */
  warning: MustWarning | null;
};

export type DecisionScore = {
  /** Same order as the criteria input */
  rows: CriterionDecisionRow[];
  /** sum(w*value)/sum(w) over rows with value and weight; null if none */
  overall: number | null;
  warnings: MustWarning[];
  weightsSource: "decision" | "scorecard";
};

function mustWarning(
  criterion: DecisionCriterion,
  value: number | null,
): MustWarning | null {
  if (criterion.priority !== "must") return null;
  if (value === null) {
    return {
      criterionId: criterion.id,
      criterionName: criterion.name,
      kind: "no_evidence",
      value: null,
      expectedLevel: criterion.expectedLevel,
    };
  }
  if (value < criterion.expectedLevel) {
    return {
      criterionId: criterion.id,
      criterionName: criterion.name,
      kind: "below_expected",
      value,
      expectedLevel: criterion.expectedLevel,
    };
  }
  return null;
}

export function computeDecisionScore(params: {
  criteria: readonly DecisionCriterion[];
  sources: readonly CriterionSources[];
  /** Non-null only when the application is decided */
  decisionWeights: DecisionWeights | null;
}): DecisionScore {
  const { criteria, sources, decisionWeights } = params;
  const sourcesById = new Map(sources.map((s) => [s.criterionId, s]));
  const weightsSource: DecisionScore["weightsSource"] =
    decisionWeights !== null ? "decision" : "scorecard";

  const rows: CriterionDecisionRow[] = criteria.map((criterion) => {
    const source = sourcesById.get(criterion.id);
    const cv = source?.cv?.score ?? null;
    const test = source?.test?.score ?? null;
    const interviewerScores = (source?.interviewers ?? []).map((s) => s.score);
    const interviewerMean = mean(interviewerScores);

    const available = [cv, test, interviewerMean].filter(
      (v): v is number => v !== null,
    );
    const value = mean(available);

    const weight =
      decisionWeights !== null
        ? (decisionWeights[criterion.id] ?? null)
        : criterion.weight;

    return {
      criterion,
      cv,
      test,
      interviewerMean,
      value,
      hasEvidence: value !== null,
      disagreement: isDisagreement(interviewerScores),
      weight,
      warning: mustWarning(criterion, value),
    };
  });

  let weightedSum = 0;
  let weightTotal = 0;
  for (const row of rows) {
    if (row.value === null || row.weight === null || row.weight <= 0) continue;
    weightedSum += row.weight * row.value;
    weightTotal += row.weight;
  }
  const overall = weightTotal > 0 ? round1(weightedSum / weightTotal) : null;

  const warnings = rows
    .map((row) => row.warning)
    .filter((w): w is MustWarning => w !== null);

  return { rows, overall, warnings, weightsSource };
}

/** criterionId -> weight of every criterion row */
export function buildDecisionWeights(
  criteria: readonly DecisionCriterion[],
): DecisionWeights {
  return Object.fromEntries(criteria.map((c) => [c.id, c.weight]));
}

/**
 * Test per criterion: mean of answerEvaluations scores (0-10) of answered
 * linked questions, converted with toFivePointScale(v, 10). Ids not in
 * knownCriterionIds are ignored. Empty map when answerEvaluations is null.
 */
export function testScoresByCriterion(params: {
  knownCriterionIds: ReadonlySet<string>;
  links: readonly { questionId: string; criterionIds: readonly string[] }[];
  answerEvaluations: AnswerEvaluations | null;
}): Map<string, { score: number; questionCount: number }> {
  const { knownCriterionIds, links, answerEvaluations } = params;
  const result = new Map<string, { score: number; questionCount: number }>();
  if (answerEvaluations === null) return result;

  const rawScores = new Map<string, number[]>();
  for (const link of links) {
    const entry = answerEvaluations[link.questionId];
    if (!entry) continue;
    for (const criterionId of new Set(link.criterionIds)) {
      if (!knownCriterionIds.has(criterionId)) continue;
      const list = rawScores.get(criterionId) ?? [];
      list.push(entry.score);
      rawScores.set(criterionId, list);
    }
  }

  for (const [criterionId, scores] of rawScores) {
    const rawMean = scores.reduce((acc, v) => acc + v, 0) / scores.length;
    result.set(criterionId, {
      score: toFivePointScale(rawMean, 10),
      questionCount: scores.length,
    });
  }
  return result;
}
