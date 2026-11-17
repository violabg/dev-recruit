/**
 * Applications
 *
 * Stage writes, the evidence check and the diff of a candidate's positions.
 * Domain logic only: no Next.js import and no cache call. It throws UserError
 * for expected failures; the callers invalidate the cache.
 */

import type { Prisma, PrismaClient } from "@/lib/prisma/client";
import type { ApplicationStage } from "@/lib/schemas";
import {
  advanceStage,
  type DecisionOutcome,
  type StageEvent,
} from "@/lib/utils/application-stage";
import { UserError } from "./user-error";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export type StageChangeResult = {
  applicationId: string;
  candidateId: string;
  positionId: string;
  previousStage: ApplicationStage;
  stage: ApplicationStage;
  changed: boolean;
  /** Assessments set to cancelled because the application became withdrawn */
  cancelledAssessmentIds: string[];
  /** Scheduled interviews set to cancelled because the application became withdrawn */
  cancelledInterviewIds: string[];
};

export type ApplicationSyncResult = {
  createdPositionIds: string[];
  reopenedPositionIds: string[];
  withdrawnPositionIds: string[];
  deletedPositionIds: string[];
  unchangedPositionIds: string[];
  cancelledAssessmentIds: string[];
  cancelledInterviewIds: string[];
  /** Ids of the applications created, reopened or withdrawn */
  touchedApplicationIds: string[];
};

const applicationSelect = {
  id: true,
  candidateId: true,
  positionId: true,
  stage: true,
} as const;

async function loadApplication(client: DbClient, applicationId: string) {
  const application = await client.application.findUnique({
    where: { id: applicationId },
    select: applicationSelect,
  });

  if (!application) {
    throw new UserError("Candidatura non trovata");
  }

  return application;
}

/**
 * Move an application to `stage` (manual or automatic). A real change also
 * updates stageChangedAt; moving to withdrawn cancels the assessments that
 * are not completed and the scheduled interviews (they are never deleted).
 * Completed and in-progress interviews are never touched; rejected cancels
 * nothing.
 */
export async function setApplicationStage(
  client: DbClient,
  applicationId: string,
  stage: ApplicationStage,
): Promise<StageChangeResult> {
  const application = await loadApplication(client, applicationId);

  const base = {
    applicationId: application.id,
    candidateId: application.candidateId,
    positionId: application.positionId,
    previousStage: application.stage,
  };

  if (application.stage === stage) {
    return {
      ...base,
      stage,
      changed: false,
      cancelledAssessmentIds: [],
      cancelledInterviewIds: [],
    };
  }

  await client.application.update({
    where: { id: application.id },
    data: { stage, stageChangedAt: new Date() },
  });

  let cancelledAssessmentIds: string[] = [];
  let cancelledInterviewIds: string[] = [];

  if (stage === "withdrawn") {
    const open = await client.assessment.findMany({
      where: {
        applicationId: application.id,
        status: { in: ["pending", "in_progress"] },
      },
      select: { id: true },
    });
    cancelledAssessmentIds = open.map((assessment) => assessment.id);

    if (cancelledAssessmentIds.length > 0) {
      await client.assessment.updateMany({
        where: { id: { in: cancelledAssessmentIds } },
        data: { status: "cancelled" },
      });
    }

    const scheduled = await client.interview.findMany({
      where: { applicationId: application.id, status: "scheduled" },
      select: { id: true },
    });
    cancelledInterviewIds = scheduled.map((interview) => interview.id);

    if (cancelledInterviewIds.length > 0) {
      await client.interview.updateMany({
        where: { id: { in: cancelledInterviewIds } },
        data: { status: "cancelled" },
      });
    }
  }

  return {
    ...base,
    stage,
    changed: true,
    cancelledAssessmentIds,
    cancelledInterviewIds,
  };
}

/**
 * Apply an automatic event. The stage changes only when the rules move it
 * forward; a closed application is never touched.
 */
export async function advanceApplicationStage(
  client: DbClient,
  applicationId: string,
  event: StageEvent,
  outcome?: DecisionOutcome,
): Promise<StageChangeResult> {
  const application = await loadApplication(client, applicationId);
  const next = advanceStage(application.stage, event, outcome);

  if (next === application.stage) {
    return {
      applicationId: application.id,
      candidateId: application.candidateId,
      positionId: application.positionId,
      previousStage: application.stage,
      stage: application.stage,
      changed: false,
      cancelledAssessmentIds: [],
      cancelledInterviewIds: [],
    };
  }

  return setApplicationStage(client, application.id, next);
}

/**
 * Whether the application holds evidence: an assessment, an interview (any
 * status), or the resume evaluation of the same candidate and position.
 */
export async function applicationHasEvidence(
  client: DbClient,
  application: { id: string; candidateId: string; positionId: string },
): Promise<boolean> {
  const assessments = await client.assessment.count({
    where: { applicationId: application.id },
  });
  if (assessments > 0) return true;

  const interviews = await client.interview.count({
    where: { applicationId: application.id },
  });
  if (interviews > 0) return true;

  const resumeEvaluation = await client.evaluation.findFirst({
    where: {
      candidateId: application.candidateId,
      positionId: application.positionId,
      assessmentId: null,
    },
    select: { id: true },
  });

  return resumeEvaluation !== null;
}

/**
 * Apply the positions selected for a candidate as a diff. Must run inside a
 * transaction: a refused input changes nothing.
 */
export async function syncCandidateApplications(
  tx: Prisma.TransactionClient,
  input: { candidateId: string; positionIds: string[]; ownerId: string | null },
): Promise<ApplicationSyncResult> {
  const selectedIds = [...new Set(input.positionIds)];

  const positions = await tx.position.findMany({
    where: { id: { in: selectedIds } },
    select: { id: true },
  });

  if (positions.length !== selectedIds.length) {
    throw new UserError("Una o più posizioni selezionate non sono valide");
  }

  const applications = await tx.application.findMany({
    where: { candidateId: input.candidateId },
    select: applicationSelect,
  });
  const byPosition = new Map(applications.map((a) => [a.positionId, a]));

  const result: ApplicationSyncResult = {
    createdPositionIds: [],
    reopenedPositionIds: [],
    withdrawnPositionIds: [],
    deletedPositionIds: [],
    unchangedPositionIds: [],
    cancelledAssessmentIds: [],
    cancelledInterviewIds: [],
    touchedApplicationIds: [],
  };

  for (const positionId of selectedIds) {
    const existing = byPosition.get(positionId);

    if (!existing) {
      const created = await tx.application.create({
        data: {
          candidateId: input.candidateId,
          positionId,
          ownerId: input.ownerId,
        },
        select: { id: true },
      });
      result.createdPositionIds.push(positionId);
      result.touchedApplicationIds.push(created.id);
    } else if (existing.stage === "withdrawn") {
      await setApplicationStage(tx, existing.id, "applied");
      result.reopenedPositionIds.push(positionId);
      result.touchedApplicationIds.push(existing.id);
    } else {
      result.unchangedPositionIds.push(positionId);
    }
  }

  const selected = new Set(selectedIds);

  for (const application of applications) {
    if (selected.has(application.positionId)) continue;
    // Already withdrawn and not selected: left as it is
    if (application.stage === "withdrawn") continue;

    if (await applicationHasEvidence(tx, application)) {
      const change = await setApplicationStage(tx, application.id, "withdrawn");
      result.withdrawnPositionIds.push(application.positionId);
      result.touchedApplicationIds.push(application.id);
      result.cancelledAssessmentIds.push(...change.cancelledAssessmentIds);
      result.cancelledInterviewIds.push(...change.cancelledInterviewIds);
    } else {
      await tx.application.delete({ where: { id: application.id } });
      result.deletedPositionIds.push(application.positionId);
    }
  }

  return result;
}
