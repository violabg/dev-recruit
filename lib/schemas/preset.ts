import { z } from "zod/v4";
import { baseSchemas } from "./base";

// Preset schema for CRUD operations
export const presetSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, "Preset name is required").max(100),
  label: z.string().min(1, "Label is required").max(100),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().min(1, "Icon name is required"),
  questionType: baseSchemas.questionType,
  options: z.record(z.string(), z.unknown()),
  tags: z.array(z.string().min(1).max(50)).min(1, "At least one tag required"),
  difficulty: z.number().int().min(1).max(5),
  isDefault: z.boolean().optional(),
});

// Schema for creating a new preset
export const createPresetSchema = presetSchema.omit({ id: true });

// Schema for updating a preset
export const updatePresetSchema = presetSchema.partial();

// Type exports
export type Preset = z.infer<typeof presetSchema>;
export type CreatePresetInput = z.infer<typeof createPresetSchema>;
export type UpdatePresetInput = z.infer<typeof updatePresetSchema>;
