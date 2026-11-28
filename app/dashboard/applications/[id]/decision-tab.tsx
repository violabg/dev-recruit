import { DecisionSummaryCard } from "@/components/applications/decision/decision-summary-card";
import { getViewerId } from "@/lib/auth-server";
import { getApplicationDecision } from "@/lib/data/applications";
import { computeDecisionScore } from "@/lib/utils/decision-score";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Decisione stop body: compact summary of the decision (recorded outcome,
 * overall score with the scorecard weights, must warnings) and the link to the
 * Decision page.
 */
export async function DecisionStopBody({ params }: Props) {
  const { id } = await params;
  const decision = await getApplicationDecision(id);

  if (!decision) {
    return null;
  }

  // Session-dependent view arrangement; the page read the session after a
  // request value first
  const currentUserId = await getViewerId();

  // A participant who still has to submit a scorecard does not see the score
  const scoreHidden =
    !!currentUserId &&
    decision.interviews.some(
      (interview) =>
        interview.participantIds.includes(currentUserId) &&
        !interview.submittedInterviewerIds.includes(currentUserId),
    );

  const score = computeDecisionScore({
    criteria: decision.criteria,
    sources: decision.sources,
    decisionWeights: decision.recorded.decidedAt
      ? decision.recorded.weights
      : null,
  });

  return (
    <DecisionSummaryCard
      applicationId={id}
      recorded={decision.recorded}
      score={score}
      scoreHidden={scoreHidden}
    />
  );
}
