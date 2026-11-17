"use server";

import { requireUser } from "../auth-server";
import prisma from "../prisma";
import { evaluationNotesSchema } from "../schemas";
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
