"use server";

import { requireUser } from "../auth-server";
import prisma from "../prisma";
import type { Prisma } from "../prisma/client";
import {
  saveInterviewerFeedbackSchema,
  submitInterviewerFeedbackSchema,
  type InterviewerFeedbackFormData,
  type SaveInterviewerFeedbackInput,
} from "../schemas";
import {
  assertInterviewStatus,
  type InterviewWithApplication,
  loadInterview,
  requireParticipant,
  applyAllFeedbackCheck,
} from "../services/interviews";
import {
  invalidateCandidateCache,
  invalidateInterviewCache,
} from "../utils/cache-utils";
import { runAction, UserError } from "./run-action";

/** A draft can be saved unless the interview was cancelled or no-show */
const FEEDBACK_EDITABLE = ["scheduled", "in_progress", "completed"] as const;
const SUBMIT_ALLOWED = ["completed"] as const;

/**
 * Upserts the scorecard of userId on the interview and replaces its
 * criterion scores (only scored criteria are stored). A submitted scorecard
 * is read-only for everybody, author included.
 */
async function persistFeedback(
  tx: Prisma.TransactionClient,
  interview: InterviewWithApplication,
  userId: string,
  data: InterviewerFeedbackFormData,
): Promise<{ id: string }> {
  const existing = await tx.interviewerFeedback.findUnique({
    where: {
      interviewId_interviewerId: {
        interviewId: interview.id,
        interviewerId: userId,
      },
    },
    select: { id: true, submittedAt: true },
  });
  if (existing?.submittedAt) {
    throw new UserError("La scheda è già stata inviata");
  }

  const scored = data.scores.filter((row) => row.score !== null);

  // Active criteria of the position, or archived ones cited by the kit
  if (scored.length > 0) {
    const criteria = await tx.scorecardCriterion.findMany({
      where: { scorecard: { positionId: interview.positionId } },
      select: { id: true, archivedAt: true },
    });
    const kitItems = await tx.kitItem.findMany({
      where: { kit: { interviewId: interview.id } },
      select: { criterionIds: true },
    });
    const citedByKit = new Set(kitItems.flatMap((item) => item.criterionIds));
    const allowed = new Set(
      criteria
        .filter(
          (criterion) =>
            criterion.archivedAt === null || citedByKit.has(criterion.id),
        )
        .map((criterion) => criterion.id),
    );
    if (scored.some((row) => !allowed.has(row.criterionId))) {
      throw new UserError(
        "Uno o più criteri selezionati non appartengono alla scheda della posizione",
      );
    }
  }

  const fields = {
    hireRecommendation: data.hireRecommendation,
    notes: data.notes ?? null,
    redFlags: data.redFlags,
    standoutMoments: data.standoutMoments,
  };

  const feedback = await tx.interviewerFeedback.upsert({
    where: {
      interviewId_interviewerId: {
        interviewId: interview.id,
        interviewerId: userId,
      },
    },
    create: { interviewId: interview.id, interviewerId: userId, ...fields },
    update: fields,
    select: { id: true },
  });

  await tx.criterionScore.deleteMany({ where: { feedbackId: feedback.id } });
  if (scored.length > 0) {
    await tx.criterionScore.createMany({
      data: scored.map((row) => ({
        feedbackId: feedback.id,
        criterionId: row.criterionId,
        score: row.score as number,
        evidence: row.evidence ?? null,
      })),
    });
  }

  return feedback;
}

/**
 * Saves the draft scorecard of the signed-in participant (not submitted,
 * visible only to its author).
 */
export async function saveInterviewerFeedbackAction(
  input: SaveInterviewerFeedbackInput,
) {
  return runAction("saveInterviewerFeedbackAction", async () => {
    const user = await requireUser();
    const { interviewId, ...data } = saveInterviewerFeedbackSchema.parse(input);

    const interview = await loadInterview(prisma, interviewId);
    await requireParticipant(prisma, interview.id, user.id);
    assertInterviewStatus(interview, FEEDBACK_EDITABLE);

    const feedback = await prisma.$transaction((tx) =>
      persistFeedback(tx, interview, user.id, data),
    );

    invalidateInterviewCache({
      interviewId: interview.id,
      applicationId: interview.applicationId,
    });

    return { feedbackId: feedback.id };
  });
}

/**
 * Saves and submits the scorecard of the signed-in participant: from now on
 * it is read-only for everybody and visible to every signed-in user. When
 * every scorecard of the application's interviews is in, the application
 * moves to Decisione.
 */
export async function submitInterviewerFeedbackAction(
  input: SaveInterviewerFeedbackInput,
) {
  return runAction("submitInterviewerFeedbackAction", async () => {
    const user = await requireUser();
    const { interviewId, ...data } =
      submitInterviewerFeedbackSchema.parse(input);

    const interview = await loadInterview(prisma, interviewId);
    await requireParticipant(prisma, interview.id, user.id);
    assertInterviewStatus(
      interview,
      SUBMIT_ALLOWED,
      "Puoi inviare la scheda solo a colloquio concluso",
    );

    const { feedbackId, stage } = await prisma.$transaction(async (tx) => {
      const feedback = await persistFeedback(tx, interview, user.id, data);
      await tx.interviewerFeedback.update({
        where: { id: feedback.id },
        data: { submittedAt: new Date() },
      });
      const change = await applyAllFeedbackCheck(tx, interview.applicationId);
      return { feedbackId: feedback.id, stage: change };
    });

    invalidateInterviewCache({
      interviewId: interview.id,
      applicationId: interview.applicationId,
    });

    const stageChanged = stage?.changed ?? false;
    if (stage && stageChanged) {
      invalidateCandidateCache({
        candidateId: stage.candidateId,
        positionId: stage.positionId,
        applicationId: stage.applicationId,
      });
    }

    return { feedbackId, stageChanged };
  });
}
