"use server";

import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import {
  challengeDecisionSchema,
  recordApplicationDecisionSchema,
  type ChallengeDecisionInput,
  type RecordApplicationDecisionInput,
} from "@/lib/schemas";
import { generateDecisionChallenge } from "@/lib/services/ai/decision-review";
import {
  loadApplicationDecision,
  recordApplicationDecision,
} from "@/lib/services/application-decisions";
import { invalidateCandidateCache } from "@/lib/utils/cache-utils";
import { computeDecisionScore } from "@/lib/utils/decision-score";
import { runAction, UserError } from "./run-action";

/**
 * Record the decision of an application: outcome, rationale, the session user
 * as decider, the time and the weights used, then advance the stage. No
 * redirect: the client refreshes.
 */
export async function recordApplicationDecisionAction(
  input: RecordApplicationDecisionInput,
) {
  return runAction("recordApplicationDecisionAction", async () => {
    const user = await requireUser();
    const { applicationId, outcome, rationale } =
      recordApplicationDecisionSchema.parse(input);

    const result = await recordApplicationDecision({
      applicationId,
      outcome,
      rationale,
      userId: user.id,
    });

    invalidateCandidateCache({
      candidateId: result.candidateId,
      positionId: result.positionId,
      applicationId: result.applicationId,
    });

    return { stage: result.stage };
  });
}

/**
 * Ask the AI devil's advocate why the selected outcome could be wrong.
 * Read-only: nothing is saved and no cache is invalidated.
 */
export async function challengeDecisionAction(input: ChallengeDecisionInput) {
  return runAction("challengeDecisionAction", async () => {
    await requireUser();
    const { applicationId, outcome, rationale, specificModel } =
      challengeDecisionSchema.parse(input);

    const decision = await loadApplicationDecision(prisma, applicationId);
    if (!decision) {
      throw new UserError("Candidatura non trovata");
    }
    if (decision.criteria.length === 0) {
      throw new UserError("Crea prima la scheda di valutazione della posizione");
    }

    const score = computeDecisionScore({
      criteria: decision.criteria,
      sources: decision.sources,
      // Stored weights only for a decided application
      decisionWeights: decision.recorded.decidedAt
        ? decision.recorded.weights
        : null,
    });

    const challenge = await generateDecisionChallenge({
      decision,
      score,
      outcome,
      rationale,
      specificModel,
    });

    return { challenge };
  });
}
