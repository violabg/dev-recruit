/**
 * AI devil's advocate on a hiring decision: reasons why the selected outcome
 * could be wrong, from per-criterion statistics only.
 *
 * Read-only: it never touches the database or the cache, and nothing is
 * stored.
 */

import {
  aiDecisionChallengeSchema,
  type DecisionChallenge,
  type DecisionOutcomeValue,
} from "../../schemas";
import {
  buildCriterionKeys,
  resolveCriterionKeys,
} from "../../utils/criterion-keys";
import type { DecisionScore } from "../../utils/decision-score";
import type { ApplicationDecision } from "../application-decisions";
import { generateStructured } from "./generate";
import {
  buildDecisionReviewPrompt,
  buildDecisionReviewSystemPrompt,
} from "./prompts";

export const MAX_CHALLENGE_REASONS = 5;

export async function generateDecisionChallenge({
  decision,
  score,
  outcome,
  rationale,
  specificModel,
}: {
  decision: ApplicationDecision;
  score: DecisionScore;
  outcome: DecisionOutcomeValue;
  rationale?: string;
  specificModel?: string;
}): Promise<DecisionChallenge> {
  // Criteria are listed to the AI by key, never by id
  const keyed = buildCriterionKeys(
    score.rows.map((row) => ({ id: row.criterion.id })),
  );
  const sourcesById = new Map(
    decision.sources.map((source) => [source.criterionId, source]),
  );

  const rows = score.rows.map((row, index) => ({
    key: keyed[index].key,
    row,
    interviewerCount:
      sourcesById.get(row.criterion.id)?.interviewers.length ?? 0,
  }));

  const output = await generateStructured({
    task: "decision_review",
    schema: aiDecisionChallengeSchema,
    system: buildDecisionReviewSystemPrompt(),
    prompt: buildDecisionReviewPrompt({
      positionTitle: decision.position.title,
      outcome,
      rationale,
      rows,
      globals: {
        cv: decision.cv?.global ?? null,
        test: decision.test?.global ?? null,
      },
      overall: score.overall,
    }),
    specificModel,
    temperature: 0.7,
  });

  const reasons = output.reasons
    .map((reason) => ({
      title: reason.title.trim(),
      explanation: reason.explanation.trim(),
      criterionIds: resolveCriterionKeys(keyed, reason.criterionKeys),
    }))
    .filter((reason) => reason.title.length > 0)
    .slice(0, MAX_CHALLENGE_REASONS);

  return { reasons };
}
