"use server";

import { requireUser } from "../auth-server";
import prisma from "../prisma";
import {
  applicationOwnerSchema,
  moveApplicationStageSchema,
  type ApplicationOwnerInput,
  type MoveApplicationStageInput,
} from "../schemas";
import { setApplicationStage } from "../services/applications";
import {
  invalidateAssessmentCache,
  invalidateCandidateCache,
  invalidateInterviewCache,
} from "../utils/cache-utils";
import { runAction, UserError } from "./run-action";

/**
 * Move an application by hand: any stage to any stage, including reopening a
 * rejected or withdrawn application. Any signed-in user may do it.
 */
export async function moveApplicationStageAction(
  input: MoveApplicationStageInput,
) {
  return runAction("moveApplicationStageAction", async () => {
    await requireUser();
    const { applicationId, stage } = moveApplicationStageSchema.parse(input);

    const result = await setApplicationStage(prisma, applicationId, stage);

    // Same stage: nothing was written, nothing to refresh
    if (result.changed) {
      invalidateCandidateCache({
        candidateId: result.candidateId,
        positionId: result.positionId,
        applicationId: result.applicationId,
      });

      if (result.cancelledAssessmentIds.length > 0) {
        invalidateAssessmentCache();
      }

      if (result.cancelledInterviewIds.length > 0) {
        invalidateInterviewCache({ applicationId: result.applicationId });
      }
    }

    return { stage: result.stage, changed: result.changed };
  });
}

/**
 * Take the application ("me") or release it ("none"). The owner never limits
 * who can open or edit the application.
 */
export async function setApplicationOwnerAction(input: ApplicationOwnerInput) {
  return runAction("setApplicationOwnerAction", async () => {
    const user = await requireUser();
    const { applicationId, owner } = applicationOwnerSchema.parse(input);

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true, candidateId: true, positionId: true },
    });

    if (!application) {
      throw new UserError("Candidatura non trovata");
    }

    const ownerId = owner === "me" ? user.id : null;

    await prisma.application.update({
      where: { id: application.id },
      data: { ownerId },
    });

    invalidateCandidateCache({
      candidateId: application.candidateId,
      positionId: application.positionId,
      applicationId: application.id,
    });

    return { ownerId };
  });
}
