"use server";
import { redirect } from "next/navigation";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import {
  PositionFormData,
  positionFormSchema,
  UpdatePositionStatusInput,
  updatePositionStatusSchema,
} from "../schemas";
import { toActor } from "../services/actor";
import { createPosition } from "../services/positions";
import { invalidatePositionCache } from "../utils/cache-utils";
import { runAction, UserError } from "./run-action";

export async function createPositionAction(values: PositionFormData) {
  return runAction("createPositionAction", async () => {
    const user = await requireUser();
    const { positionId } = await createPosition(toActor(user), values);

    invalidatePositionCache(positionId);

    redirect(`/dashboard/positions/${positionId}`);
  });
}

export async function updatePositionAction(id: string, values: PositionFormData) {
  return runAction("updatePositionAction", async () => {
    await requireUser();
    const payload = positionFormSchema.parse(values);

    const existing = await prisma.position.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new UserError("Posizione non trovata");
    }

    await prisma.position.update({
      where: { id },
      data: {
        title: payload.title,
        description: payload.description?.trim() || null,
        experienceLevel: payload.experienceLevel,
        skills: payload.skills,
        softSkills: payload.softSkills ?? [],
        contractType: payload.contractType?.trim() || null,
      },
    });

    invalidatePositionCache(id);

    redirect(`/dashboard/positions/${id}`);
  });
}

/**
 * Open, close or reopen a position. Every transition is allowed; closing
 * deletes nothing: applications, assessments and evaluations stay.
 */
export async function updatePositionStatusAction(
  input: UpdatePositionStatusInput,
) {
  return runAction("updatePositionStatusAction", async () => {
    await requireUser();
    const { positionId, status } = updatePositionStatusSchema.parse(input);

    const existing = await prisma.position.findUnique({
      where: { id: positionId },
      select: { id: true },
    });

    if (!existing) {
      throw new UserError("Posizione non trovata");
    }

    await prisma.position.update({
      where: { id: positionId },
      data: { status },
    });

    invalidatePositionCache(positionId);

    return { status };
  });
}

export async function deletePositionAction(id: string) {
  return runAction("deletePositionAction", async () => {
    await requireUser();

    const position = await prisma.position.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!position) {
      throw new UserError("Posizione non trovata");
    }

    // A position with applications keeps them: it is closed, never deleted
    const applications = await prisma.application.count({
      where: { positionId: id },
    });

    if (applications > 0) {
      throw new UserError(
        "Impossibile eliminare una posizione con candidature: chiudila",
      );
    }

    await prisma.position.delete({ where: { id } });

    // Pass the id so getPositionById(id) is expired too, and cascade to the
    // quizzes/assessments/evaluations removed by onDelete: Cascade.
    invalidatePositionCache(id, { deleted: true });

    redirect("/dashboard/positions");
  });
}

