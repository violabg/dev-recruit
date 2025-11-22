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
  experience_level: z.string({
    error: (issue) =>
      issue.input === undefined
        ? "Seleziona un livello di esperienza."
        : undefined,
  }),
  skills: z.array(z.string()).min(1, {
    error: "Seleziona almeno una competenza.",
  }),
  soft_skills: z.array(z.string()).optional(),
  contract_type: z.string().optional(),
});

export const positionDescriptionSchema = z.object({
  title: baseSchemas.title,
  experience_level: z.string().min(1, "Il livello di esperienza è richiesto."),
  skills: baseSchemas.skills,
  soft_skills: z.array(z.string()).optional(),
  contract_type: z.string().optional(),
  current_description: baseSchemas.description,
});

// ====================
// TYPE EXPORTS
// ====================

export type PositionFormData = z.infer<typeof positionFormSchema>;
export type PositionDescriptionInput = z.infer<
  typeof positionDescriptionSchema
>;
