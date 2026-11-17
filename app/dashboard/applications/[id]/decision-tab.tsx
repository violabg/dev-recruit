import { DecisionSummaryCard } from "@/components/applications/decision/decision-summary-card";
import { getCurrentUser } from "@/lib/auth-server";
import { getApplicationDecision } from "@/lib/data/applications";
import { computeDecisionScore } from "@/lib/utils/decision-score";
import { connection } from "next/server";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Tab Decisione: compact summary of the decision (recorded outcome, overall
 * score with the scorecard weights, must warnings) and the link to the
 * Decision page.
 */
export async function DecisionTab({ params }: Props) {
  const { id } = await params;
  const decision = await getApplicationDecision(id);

  if (!decision) {
    return null;
  }

  // Session-dependent view arrangement: read per request
  await connection();
  const user = await getCurrentUser();

  // A participant who still has to submit a scorecard does not see the score
  const scoreHidden =
    !!user &&
    decision.interviews.some(
      (interview) =>
        interview.participantIds.includes(user.id) &&
        !interview.submittedInterviewerIds.includes(user.id),
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
