import { z } from "zod/v4";
import { baseSchemas } from "./base";

// ====================
// POSITION SCHEMAS
// ====================

export const positionFormSchema = z.object({
  title: z.string().min(2, {
    error: "Il titolo deve contenere almeno 2 caratteri.",
  }),
  description: baseSchemas.description,
  experienceLevel: z.string({
    error: (issue) =>
      issue.input === undefined
        ? "Seleziona un livello di esperienza."
        : undefined,
  }),
  skills: z.array(z.string()).min(1, {
    error: "Seleziona almeno una competenza.",
  }),
  softSkills: z.array(z.string()).optional(),
  contractType: z.string().optional(),
});

export const positionDescriptionSchema = z.object({
  title: baseSchemas.title,
  experienceLevel: z.string().min(1, "Il livello di esperienza è richiesto."),
  skills: baseSchemas.skills,
  softSkills: z.array(z.string()).optional(),
  contractType: z.string().optional(),
  currentDescription: baseSchemas.description,
});

// ====================
// TYPE EXPORTS
// ====================

export type PositionFormData = z.infer<typeof positionFormSchema>;
export type PositionDescriptionInput = z.infer<
  typeof positionDescriptionSchema
>;
