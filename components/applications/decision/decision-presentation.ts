import { DECISION_OUTCOME_VALUES, type DecisionOutcomeValue } from "@/lib/schemas";
import type { MustWarning } from "@/lib/utils/decision-score";

/**
 * Italian labels and tints of the decision UI, in one place. Only project
 * colour tokens.
 */

export const DECISION_OUTCOME_LABEL: Record<DecisionOutcomeValue, string> = {
  offer: "Offerta",
  hired: "Assunto",
  rejected: "Scartato",
};

export const DECISION_OUTCOME_OPTIONS: {
  value: DecisionOutcomeValue;
  label: string;
}[] = DECISION_OUTCOME_VALUES.map((value) => ({
  value,
  label: DECISION_OUTCOME_LABEL[value],
}));

/** Text of a must-criterion warning */
export function mustWarningText(warning: MustWarning): string {
  return warning.kind === "no_evidence"
    ? `${warning.criterionName}: nessuna prova`
    : `${warning.criterionName}: sotto il livello atteso (${warning.value} su ${warning.expectedLevel})`;
}

/**
 * Tint of a 1-5 score against the expected level: success when reached,
 * warning when at most one point below, destructive when lower, muted when
 * there is no value.
 */
export function scoreTintClass(
  value: number | null,
  expectedLevel: number,
): string {
  if (value === null) return "bg-muted text-muted-foreground";
  if (value >= expectedLevel) return "bg-success/10 text-success";
  if (value >= expectedLevel - 1) return "bg-warning/10 text-warning";
  return "bg-destructive/10 text-destructive";
}
