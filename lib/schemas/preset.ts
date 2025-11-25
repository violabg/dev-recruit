import { z } from "zod/v4";
import { baseSchemas } from "./base";

const optionalTrimmedString = (max = 255) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => {
      if (!value) return undefined;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    });

const optionalStringArray = z
  .array(z.string().trim().min(1))
  .optional()
  .transform((value) => (value && value.length ? value : undefined));

const optionalBoolean = z
  .boolean()
  .optional()
  .nullable()
  .transform((value) => (typeof value === "boolean" ? value : undefined));

const optionalEnum = <T extends string>(schema: z.ZodType<T, any, any>) =>
  schema
    .optional()
    .nullable()
    .transform((value) => (value ? value : undefined));

const distractorComplexitySchema = z.enum(["simple", "moderate", "complex"]);
const expectedResponseLengthSchema = z.enum(["short", "medium", "long"]);
const bugTypeSchema = z.enum(["syntax", "logic", "performance", "security"]);
const codeComplexitySchema = z.enum(["basic", "intermediate", "advanced"]);

// Preset schema for CRUD operations
export const presetSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, "Preset name is required").max(100),
  label: z.string().min(1, "Label is required").max(100),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().min(1, "Icon name is required"),
  questionType: baseSchemas.questionType,
  instructions: optionalTrimmedString(1000),
  focusAreas: optionalStringArray,
  distractorComplexity: optionalEnum(distractorComplexitySchema),
  requireCodeExample: optionalBoolean,
  expectedResponseLength: optionalEnum(expectedResponseLengthSchema),
  evaluationCriteria: optionalStringArray,
  language: optionalTrimmedString(100),
  bugType: optionalEnum(bugTypeSchema),
  codeComplexity: optionalEnum(codeComplexitySchema),
  includeComments: optionalBoolean,
  tags: z.array(z.string().min(1).max(50)).min(1, "At least one tag required"),
  difficulty: z.number().int().min(1).max(5),
  isDefault: z.boolean().optional(),
});

// NOTE: Entity type `Preset` is defined in lib/data/presets.ts (re-exported from Prisma).
// This file contains ONLY validation schemas for form inputs and API requests.

// Schema for creating a new preset (form validation)
export const createPresetSchema = presetSchema.omit({ id: true });

// Schema for updating a preset (partial validation)
export const updatePresetSchema = presetSchema.partial();

// Type exports - validation input types only
export type CreatePresetInput = z.infer<typeof createPresetSchema>;
export type UpdatePresetInput = z.infer<typeof updatePresetSchema>;

export type ExpectedResponseLength = z.infer<
  typeof expectedResponseLengthSchema
>;
