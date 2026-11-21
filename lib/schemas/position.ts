import { z } from "zod";
import { baseSchemas } from "./base";

// ====================
// POSITION SCHEMAS
// ====================

export const positionFormSchema = z.object({
  title: z.string().min(2, {
    error: "Il titolo deve contenere almeno 2 caratteri.",
  }),
  description: baseSchemas.description,
  experienceLevel: z.string().min(1, "Seleziona un livello di esperienza."),
  skills: z.array(z.string()).min(1, {
    error: "Seleziona almeno una competenza.",
  }),
  softSkills: z.array(z.string()).optional(),
  contractType: z.string().optional(),
});

// Generation of a position description: every detail is optional, so the
// description can be written (or improved) before the position is complete.
export const positionDescriptionSchema = z.object({
  title: z
    .string()
    .trim()
    .max(200, "Il titolo non può superare 200 caratteri")
    .optional(),
  experienceLevel: z.string().optional(),
  skills: z.array(z.string()).optional(),
  softSkills: z.array(z.string()).optional(),
  contractType: z.string().optional(),
  currentDescription: baseSchemas.description,
});

// ====================
// POSITION STATUS SCHEMAS
// ====================
// The status is not a form field: it changes through its own action.

export const POSITION_STATUS_VALUES = ["draft", "open", "closed"] as const;

export const positionStatusSchema = z.enum(POSITION_STATUS_VALUES, {
  error: () => "Stato della posizione non valido",
});

export type PositionStatus = z.infer<typeof positionStatusSchema>;

export const updatePositionStatusSchema = z.object({
  positionId: baseSchemas.id,
  status: positionStatusSchema,
});

export type UpdatePositionStatusInput = z.infer<
  typeof updatePositionStatusSchema
>;

// ====================
// TYPE EXPORTS
// ====================

export type PositionFormData = z.infer<typeof positionFormSchema>;
export type PositionDescriptionInput = z.infer<
  typeof positionDescriptionSchema
>;
