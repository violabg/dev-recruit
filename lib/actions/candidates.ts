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
import {
  deleteResumeFromR2,
  uploadResumeToR2,
  validateResumeFile,
} from "../services/r2-storage";

const readFormValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
};

const getCandidateById = async (id: string) => {
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: { positionId: true, resumeUrl: true },
  });

  if (!candidate) {
    throw new Error("Candidate not found");
  }

  return candidate;
};

// Candidate actions
export async function createCandidate(formData: FormData) {
  const user = await requireUser();

  const dateOfBirthRaw = readFormValue(formData, "dateOfBirth");

  const payload: CandidateFormData = candidateFormSchema.parse({
    firstName: readFormValue(formData, "firstName"),
    lastName: readFormValue(formData, "lastName"),
    email: readFormValue(formData, "email"),
    positionId: readFormValue(formData, "positionId"),
    dateOfBirth: dateOfBirthRaw ? new Date(dateOfBirthRaw) : undefined,
  });

  const position = await prisma.position.findUnique({
    where: { id: payload.positionId },
    select: { id: true },
  });

  if (!position) {
    throw new Error("Seleziona una posizione valida");
  }

  // Create candidate first to get ID for file naming
  const candidate = await prisma.candidate.create({
    data: {
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email: payload.email.trim(),
      dateOfBirth: payload.dateOfBirth ?? null,
      positionId: position.id,
      status: "pending",
      createdBy: user.id,
    },
    select: { id: true, positionId: true },
  });

  // Handle file upload if present
  const resumeFile = formData.get("resumeFile");
  if (resumeFile instanceof File && resumeFile.size > 0) {
    const validation = validateResumeFile(resumeFile);
    if (!validation.valid) {
      // Delete the candidate if file validation fails
      await prisma.candidate.delete({ where: { id: candidate.id } });
      throw new Error(validation.error || "File non valido");
    }

    try {
      const resumeUrl = await uploadResumeToR2(resumeFile, candidate.id);
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { resumeUrl },
      });
    } catch (uploadError) {
      console.error("Failed to upload resume:", uploadError);
      // Don't fail the entire operation, just log the error
      // The candidate is created without the resume
    }
  }

  revalidatePath(`/dashboard/positions/${candidate.positionId}`);
  revalidatePath("/dashboard/candidates");
  updateTag("candidates");
  updateTag(`positions-${candidate.positionId}`);

  return { success: true as const, candidateId: candidate.id };
}

export async function updateCandidate(
  id: string,
  formData: FormData
): Promise<{ success: boolean }> {
  const user = await requireUser();

  const dateOfBirthRaw = readFormValue(formData, "dateOfBirth");
  const removeResume = readFormValue(formData, "removeResume") === "true";

  const rawPayload = {
    firstName: readFormValue(formData, "firstName"),
    lastName: readFormValue(formData, "lastName"),
    email: readFormValue(formData, "email"),
    positionId: readFormValue(formData, "positionId"),
    status: readFormValue(formData, "status"),
    dateOfBirth: dateOfBirthRaw ? new Date(dateOfBirthRaw) : undefined,
    removeResume,
  };

  const payload: CandidateUpdateData = candidateUpdateSchema.parse(rawPayload);

  const candidate = await getCandidateById(id);
  const positionsToInvalidate = new Set<string>();
  if (candidate.positionId) {
    positionsToInvalidate.add(candidate.positionId);
  }

  const updateData: Prisma.CandidateUpdateInput = {};
  let newPositionId: string | undefined;

  if (payload.firstName) {
    updateData.firstName = payload.firstName.trim();
  }

  if (payload.lastName) {
    updateData.lastName = payload.lastName.trim();
  }

  if (payload.email) {
    updateData.email = payload.email.trim();
  }

  if (payload.status) {
    updateData.status = payload.status;
  }

  if (payload.dateOfBirth !== undefined) {
    updateData.dateOfBirth = payload.dateOfBirth ?? null;
  }

  if (payload.positionId) {
    const position = await prisma.position.findUnique({
      where: { id: payload.positionId },
      select: { id: true },
    });

    if (!position) {
      throw new Error("Seleziona una posizione valida");
    }

    updateData.position = {
      connect: { id: position.id },
    };
    newPositionId = position.id;
    positionsToInvalidate.add(position.id);
  }

  // Handle resume file upload or removal
  const resumeFile = formData.get("resumeFile");
  const hasNewFile = resumeFile instanceof File && resumeFile.size > 0;

  if (hasNewFile) {
    const validation = validateResumeFile(resumeFile);
    if (!validation.valid) {
      throw new Error(validation.error || "File non valido");
    }

    // Delete old file if exists
    if (candidate.resumeUrl) {
      try {
        await deleteResumeFromR2(candidate.resumeUrl);
      } catch (deleteError) {
        console.error("Failed to delete old resume:", deleteError);
        // Continue anyway
      }
    }

    // Upload new file
    try {
      const resumeUrl = await uploadResumeToR2(resumeFile, id);
      updateData.resumeUrl = resumeUrl;
    } catch (uploadError) {
      console.error("Failed to upload resume:", uploadError);
      throw new Error("Errore durante il caricamento del curriculum");
    }
  } else if (removeResume && candidate.resumeUrl) {
    // User wants to remove existing resume without uploading a new one
    try {
      await deleteResumeFromR2(candidate.resumeUrl);
    } catch (deleteError) {
      console.error("Failed to delete resume:", deleteError);
      // Continue anyway
    }
    updateData.resumeUrl = null;
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
  for (const positionId of positionsToInvalidate) {
    updateTag(`positions-${positionId}`);
  }

  return { success: true };
}

// Delete candidate
export async function deleteCandidate(id: string) {
  const user = await requireUser();

  const candidate = await getCandidateById(id);

  // Delete resume file if exists
  if (candidate.resumeUrl) {
    try {
      await deleteResumeFromR2(candidate.resumeUrl);
    } catch (deleteError) {
      console.error("Failed to delete resume:", deleteError);
      // Continue with candidate deletion anyway
    }
  }

  await prisma.candidate.delete({ where: { id } });

  if (candidate.positionId) {
    revalidatePath(`/dashboard/positions/${candidate.positionId}`);
    updateTag(`positions-${candidate.positionId}`);
  }
  revalidatePath("/dashboard/candidates");
  updateTag("candidates");

  redirect("/dashboard/candidates");
}
