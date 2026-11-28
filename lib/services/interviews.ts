/**
 * Interviews
 *
 * Interview writes and rules: loading, status checks, participants, the
 * creation of the interview with its kit snapshot and the all-feedback check.
 * Domain logic only: no Next.js import and no cache call. It throws UserError
 * for expected failures; the callers invalidate the cache.
 */

import type { InterviewGuideDetail } from "@/lib/data/interview-guides";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/prisma/client";
import {
  scheduleInterviewSchema,
  type InterviewParticipantRole,
  type InterviewStatus,
  type ScheduleInterviewInput,
} from "@/lib/schemas";
import { allFeedbackSubmitted } from "@/lib/utils/interview-status";
import { assertActorEnabled, type Actor } from "./actor";
import {
  advanceApplicationStage,
  type DbClient,
  type StageChangeResult,
} from "./applications";
import { DEFAULT_KIT_CHECKLIST, loadGuideForSnapshot } from "./interview-kits";
import { getActiveCriteria } from "./scorecards";
import { UserError } from "./user-error";

/** Stages from which no interview can be scheduled */
const CLOSED_FOR_SCHEDULING = ["rejected", "withdrawn", "hired"] as const;

export type InterviewWithApplication = {
  id: string;
  applicationId: string;
  candidateId: string;
  positionId: string;
  status: InterviewStatus;
  round: number;
};

/** Loads the interview with its application ids or throws UserError('Colloquio non trovato'). */
export async function loadInterview(
  client: DbClient,
  interviewId: string,
): Promise<InterviewWithApplication> {
  const interview = await client.interview.findUnique({
    where: { id: interviewId },
    select: {
      id: true,
      applicationId: true,
      status: true,
      round: true,
      application: { select: { candidateId: true, positionId: true } },
    },
  });

  if (!interview) {
    throw new UserError("Colloquio non trovato");
  }

  return {
    id: interview.id,
    applicationId: interview.applicationId,
    candidateId: interview.application.candidateId,
    positionId: interview.application.positionId,
    status: interview.status,
    round: interview.round,
  };
}

/** Throws UserError unless the status is one of the allowed ones. */
export function assertInterviewStatus(
  interview: { status: InterviewStatus },
  allowed: readonly InterviewStatus[],
  message = "Operazione non consentita nello stato attuale del colloquio",
): void {
  if (!allowed.includes(interview.status)) {
    throw new UserError(message);
  }
}

/** The participant row of userId or UserError('Non partecipi a questo colloquio'). */
export async function requireParticipant(
  client: DbClient,
  interviewId: string,
  userId: string,
): Promise<{ id: string; role: InterviewParticipantRole }> {
  const participant = await client.interviewParticipant.findUnique({
    where: { interviewId_userId: { interviewId, userId } },
    select: { id: true, role: true },
  });

  if (!participant) {
    throw new UserError("Non partecipi a questo colloquio");
  }

  return participant;
}

/** Throws UserError when a userId is not a user of the app. */
export async function assertUsersExist(
  client: DbClient,
  userIds: string[],
): Promise<void> {
  const ids = [...new Set(userIds)];
  const found = await client.user.count({ where: { id: { in: ids } } });

  if (found !== ids.length) {
    throw new UserError("Uno o più partecipanti non sono utenti dell'app");
  }
}

/**
 * Creates the interview (scheduled), its participants and its kit: status
 * draft, default checklist with fresh ids, one KitSection per guide section
 * and one template KitItem per guide question, in their order. Criterion ids
 * are filtered to the ACTIVE criteria of the position: archived and unknown
 * ids are dropped, so an archived criterion never appears on a new kit. The
 * guide is never read again afterwards.
 */
export async function createInterviewWithKit(
  tx: Prisma.TransactionClient,
  input: ScheduleInterviewInput,
  guide: InterviewGuideDetail,
  createdBy: string,
  activeCriterionIds: ReadonlySet<string>,
): Promise<{ interviewId: string; kitId: string }> {
  const interview = await tx.interview.create({
    data: {
      applicationId: input.applicationId,
      guideId: guide.id,
      round: input.round,
      scheduledAt: new Date(input.scheduledAt),
      durationMinutes: input.durationMinutes,
      meetingUrl: input.meetingUrl || null,
      status: "scheduled",
      createdBy,
      participants: {
        create: input.participants.map((participant) => ({
          userId: participant.userId,
          role: participant.role,
        })),
      },
    },
    select: { id: true },
  });

  const kit = await tx.interviewKit.create({
    data: {
      interviewId: interview.id,
      status: "draft",
      checklist: DEFAULT_KIT_CHECKLIST.map((row) => ({
        id: crypto.randomUUID(),
        ...row,
        done: false,
      })),
      briefing: [],
      hypotheses: [],
    },
    select: { id: true },
  });

  for (const [sectionIndex, section] of guide.sections.entries()) {
    const kitSection = await tx.kitSection.create({
      data: {
        kitId: kit.id,
        title: section.title,
        minutes: section.minutes,
        order: sectionIndex,
        kind: section.kind,
      },
      select: { id: true },
    });

    for (const [questionIndex, question] of section.questions.entries()) {
      await tx.kitItem.create({
        data: {
          kitId: kit.id,
          sectionId: kitSection.id,
          text: question.text,
          followUps: question.followUps,
          criterionIds: question.criterionIds.filter((id) =>
            activeCriterionIds.has(id),
          ),
          anchors: question.anchors,
          required: question.required,
          order: questionIndex,
          origin: "template",
          edited: false,
        },
      });
    }
  }

  return { interviewId: interview.id, kitId: kit.id };
}

/**
 * Diff of participants: adds the new ones, updates changed roles, deletes the
 * removed ones unless they already have notes or a scorecard.
 */
export async function syncInterviewParticipants(
  tx: Prisma.TransactionClient,
  interviewId: string,
  participants: { userId: string; role: InterviewParticipantRole }[],
): Promise<void> {
  const existing = await tx.interviewParticipant.findMany({
    where: { interviewId },
    select: { id: true, userId: true, role: true },
  });
  const byUser = new Map(existing.map((row) => [row.userId, row]));
  const wanted = new Set(participants.map((row) => row.userId));

  for (const participant of participants) {
    const stored = byUser.get(participant.userId);
    if (!stored) {
      await tx.interviewParticipant.create({
        data: {
          interviewId,
          userId: participant.userId,
          role: participant.role,
        },
      });
    } else if (stored.role !== participant.role) {
      await tx.interviewParticipant.update({
        where: { id: stored.id },
        data: { role: participant.role },
      });
    }
  }

  for (const stored of existing) {
    if (wanted.has(stored.userId)) continue;

    const notes = await tx.kitItemNote.count({
      where: { participantId: stored.id },
    });
    const feedback = await tx.interviewerFeedback.count({
      where: { interviewId, interviewerId: stored.userId },
    });
    if (notes > 0 || feedback > 0) {
      throw new UserError("Il partecipante ha già note o un feedback");
    }

    await tx.interviewParticipant.delete({ where: { id: stored.id } });
  }
}

/**
 * Reads the application's interviews with participants and submitted
 * scorecards; when every scorecard is in, advances the application with
 * 'all_feedback_submitted' (never backwards, never a closed application).
 */
export async function applyAllFeedbackCheck(
  tx: Prisma.TransactionClient,
  applicationId: string,
): Promise<StageChangeResult | null> {
  const interviews = await tx.interview.findMany({
    where: { applicationId },
    select: {
      status: true,
      participants: { select: { userId: true } },
      feedback: {
        where: { submittedAt: { not: null } },
        select: { interviewerId: true },
      },
    },
  });

  const facts = interviews.map((interview) => ({
    status: interview.status,
    participantIds: interview.participants.map((p) => p.userId),
    submittedInterviewerIds: interview.feedback.map((f) => f.interviewerId),
  }));

  if (!allFeedbackSubmitted(facts)) return null;

  return advanceApplicationStage(tx, applicationId, "all_feedback_submitted");
}

/**
 * Creates the interview, its participants and its kit (draft, snapshot of the
 * guide, default checklist) and advances the stage with 'interview_scheduled'
 * in one transaction, authored by the actor. No email is sent.
 */
export async function scheduleInterview(
  actor: Actor,
  input: ScheduleInterviewInput,
): Promise<{
  interviewId: string;
  applicationId: string;
  candidateId: string;
  positionId: string;
  stage: StageChangeResult | null;
}> {
  await assertActorEnabled(prisma, actor);
  const payload = scheduleInterviewSchema.parse(input);

  const application = await prisma.application.findUnique({
    where: { id: payload.applicationId },
    select: { id: true, stage: true, candidateId: true, positionId: true },
  });

  if (
    !application ||
    (CLOSED_FOR_SCHEDULING as readonly string[]).includes(application.stage)
  ) {
    throw new UserError("Candidatura non trovata o chiusa");
  }

  await assertUsersExist(
    prisma,
    payload.participants.map((participant) => participant.userId),
  );

  const guide = await loadGuideForSnapshot(
    prisma,
    payload.guideId,
    application.positionId,
  );
  const activeCriterionIds = new Set(
    (await getActiveCriteria(application.positionId)).map(
      (criterion) => criterion.id,
    ),
  );

  const { interviewId, stage } = await prisma.$transaction(async (tx) => {
    const created = await createInterviewWithKit(
      tx,
      payload,
      guide,
      actor.userId,
      activeCriterionIds,
    );
    const change = await advanceApplicationStage(
      tx,
      application.id,
      "interview_scheduled",
    );
    return { interviewId: created.interviewId, stage: change };
  });

  return {
    interviewId,
    applicationId: application.id,
    candidateId: application.candidateId,
    positionId: application.positionId,
    stage,
  };
}
