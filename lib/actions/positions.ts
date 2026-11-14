"use server";
import { redirect } from "next/navigation";
import { requireUser } from "../auth-server";
import { getPositionById } from "../data/positions";
import prisma from "../prisma";
import { PositionFormData, positionFormSchema } from "../schemas";
import { invalidatePositionCache } from "../utils/cache-utils";
import { runAction, UserError } from "./run-action";

export async function createPosition(values: PositionFormData) {
  return runAction("createPosition", async () => {
    const user = await requireUser();
    const payload = positionFormSchema.parse(values);

    const position = await prisma.position.create({
      data: {
        title: payload.title,
        description: payload.description?.trim() || null,
        experienceLevel: payload.experienceLevel,
        skills: payload.skills,
        softSkills: payload.softSkills ?? [],
        contractType: payload.contractType?.trim() || null,
        createdBy: user.id,
      },
      select: { id: true },
    });

    invalidatePositionCache(position.id);

    redirect(`/dashboard/positions/${position.id}`);
  });
}

export async function updatePosition(id: string, values: PositionFormData) {
  return runAction("updatePosition", async () => {
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

export async function deletePosition(id: string) {
  return runAction("deletePosition", async () => {
    await requireUser();

    const position = await prisma.position.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!position) {
      throw new UserError("Posizione non trovata");
    }

    await prisma.position.delete({ where: { id } });

    // Pass the id so getPositionById(id) is expired too, and cascade to the
    // quizzes/interviews/evaluations removed by onDelete: Cascade.
    invalidatePositionCache(id, { deleted: true });

    redirect("/dashboard/positions");
  });
}

/**
 * Position details for the public apply form (/recruting), which loads them
 * as the applicant picks positions. Public on purpose: no requireUser().
 */
export async function fetchPositionData(positionId: string) {
  return getPositionById(positionId);
}
