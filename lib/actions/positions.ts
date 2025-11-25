"use server";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import { PositionFormData, positionFormSchema } from "../schemas";

// Position actions
export async function createPosition(values: PositionFormData) {
  const user = await requireUser();

  const payload = positionFormSchema.parse(values);

  const position = await prisma.position.create({
    data: {
      title: payload.title,
      description: payload.description || null,
      experienceLevel: payload.experienceLevel,
      skills: payload.skills,
      softSkills: payload.softSkills ?? [],
      contractType: payload.contractType ?? null,
      createdBy: user.id,
    },
    select: { id: true },
  });

  updateTag("positions");

  redirect(`/dashboard/positions/${position.id}`);
}

export async function deletePosition(id: string) {
  const position = await prisma.position.findUnique({
    where: { id },
    select: { createdBy: true },
  });

  if (!position) {
    throw new Error("Position not found or you don't have permission");
  }

  await prisma.position.delete({ where: { id } });

  updateTag("positions");

  redirect("/dashboard/positions");
}

export async function updatePosition(id: string, formData: FormData) {
  const user = await requireUser();
  const parseJsonArray = (
    value: FormDataEntryValue | null,
    field: string
  ): string[] => {
    if (!value) {
      return [] as string[];
    }

    if (typeof value !== "string") {
      throw new Error(`Invalid ${field} value`);
    }

    try {
      const parsed = JSON.parse(value);

      if (!Array.isArray(parsed)) {
        throw new Error();
      }

      return parsed as string[];
    } catch {
      throw new Error(`Invalid ${field} format`);
    }
  };

  const rawSkills = formData.get("skills");
  const rawSoftSkills = formData.get("softSkills");

  const payload = positionFormSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    experienceLevel: formData.get("experienceLevel"),
    skills: parseJsonArray(rawSkills, "skills"),
    softSkills: parseJsonArray(rawSoftSkills, "softSkills"),
    contractType:
      (formData.get("contractType") as string | null)?.trim() || undefined,
  });

  await prisma.position.update({
    where: { id },
    data: {
      title: payload.title,
      description: payload.description?.trim() || null,
      experienceLevel: payload.experienceLevel,
      skills: payload.skills,
      softSkills: payload.softSkills ?? [],
      contractType: payload.contractType ?? null,
    },
  });

  updateTag("positions");
  updateTag(`positions-${id}`);

  redirect(`/dashboard/positions/${id}`);
}
