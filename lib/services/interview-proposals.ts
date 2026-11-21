/**
 * Interview proposals
 *
 * A slot proposed through MCP: the full scheduling payload, stored pending
 * until a person confirms it. Confirming runs the normal scheduling path
 * (`scheduleInterview`). Domain logic only: no Next.js import and no cache
 * call; the callers invalidate the cache.
 */

import prisma from "@/lib/prisma";
import {
  scheduleInterviewSchema,
  type ScheduleInterviewInput,
} from "@/lib/schemas";
import { assertActorEnabled, type Actor } from "./actor";
import type { StageChangeResult } from "./applications";
import { loadGuideForSnapshot } from "./interview-kits";
import { assertUsersExist, scheduleInterview } from "./interviews";
import { UserError } from "./user-error";

/** Stages from which no interview can be proposed (same as scheduling) */
const CLOSED_FOR_SCHEDULING = ["rejected", "withdrawn", "hired"];

const NOT_FOUND = "Proposta non trovata o già gestita";

export interface PendingProposal {
  id: string;
  applicationId: string;
  payload: ScheduleInterviewInput;
  createdAt: Date;
  createdBy: string;
}

/**
 * Validates a slot like the scheduling form does (open application, guide of
 * the position, existing participants, one lead) and stores it pending.
 * Nothing is scheduled and nobody is notified.
 */
export async function proposeInterviewSlot(
  actor: Actor,
  input: ScheduleInterviewInput,
): Promise<{ proposalId: string; applicationId: string }> {
  await assertActorEnabled(prisma, actor);
  const payload = scheduleInterviewSchema.parse(input);

  const application = await prisma.application.findUnique({
    where: { id: payload.applicationId },
    select: { id: true, stage: true, positionId: true },
  });
  if (!application || CLOSED_FOR_SCHEDULING.includes(application.stage)) {
    throw new UserError("Candidatura non trovata o chiusa");
  }

  await assertUsersExist(
    prisma,
    payload.participants.map((participant) => participant.userId),
  );
  await loadGuideForSnapshot(prisma, payload.guideId, application.positionId);

  const proposal = await prisma.interviewProposal.create({
    data: {
      applicationId: application.id,
      payload,
      createdBy: actor.userId,
    },
    select: { id: true },
  });

  return { proposalId: proposal.id, applicationId: application.id };
}

/** Pending proposals of an application, oldest first. */
export async function listPendingProposals(
  applicationId: string,
): Promise<PendingProposal[]> {
  const rows = await prisma.interviewProposal.findMany({
    where: { applicationId, status: "pending" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      applicationId: true,
      payload: true,
      createdAt: true,
      createdBy: true,
    },
  });

  // A payload that no longer parses (schema change) is left out
  return rows.flatMap((row) => {
    const parsed = scheduleInterviewSchema.safeParse(row.payload);
    return parsed.success ? [{ ...row, payload: parsed.data }] : [];
  });
}

/**
 * Schedules a pending proposal through `scheduleInterview`. The proposal is
 * claimed first, so a double confirmation schedules once; if scheduling
 * fails the claim is released and the proposal stays pending.
 */
export async function confirmInterviewProposal(
  actor: Actor,
  proposalId: string,
): Promise<{
  interviewId: string;
  applicationId: string;
  stage: StageChangeResult | null;
}> {
  await assertActorEnabled(prisma, actor);

  const proposal = await prisma.interviewProposal.findUnique({
    where: { id: proposalId },
    select: { status: true, payload: true },
  });
  if (!proposal || proposal.status !== "pending") throw new UserError(NOT_FOUND);

  const parsed = scheduleInterviewSchema.safeParse(proposal.payload);
  if (!parsed.success) {
    throw new UserError("La proposta non è più valida: pianifica dalla dashboard");
  }

  const claimed = await prisma.interviewProposal.updateMany({
    where: { id: proposalId, status: "pending" },
    data: { status: "scheduled", handledAt: new Date(), handledBy: actor.userId },
  });
  if (claimed.count === 0) throw new UserError(NOT_FOUND);

  try {
    const result = await scheduleInterview(actor, parsed.data);
    await prisma.interviewProposal.update({
      where: { id: proposalId },
      data: { interviewId: result.interviewId },
    });
    return {
      interviewId: result.interviewId,
      applicationId: result.applicationId,
      stage: result.stage,
    };
  } catch (error) {
    await prisma.interviewProposal.update({
      where: { id: proposalId },
      data: { status: "pending", handledAt: null, handledBy: null },
    });
    throw error;
  }
}
