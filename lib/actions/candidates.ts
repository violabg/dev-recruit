"use server";

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
import { storageLogger } from "../services/logger";
import {
  deleteResumeFromR2,
  uploadResumeToR2,
  validateResumeFile,
} from "../services/r2-storage";
import {
  invalidateCandidateCache,
  invalidateInterviewCache,
} from "../utils/cache-utils";

const readFormValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
};

const getCandidateById = async (id: string) => {
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: {
      resumeUrl: true,
      positions: {
        select: {
          positionId: true,
          isPrimary: true,
        },
      },
    },
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
  const positionIdsRaw = readFormValue(formData, "positionIds");

  const payload: CandidateFormData = candidateFormSchema.parse({
    firstName: readFormValue(formData, "firstName"),
    lastName: readFormValue(formData, "lastName"),
    email: readFormValue(formData, "email"),
    positionIds: positionIdsRaw ? JSON.parse(positionIdsRaw) : [],
    dateOfBirth: dateOfBirthRaw ? new Date(dateOfBirthRaw) : undefined,
  });

  // Validate all positions exist
  const positions = await prisma.position.findMany({
    where: { id: { in: payload.positionIds } },
    select: { id: true },
  });

  if (positions.length !== payload.positionIds.length) {
    throw new Error("Una o più posizioni selezionate non sono valide");
  }

  // Create candidate first to get ID for file naming
  const candidate = await prisma.candidate.create({
    data: {
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email: payload.email.trim(),
      dateOfBirth: payload.dateOfBirth ?? null,
      status: "pending",
      createdBy: user.id,
      positions: {
        create: payload.positionIds.map((positionId, index) => ({
          positionId,
          isPrimary: index === 0, // First position is primary
        })),
      },
    },
    select: {
      id: true,
      positions: {
        select: { positionId: true },
      },
    },
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
      storageLogger.error("Failed to upload resume during candidate creation", {
        error: uploadError,
        candidateId: candidate.id,
      });
      // Don't fail the entire operation, just log the error
      // The candidate is created without the resume
    }
  }

  invalidateCandidateCache({
    candidateId: candidate.id,
    positionIds: candidate.positions.map((p) => p.positionId),
  });

  return { success: true as const, candidateId: candidate.id };
}

export async function updateCandidate(
  id: string,
  formData: FormData
): Promise<{ success: boolean }> {
  const user = await requireUser();

  const dateOfBirthRaw = readFormValue(formData, "dateOfBirth");
  const removeResume = readFormValue(formData, "removeResume") === "true";
  const positionIdsRaw = readFormValue(formData, "positionIds");

  const rawPayload = {
    firstName: readFormValue(formData, "firstName"),
    lastName: readFormValue(formData, "lastName"),
    email: readFormValue(formData, "email"),
    positionIds: positionIdsRaw ? JSON.parse(positionIdsRaw) : undefined,
    status: readFormValue(formData, "status"),
    dateOfBirth: dateOfBirthRaw ? new Date(dateOfBirthRaw) : undefined,
    removeResume,
  };

  const payload: CandidateUpdateData = candidateUpdateSchema.parse(rawPayload);

  const candidate = await getCandidateById(id);
  const existingPositionIds = new Set<string>();

  // Collect existing position IDs for cache invalidation and comparison
  for (const pos of candidate.positions) {
    existingPositionIds.add(pos.positionId);
  }

  const updateData: Prisma.CandidateUpdateInput = {};

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

  if (payload.positionIds) {
    // Validate all positions exist
    const positions = await prisma.position.findMany({
      where: { id: { in: payload.positionIds } },
      select: { id: true },
    });

    if (positions.length !== payload.positionIds.length) {
      throw new Error("Una o più posizioni selezionate non sono valide");
    }

    // Determine which positions are being removed
    const newPositionIds = new Set(payload.positionIds);
    const removedPositionIds = Array.from(existingPositionIds).filter(
      (posId) => !newPositionIds.has(posId)
    );

    // Delete non-completed interviews for removed positions
    if (removedPositionIds.length > 0) {
      try {
        await prisma.interview.deleteMany({
          where: {
            candidateId: id,
            quiz: {
              positionId: { in: removedPositionIds },
            },
            status: { notIn: ["completed"] },
          },
        });
        // Invalidate interview cache since we deleted interviews
        invalidateInterviewCache();
      } catch (deleteError) {
        storageLogger.error(
          "Failed to delete interviews for removed positions",
          {
            error: deleteError,
            candidateId: id,
            removedPositionIds,
          }
        );
        // Continue with update anyway
      }
    }

    // Delete existing position relationships and create new ones
    updateData.positions = {
      deleteMany: {},
      create: payload.positionIds.map((positionId, index) => ({
        positionId,
        isPrimary: index === 0, // First position is primary
      })),
    };

    // Add new positions to existing set for cache invalidation
    for (const positionId of payload.positionIds) {
      existingPositionIds.add(positionId);
    }
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
        storageLogger.error("Failed to delete old resume", {
          error: deleteError,
          candidateId: id,
        });
        // Continue anyway
      }
    }

    // Upload new file
    try {
      const resumeUrl = await uploadResumeToR2(resumeFile, id);
      updateData.resumeUrl = resumeUrl;
    } catch (uploadError) {
      storageLogger.error("Failed to upload resume during candidate update", {
        error: uploadError,
        candidateId: id,
      });
      throw new Error("Errore durante il caricamento del curriculum");
    }
  } else if (removeResume && candidate.resumeUrl) {
    // User wants to remove existing resume without uploading a new one
    try {
      await deleteResumeFromR2(candidate.resumeUrl);
    } catch (deleteError) {
      storageLogger.error("Failed to delete resume during removal", {
        error: deleteError,
        candidateId: id,
      });
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

  // Invalidate cache for all affected positions (old + new)
  invalidateCandidateCache({
    candidateId: id,
    positionIds: Array.from(existingPositionIds),
  });

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
      storageLogger.error("Failed to delete resume during candidate deletion", {
        error: deleteError,
        candidateId: id,
      });
      // Continue with candidate deletion anyway
    }
  }

  await prisma.candidate.delete({ where: { id } });

  invalidateCandidateCache({
    candidateId: id,
    positionIds: candidate.positions.map((p) => p.positionId),
  });

  // Invalidate interview cache since candidate deletion cascades to interviews
  invalidateInterviewCache();

  redirect("/dashboard/candidates");
}
