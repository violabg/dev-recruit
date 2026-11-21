"use server";

import { redirect } from "next/navigation";
import { requireUser } from "../auth-server";
import { proposalIdSchema, type ProposalIdInput } from "../schemas";
import { toActor } from "../services/actor";
import {
  confirmInterviewProposal,
  discardInterviewProposal,
} from "../services/interview-proposals";
import {
  invalidateCandidateCache,
  invalidateInterviewCache,
  invalidateInterviewProposalCache,
} from "../utils/cache-utils";
import { runAction } from "./run-action";

/**
 * "Pianifica" on a pending proposal: schedules it like the scheduling form
 * (interview, kit in draft, stage move) and redirects to the preparation
 * page. No email is sent.
 */
export async function scheduleInterviewProposalAction(input: ProposalIdInput) {
  return runAction("scheduleInterviewProposalAction", async () => {
    const user = await requireUser();
    const { proposalId } = proposalIdSchema.parse(input);

    const { interviewId, applicationId, stage } = await confirmInterviewProposal(
      toActor(user),
      proposalId,
    );

    invalidateInterviewCache({ interviewId, applicationId });
    invalidateInterviewProposalCache({ applicationId });
    if (stage?.changed) {
      invalidateCandidateCache({
        candidateId: stage.candidateId,
        positionId: stage.positionId,
        applicationId: stage.applicationId,
      });
    }

    redirect(
      // Typed routes: the preparation page is a nested dynamic route
      `/dashboard/applications/${applicationId}/interviews/${interviewId}/prepare?scheduled=1` as never,
    );
  });
}

/** "Scarta" on a pending proposal: nothing is scheduled. */
export async function discardInterviewProposalAction(input: ProposalIdInput) {
  return runAction("discardInterviewProposalAction", async () => {
    const user = await requireUser();
    const { proposalId } = proposalIdSchema.parse(input);

    const { applicationId } = await discardInterviewProposal(toActor(user), proposalId);
    invalidateInterviewProposalCache({ applicationId });

    return { applicationId };
  });
}
