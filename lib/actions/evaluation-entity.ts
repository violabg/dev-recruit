"use server";

import { requireUser } from "../auth-server";
import prisma from "../prisma";
import { evaluationNotesSchema, hiringNotesSchema } from "../schemas";
import { invalidateEvaluationCache } from "../utils/cache-utils";
import { runAction, UserError } from "./run-action";

/**
 * Update evaluation notes (manual notes field)
 */
export async function updateEvaluationNotes(id: string, notes: string) {
  return runAction("updateEvaluationNotes", async () => {
    await requireUser();
    evaluationNotesSchema.parse({ id, notes });

    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
      select: { id: true, interviewId: true, candidateId: true },
    });

    if (!evaluation) {
      throw new UserError("Valutazione non trovata");
    }

    await prisma.evaluation.update({ where: { id }, data: { notes } });

    invalidateEvaluationCache({
      evaluationId: id,
      interviewId: evaluation.interviewId ?? undefined,
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
      select: { id: true, interviewId: true, candidateId: true },
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
      interviewId: evaluation.interviewId ?? undefined,
      candidateId: evaluation.candidateId ?? undefined,
    });

  });
}

/**
 * Delete an evaluation
 */
export async function deleteEvaluation(id: string) {
  return runAction("deleteEvaluation", async () => {
    await requireUser();

    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
      select: { id: true, interviewId: true, candidateId: true },
    });

    if (!evaluation) {
      throw new UserError("Valutazione non trovata");
    }

    await prisma.evaluation.delete({ where: { id } });

    invalidateEvaluationCache({
      evaluationId: id,
      interviewId: evaluation.interviewId ?? undefined,
      candidateId: evaluation.candidateId ?? undefined,
    });

  });
}
