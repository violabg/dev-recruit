"use server";

import { redirect } from "next/navigation";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import {
  interviewIdSchema,
  rescheduleInterviewSchema,
  type InterviewIdInput,
  type RescheduleInterviewInput,
  type ScheduleInterviewInput,
} from "../schemas";
import { toActor } from "../services/actor";
import { type StageChangeResult } from "../services/applications";
import {
  applyAllFeedbackCheck,
  assertInterviewStatus,
  assertUsersExist,
  loadInterview,
  scheduleInterview,
  syncInterviewParticipants,
} from "../services/interviews";
import {
  invalidateCandidateCache,
  invalidateInterviewCache,
} from "../utils/cache-utils";
import { INTERVIEW_TRANSITIONS } from "../utils/interview-status";
import { runAction } from "./run-action";

/** Refresh the application reads when an interview moved its stage */
function invalidateStageChange(change: StageChangeResult | null) {
  if (!change?.changed) return;
  invalidateCandidateCache({
    candidateId: change.candidateId,
    positionId: change.positionId,
    applicationId: change.applicationId,
  });
}

/**
 * Creates the interview, its participants and its kit (draft, snapshot of the
 * guide, default checklist) and advances the stage with 'interview_scheduled'
 * in one transaction. Redirects to the preparation page of the interview.
 * No email is sent. Any signed-in user may schedule.
 */
export async function scheduleInterviewAction(input: ScheduleInterviewInput) {
  return runAction("scheduleInterviewAction", async () => {
    const user = await requireUser();
    const { interviewId, applicationId, stage } = await scheduleInterview(
      toActor(user),
      input,
    );

    invalidateInterviewCache({ interviewId, applicationId });
    invalidateStageChange(stage);

    redirect(
      // Typed routes: the preparation page is a nested dynamic route
      `/dashboard/applications/${applicationId}/interviews/${interviewId}/prepare?scheduled=1` as never,
    );
  });
}

/**
 * While scheduled: changes date, duration, call link and participants of the
 * same interview and increments its calendar sequence. The kit is kept.
 */
export async function rescheduleInterviewAction(
  input: RescheduleInterviewInput,
) {
  return runAction("rescheduleInterviewAction", async () => {
    await requireUser();
    const payload = rescheduleInterviewSchema.parse(input);

    const interview = await loadInterview(prisma, payload.interviewId);
    assertInterviewStatus(interview, INTERVIEW_TRANSITIONS.reschedule);
    await assertUsersExist(
      prisma,
      payload.participants.map((participant) => participant.userId),
    );

    await prisma.$transaction(async (tx) => {
      await tx.interview.update({
        where: { id: interview.id },
        data: {
          scheduledAt: new Date(payload.scheduledAt),
          durationMinutes: payload.durationMinutes,
          meetingUrl: payload.meetingUrl || null,
          sequence: { increment: 1 },
        },
      });
      await syncInterviewParticipants(tx, interview.id, payload.participants);
    });

    invalidateInterviewCache({
      interviewId: interview.id,
      applicationId: interview.applicationId,
    });

    return { interviewId: interview.id };
  });
}

/** Ends a scheduled interview as cancelled or no-show, then runs the all-feedback check */
async function closeScheduledInterview(
  rawInput: InterviewIdInput,
  status: "cancelled" | "no_show",
) {
  const { interviewId } = interviewIdSchema.parse(rawInput);

  const interview = await loadInterview(prisma, interviewId);
  assertInterviewStatus(
    interview,
    status === "cancelled"
      ? INTERVIEW_TRANSITIONS.cancel
      : INTERVIEW_TRANSITIONS.no_show,
  );

  const change = await prisma.$transaction(async (tx) => {
    await tx.interview.update({
      where: { id: interview.id },
      data: { status },
    });
    return applyAllFeedbackCheck(tx, interview.applicationId);
  });

  invalidateInterviewCache({
    interviewId: interview.id,
    applicationId: interview.applicationId,
  });
  invalidateStageChange(change);

  return { interviewId: interview.id };
}

/** scheduled -> cancelled; then runs the all-feedback check. */
export async function cancelInterviewAction(input: InterviewIdInput) {
  return runAction("cancelInterviewAction", async () => {
    await requireUser();
    return closeScheduledInterview(input, "cancelled");
  });
}

/** scheduled -> no_show; then runs the all-feedback check. */
export async function markInterviewNoShowAction(input: InterviewIdInput) {
  return runAction("markInterviewNoShowAction", async () => {
    await requireUser();
    return closeScheduledInterview(input, "no_show");
  });
}

/** scheduled -> in_progress, startedAt = now. */
export async function startInterviewAction(input: InterviewIdInput) {
  return runAction("startInterviewAction", async () => {
    await requireUser();
    const { interviewId } = interviewIdSchema.parse(input);

    const interview = await loadInterview(prisma, interviewId);
    assertInterviewStatus(interview, INTERVIEW_TRANSITIONS.start);

    const startedAt = new Date();
    await prisma.interview.update({
      where: { id: interview.id },
      data: { status: "in_progress", startedAt },
    });

    invalidateInterviewCache({
      interviewId: interview.id,
      applicationId: interview.applicationId,
    });

    return { interviewId: interview.id, startedAt };
  });
}

/** in_progress -> completed, endedAt = now. */
export async function completeInterviewAction(input: InterviewIdInput) {
  return runAction("completeInterviewAction", async () => {
    await requireUser();
    const { interviewId } = interviewIdSchema.parse(input);

    const interview = await loadInterview(prisma, interviewId);
    assertInterviewStatus(interview, INTERVIEW_TRANSITIONS.complete);

    const endedAt = new Date();
    await prisma.interview.update({
      where: { id: interview.id },
      data: { status: "completed", endedAt },
    });

    invalidateInterviewCache({
      interviewId: interview.id,
      applicationId: interview.applicationId,
    });

    return { interviewId: interview.id, endedAt };
  });
}
