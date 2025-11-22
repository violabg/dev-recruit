"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import { Prisma } from "../prisma/client";
import {
  CandidateFormData,
  CandidateUpdateData,
  candidateFormSchema,
  candidateUpdateSchema,
} from "../schemas";

const readFormValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
};

const sanitizeResumeUrl = (value?: string | null) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value.trim() === "") {
    return null;
  }

  return value.trim();
};

const ensureCandidateOwnership = async (
  candidateId: string,
  userId: string
) => {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { createdBy: true, positionId: true },
  });

  if (!candidate || candidate.createdBy !== userId) {
    throw new Error("Candidate not found or you don't have permission");
  }

  return candidate;
};

// Candidate actions
export async function createCandidate(formData: FormData) {
  const user = await requireUser();

  const payload: CandidateFormData = candidateFormSchema.parse({
    name: readFormValue(formData, "name"),
    email: readFormValue(formData, "email"),
    position_id: readFormValue(formData, "position_id"),
  });

  const position = await prisma.position.findUnique({
    where: { id: payload.position_id },
    select: { id: true, createdBy: true },
  });

  if (!position || position.createdBy !== user.id) {
    throw new Error("Seleziona una posizione valida");
  }

  const candidate = await prisma.candidate.create({
    data: {
      name: payload.name.trim(),
      email: payload.email.trim(),
      positionId: position.id,
      status: "pending",
      createdBy: user.id,
    },
    select: { id: true, positionId: true },
  });

  revalidatePath(`/dashboard/positions/${candidate.positionId}`);
  revalidatePath("/dashboard/candidates");
  updateTag("candidates");

  return { success: true as const, candidateId: candidate.id };
}

export async function updateCandidate(
  id: string,
  formData: FormData
): Promise<{ success: boolean }> {
  const user = await requireUser();

  const rawPayload = {
    name: readFormValue(formData, "name"),
    email: readFormValue(formData, "email"),
    position_id: readFormValue(formData, "position_id"),
    status: readFormValue(formData, "status"),
    resume_url: readFormValue(formData, "resume_url"),
  };

  const payload: CandidateUpdateData = candidateUpdateSchema.parse(rawPayload);

  const candidate = await ensureCandidateOwnership(id, user.id);

  const updateData: Prisma.CandidateUpdateInput = {};
  let newPositionId: string | undefined;

  if (payload.name) {
    updateData.name = payload.name.trim();
  }

  if (payload.email) {
    updateData.email = payload.email.trim();
  }

  if (payload.status) {
    updateData.status = payload.status;
  }

  if (payload.resume_url !== undefined) {
    updateData.resumeUrl = sanitizeResumeUrl(payload.resume_url);
  }

  if (payload.position_id) {
    const position = await prisma.position.findUnique({
      where: { id: payload.position_id },
      select: { id: true, createdBy: true },
    });

    if (!position || position.createdBy !== user.id) {
      throw new Error("Seleziona una posizione valida");
    }

    updateData.position = {
      connect: { id: position.id },
    };
    newPositionId = position.id;
  }

  if (Object.keys(updateData).length === 0) {
    return { success: false };
  }

  await prisma.candidate.update({
    where: { id },
    data: updateData,
  });

  if (newPositionId || candidate.positionId) {
    const positionToRefresh = newPositionId ?? candidate.positionId;
    revalidatePath(`/dashboard/positions/${positionToRefresh}`);
  }

  updateTag("candidates");

  return { success: true };
}

// Delete candidate
export async function deleteCandidate(id: string) {
  const user = await requireUser();

  const candidate = await ensureCandidateOwnership(id, user.id);

  await prisma.candidate.delete({ where: { id } });

  if (candidate.positionId) {
    revalidatePath(`/dashboard/positions/${candidate.positionId}`);
  }
  revalidatePath("/dashboard/candidates");
  updateTag("candidates");

  redirect("/dashboard/candidates");
}
