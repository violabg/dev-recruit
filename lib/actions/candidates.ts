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
import {
  syncCandidateApplications,
  type ApplicationSyncResult,
} from "../services/applications";
import { storageLogger } from "../services/logger";
import {
  deleteResumeFromR2,
  uploadResumeToR2,
  validateResumeFile,
} from "../services/r2-storage";
import {
  invalidateAssessmentCache,
  invalidateCandidateCache,
} from "../utils/cache-utils";
import { runAction, UserError } from "./run-action";

const INVALID_POSITIONS_MESSAGE =
  "Una o più posizioni selezionate non sono valide";
const EMAIL_TAKEN_MESSAGE = "Esiste già un candidato con questa email";

const readFormValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
};

const readBoolean = (formData: FormData, key: string) => {
  const value = readFormValue(formData, key);
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

const parsePositionIds = (raw: string | undefined) => {
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    throw new UserError("Formato posizioni non valido");
  }
};

/** The resume file of the form data, when one was sent */
const readResumeFile = (formData: FormData) => {
  const resumeFile = formData.get("resumeFile");
  return resumeFile instanceof File && resumeFile.size > 0 ? resumeFile : null;
};

/** Parse the create / apply form data with the shared schema */
const parseCandidateForm = (formData: FormData): CandidateFormData => {
  const dateOfBirthRaw = readFormValue(formData, "dateOfBirth");

  return candidateFormSchema.parse({
    firstName: readFormValue(formData, "firstName"),
    lastName: readFormValue(formData, "lastName"),
    email: readFormValue(formData, "email"),
    positionIds:
      parsePositionIds(readFormValue(formData, "positionIds")) ?? [],
    dateOfBirth: dateOfBirthRaw ? new Date(dateOfBirthRaw) : undefined,
  });
};

const getCandidateById = async (id: string) => {
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: {
      email: true,
      resumeUrl: true,
      applications: {
        select: {
          positionId: true,
        },
      },
    },
  });

  if (!candidate) {
    throw new UserError("Candidato non trovato");
  }

  return candidate;
};

/**
 * Upload the resume of a candidate that was just created and store its URL.
 * A storage failure is logged: the candidate is kept without the resume.
 */
async function storeNewResume(file: File, candidateId: string) {
  try {
    const resumeUrl = await uploadResumeToR2(file, candidateId);
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { resumeUrl },
    });
  } catch (uploadError) {
    storageLogger.error("Failed to upload resume during candidate creation", {
      error: uploadError,
      candidateId,
    });
  }
}

// Candidate actions

/** Add a candidate from the dashboard. */
export async function createCandidateAction(formData: FormData) {
  return runAction("createCandidateAction", async () => {
    const user = await requireUser();
    const payload = parseCandidateForm(formData);
    const positionIds = [...new Set(payload.positionIds)];

    const existing = await prisma.candidate.findUnique({
      where: { email: payload.email },
      select: { id: true },
    });

    if (existing) {
      throw new UserError(EMAIL_TAKEN_MESSAGE);
    }

    const positions = await prisma.position.findMany({
      where: { id: { in: positionIds } },
      select: { id: true },
    });

    if (positions.length !== positionIds.length) {
      throw new UserError(INVALID_POSITIONS_MESSAGE);
    }

    // Create candidate first to get ID for file naming
    const candidate = await prisma.candidate.create({
      data: {
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        email: payload.email,
        dateOfBirth: payload.dateOfBirth ?? null,
        createdBy: user.id,
        applications: {
          create: positionIds.map((positionId) => ({
            positionId,
            ownerId: user.id,
          })),
        },
      },
      select: { id: true },
    });

    // Handle file upload if present
    const resumeFile = readResumeFile(formData);
    if (resumeFile) {
      const validation = validateResumeFile(resumeFile);
      if (!validation.valid) {
        // Delete the candidate if file validation fails
        await prisma.candidate.delete({ where: { id: candidate.id } });
        throw new UserError(validation.error || "File non valido");
      }

      await storeNewResume(resumeFile, candidate.id);
    }

    invalidateCandidateCache({
      candidateId: candidate.id,
      positionIds,
    });

    return { candidateId: candidate.id };
  });
}

/**
 * Public application from /recruiting. No signed-in user. The candidate is
 * matched on the normalised email; the answer is the same whether the email
 * already exists or not, so it never reveals it.
 */
export async function applyAsCandidateAction(formData: FormData) {
  return runAction("applyAsCandidateAction", async () => {
    const payload = parseCandidateForm(formData);
    const positionIds = [...new Set(payload.positionIds)];

    // Only open positions accept a public application
    const positions = await prisma.position.findMany({
      where: { id: { in: positionIds }, status: "open" },
      select: { id: true },
    });

    if (positions.length !== positionIds.length) {
      throw new UserError(INVALID_POSITIONS_MESSAGE);
    }

    // Validated before the email lookup: the error never depends on it
    const resumeFile = readResumeFile(formData);
    if (resumeFile) {
      const validation = validateResumeFile(resumeFile);
      if (!validation.valid) {
        throw new UserError(validation.error || "File non valido");
      }
    }

    const existing = await prisma.candidate.findUnique({
      where: { email: payload.email },
      select: {
        id: true,
        resumeUrl: true,
        applications: { select: { positionId: true } },
      },
    });

    // (a) Unknown email: a new candidate with its applications
    if (!existing) {
      const candidate = await prisma.candidate.create({
        data: {
          firstName: payload.firstName.trim(),
          lastName: payload.lastName.trim(),
          email: payload.email,
          dateOfBirth: payload.dateOfBirth ?? null,
          createdBy: null,
          applications: {
            create: positionIds.map((positionId) => ({ positionId })),
          },
        },
        select: { id: true },
      });

      if (resumeFile) {
        await storeNewResume(resumeFile, candidate.id);
      }

      invalidateCandidateCache({ candidateId: candidate.id, positionIds });
      return;
    }

    // (b) Known email: only the positions without an application, whatever
    // the stage of the existing ones (nothing is reopened)
    const appliedPositionIds = new Set(
      existing.applications.map((application) => application.positionId),
    );
    const newPositionIds = positionIds.filter(
      (positionId) => !appliedPositionIds.has(positionId),
    );

    // (c) Already applied to every selected position: nothing is written
    if (newPositionIds.length === 0) {
      return;
    }

    // Name and date of birth of an existing candidate are never changed
    await prisma.candidate.update({
      where: { id: existing.id },
      data: {
        applications: {
          create: newPositionIds.map((positionId) => ({ positionId })),
        },
      },
    });

    if (resumeFile) {
      try {
        const resumeUrl = await uploadResumeToR2(resumeFile, existing.id);
        await prisma.candidate.update({
          where: { id: existing.id },
          data: { resumeUrl },
        });

        if (existing.resumeUrl) {
          try {
            await deleteResumeFromR2(existing.resumeUrl);
          } catch (deleteError) {
            storageLogger.error(
              "Failed to delete previous resume after public application",
              { error: deleteError, candidateId: existing.id },
            );
          }
        }
      } catch (uploadError) {
        storageLogger.error("Failed to upload resume during public application", {
          error: uploadError,
          candidateId: existing.id,
        });
      }
    }

    invalidateCandidateCache({
      candidateId: existing.id,
      positionIds: newPositionIds,
    });
  });
}

export async function updateCandidateAction(
  id: string,
  formData: FormData
) {
  return runAction("updateCandidateAction", async () => {
    const user = await requireUser();

    const dateOfBirthRaw = readFormValue(formData, "dateOfBirth");
    const removeResume = readFormValue(formData, "removeResume") === "true";
    const doNotContactNoteRaw = readFormValue(formData, "doNotContactNote");

    const payload: CandidateUpdateData = candidateUpdateSchema.parse({
      firstName: readFormValue(formData, "firstName"),
      lastName: readFormValue(formData, "lastName"),
      email: readFormValue(formData, "email"),
      positionIds: parsePositionIds(readFormValue(formData, "positionIds")),
      dateOfBirth: dateOfBirthRaw ? new Date(dateOfBirthRaw) : undefined,
      doNotContact: readBoolean(formData, "doNotContact"),
      doNotContactNote:
        doNotContactNoteRaw === undefined
          ? undefined
          : doNotContactNoteRaw.trim() || null,
      removeResume,
    });

    const candidate = await getCandidateById(id);

    if (payload.email && payload.email !== candidate.email) {
      const owner = await prisma.candidate.findUnique({
        where: { email: payload.email },
        select: { id: true },
      });
      if (owner && owner.id !== id) {
        throw new UserError(EMAIL_TAKEN_MESSAGE);
      }
    }

    const updateData: Prisma.CandidateUpdateInput = {};

    if (payload.firstName) {
      updateData.firstName = payload.firstName.trim();
    }

    if (payload.lastName) {
      updateData.lastName = payload.lastName.trim();
    }

    if (payload.email) {
      updateData.email = payload.email;
    }

    if (payload.dateOfBirth !== undefined) {
      updateData.dateOfBirth = payload.dateOfBirth ?? null;
    }

    if (payload.doNotContact !== undefined) {
      updateData.doNotContact = payload.doNotContact;
      if (!payload.doNotContact) {
        updateData.doNotContactNote = null;
      }
    }

    if (payload.doNotContactNote !== undefined && payload.doNotContact !== false) {
      updateData.doNotContactNote = payload.doNotContactNote;
    }

    // Handle resume file upload or removal (upload before the transaction)
    const resumeFile = readResumeFile(formData);
    const existingResumeUrl = candidate.resumeUrl;
    let shouldDeleteOldResume = false;

    if (resumeFile) {
      const validation = validateResumeFile(resumeFile);
      if (!validation.valid) {
        throw new UserError(validation.error || "File non valido");
      }

      try {
        const resumeUrl = await uploadResumeToR2(resumeFile, id);
        updateData.resumeUrl = resumeUrl;
        if (existingResumeUrl) {
          shouldDeleteOldResume = true;
        }
      } catch (uploadError) {
        storageLogger.error("Failed to upload resume during candidate update", {
          error: uploadError,
          candidateId: id,
        });
        throw new UserError("Errore durante il caricamento del curriculum");
      }
    } else if (removeResume && existingResumeUrl) {
      // User wants to remove existing resume without uploading a new one
      updateData.resumeUrl = null;
      shouldDeleteOldResume = true;
    }

    const hasScalarChanges = Object.keys(updateData).length > 0;

    if (!hasScalarChanges && !payload.positionIds) {
      throw new UserError("Nessun aggiornamento rilevato");
    }

    const positionIds = payload.positionIds;

    // Candidate fields and the positions diff change together or not at all
    const sync = await prisma.$transaction(async (tx) => {
      if (hasScalarChanges) {
        await tx.candidate.update({
          where: { id },
          data: updateData,
        });
      }

      if (!positionIds) return null;

      return syncCandidateApplications(tx, {
        candidateId: id,
        positionIds,
        ownerId: user.id,
      });
    });

    if (shouldDeleteOldResume && existingResumeUrl) {
      try {
        await deleteResumeFromR2(existingResumeUrl);
      } catch (deleteError) {
        storageLogger.error("Failed to delete old resume after update", {
          error: deleteError,
          candidateId: id,
        });
      }
    }

    invalidateCandidateCache({
      candidateId: id,
      positionIds: affectedPositionIds(sync, candidate.applications),
      applicationIds: sync?.touchedApplicationIds ?? [],
    });

    if (sync && sync.cancelledAssessmentIds.length > 0) {
      invalidateAssessmentCache();
    }
  });
}

/**
 * Positions whose reads change after an update: every position created,
 * reopened, withdrawn, deleted or left unchanged by the diff; without a diff,
 * the positions the candidate already had.
 */
function affectedPositionIds(
  sync: ApplicationSyncResult | null,
  previous: { positionId: string }[],
) {
  if (!sync) {
    return previous.map((application) => application.positionId);
  }

  return [
    ...sync.createdPositionIds,
    ...sync.reopenedPositionIds,
    ...sync.withdrawnPositionIds,
    ...sync.deletedPositionIds,
    ...sync.unchangedPositionIds,
  ];
}

// Delete candidate
export async function deleteCandidateAction(id: string) {
  return runAction("deleteCandidateAction", async () => {
    await requireUser();

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

    // deleted: true expires assessments/evaluations/rubrics removed by cascade
    invalidateCandidateCache({
      candidateId: id,
      positionIds: candidate.applications.map((a) => a.positionId),
      deleted: true,
    });

    redirect("/dashboard/candidates");
  });
}
