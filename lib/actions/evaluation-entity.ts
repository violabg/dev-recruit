"use server";

import { requireUser } from "../auth-server";
import prisma from "../prisma";
import { evaluationNotesSchema, hiringNotesSchema } from "../schemas";
import { invalidateEvaluationCache } from "../utils/cache-utils";
import { runAction, UserError } from "./run-action";

/**
 * Update evaluation notes (manual notes field)
 */
export async function updateEvaluationNotesAction(id: string, notes: string) {
  return runAction("updateEvaluationNotesAction", async () => {
    await requireUser();
    evaluationNotesSchema.parse({ id, notes });

    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
      select: { id: true, assessmentId: true, candidateId: true },
    });

    if (!evaluation) {
      throw new UserError("Valutazione non trovata");
    }

    await prisma.evaluation.update({ where: { id }, data: { notes } });

    invalidateEvaluationCache({
      evaluationId: id,
      assessmentId: evaluation.assessmentId ?? undefined,
      candidateId: evaluation.candidateId ?? undefined,
    });

  });
}

/**
 * Update hiring manager notes on an evaluation
 */
export async function updateHiringManagerNotesAction(input: unknown) {
  return runAction("updateHiringManagerNotesAction", async () => {
    const user = await requireUser();
    const data = hiringNotesSchema.parse(input);

    const evaluation = await prisma.evaluation.findUnique({
      where: { id: data.evaluationId },
      select: { id: true, assessmentId: true, candidateId: true },
    });

    if (!evaluation) {
      throw new UserError("Valutazione non trovata");
    }

    const updated = await prisma.evaluation.update({
      where: { id: data.evaluationId },
      data: {
        interviewNotes: data.interviewNotes,
        redFlags: data.redFlags ?? [],
        standoutMoments: data.standoutMoments ?? [],
        hireRecommendation: data.hireRecommendation,
        nextSteps: data.nextSteps,
        assessedBy: user.id,
        assessedAt: new Date(),
      },
    });

    invalidateEvaluationCache({
      evaluationId: updated.id,
      assessmentId: evaluation.assessmentId ?? undefined,
      candidateId: evaluation.candidateId ?? undefined,
    });

  });
}

/**
 * Delete an evaluation
 */
export async function deleteEvaluationAction(id: string) {
  return runAction("deleteEvaluationAction", async () => {
    await requireUser();

    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
      select: { id: true, assessmentId: true, candidateId: true },
    });

    if (!evaluation) {
      throw new UserError("Valutazione non trovata");
    }

    await prisma.evaluation.delete({ where: { id } });

    invalidateEvaluationCache({
      evaluationId: id,
      assessmentId: evaluation.assessmentId ?? undefined,
      candidateId: evaluation.candidateId ?? undefined,
    });

  });
}
