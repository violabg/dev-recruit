import { z } from "zod";
import { baseSchemas } from "./base";

// ====================
// HELPERS
// ====================

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
  ) {
    age--;
  }

  return age;
}

/**
 * Date of birth schema with minimum age validation (18 years)
 */
const dateOfBirthSchema = z.coerce
  .date()
  .refine((date) => calculateAge(date) >= 18, {
    message: "Il candidato deve avere almeno 18 anni",
  });

// ====================
// CANDIDATE SCHEMAS
// ====================

export const candidateFormSchema = z.object({
  firstName: baseSchemas.name,
  lastName: baseSchemas.name,
  email: baseSchemas.email,
  dateOfBirth: dateOfBirthSchema.optional(),
  positionIds: z
    .array(z.string())
    .min(1, {
      error: "Seleziona almeno una posizione.",
    })
    .max(10, {
      error: "Massimo 10 posizioni.",
    }),
  // Resume file is handled separately via FormData
});

export const candidateUpdateSchema = z
  .object({
    firstName: baseSchemas.name.optional(),
    lastName: baseSchemas.name.optional(),
    email: baseSchemas.email.optional(),
    dateOfBirth: dateOfBirthSchema.optional().nullable(),
    positionIds: z
      .array(z.string())
      .min(1, {
        error: "Seleziona almeno una posizione valida.",
      })
      .max(10, {
        error: "Massimo 10 posizioni.",
      })
      .optional(),
    status: z
      .enum(["pending", "contacted", "interviewing", "hired", "rejected"], {
        error: "Stato candidato non valido",
      })
      .optional(),
    // Resume URL is set after file upload, not directly from form
    resumeUrl: z
      .union([
        z.url({ message: "Inserisci un URL valido" }),
        z.literal(""),
        z.null(),
      ])
      .optional(),
    // Flag to remove existing resume
    removeResume: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Nessun campo da aggiornare",
  });

// ====================
// TYPE EXPORTS
// ====================

export type CandidateFormData = z.infer<typeof candidateFormSchema>;
export type CandidateUpdateData = z.infer<typeof candidateUpdateSchema>;
