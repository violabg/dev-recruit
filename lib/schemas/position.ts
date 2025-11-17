import { z } from "zod/v4";
import { baseSchemas } from "./base";

// ====================
// POSITION SCHEMAS
// ====================

export const positionFormSchema = z.object({
  title: z.string().min(2, {
      error: "Il titolo deve contenere almeno 2 caratteri."
}),
  description: baseSchemas.description,
  experience_level: z.string({
      error: (issue) => issue.input === undefined ? "Seleziona un livello di esperienza." : undefined
}),
  skills: z.array(z.string()).min(1, {
      error: "Seleziona almeno una competenza."
}),
  soft_skills: z.array(z.string()).optional(),
  contract_type: z.string().optional(),
});

// ====================
// TYPE EXPORTS
// ====================

export type PositionFormData = z.infer<typeof positionFormSchema>;
