import { z } from "zod/v4";
import { baseSchemas } from "./base";

// ====================
// CANDIDATE SCHEMAS
// ====================

export const candidateFormSchema = z.object({
  name: baseSchemas.name,
  email: baseSchemas.email,
  positionId: z.string().min(1, {
    error: "Seleziona una posizione.",
  }),
  resumeUrl: z
    .union([z.url({ message: "Inserisci un URL valido" }), z.literal("")])
    .optional(),
});

export const candidateUpdateSchema = z
  .object({
    name: baseSchemas.name.optional(),
    email: baseSchemas.email.optional(),
    positionId: z
      .string()
      .min(1, {
        error: "Seleziona una posizione valida.",
      })
      .optional(),
    status: z
      .enum(["pending", "contacted", "interviewing", "hired", "rejected"], {
        error: "Stato candidato non valido",
      })
      .optional(),
    resumeUrl: z
      .union([
        z.url({ message: "Inserisci un URL valido" }),
        z.literal(""),
        z.null(),
      ])
      .optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Nessun campo da aggiornare",
  });

// ====================
// TYPE EXPORTS
// ====================

export type CandidateFormData = z.infer<typeof candidateFormSchema>;
export type CandidateUpdateData = z.infer<typeof candidateUpdateSchema>;
