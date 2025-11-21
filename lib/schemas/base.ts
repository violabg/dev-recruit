import { z } from "zod/v4";

// ====================
// UNIFIED BASE SCHEMAS
// ====================
// Enhanced base schemas with consistent validation for the unified schema system

export const baseSchemas = {
  // Identity schemas - supports both UUID and cuid formats
  // uuid: z.string().refine(
  //   (val) => {
  //     // Allow both UUID and cuid formats
  //     const uuidRegex =
  //       /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  //     const cuidRegex = /^c[a-z0-9]{24}$/;
  //     return uuidRegex.test(val) || cuidRegex.test(val);
  //   },
  //   { message: "Invalid ID format (UUID or cuid required)" }
  // ),
  id: z.string().min(1, "ID is required"),

  // Text schemas with consistent validation
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title must not exceed 200 characters")
    .trim(),

  description: z
    .string()
    .max(2000, "Description must not exceed 2000 characters")
    .optional(),

  instructions: z
    .string()
    .max(2000, "Instructions must not exceed 2000 characters")
    .optional(),

  // Email validation with Italian error message
  email: z.email(),

  // Password validation with Italian error message
  password: z.string().min(6, {
    error: "Minimo 6 caratteri",
  }),

  // Name validation with Italian error message
  name: z.string().min(2, "Nome deve contenere almeno 2 caratteri"),

  // Numeric schemas with validation
  difficulty: z
    .int()
    .min(1, "Minimum difficulty is 1")
    .max(5, "Maximum difficulty is 5"),

  questionCount: z
    .int()
    .min(1, "At least 1 question required")
    .max(50, "Maximum 50 questions allowed"),

  timeLimit: z.coerce
    .number<number>()
    .int()
    .min(5, "Minimum time limit is 5 minutes")
    .max(120, "Maximum time limit is 120 minutes")
    .nullable(),

  score: z
    .number()
    .min(0, "Score must be non-negative")
    .max(10, "Maximum score is 10"),

  // Boolean schemas with proper coercion
  booleanField: z.union([
    z.boolean(),
    z.string().transform((val) => val === "true"),
    z.literal("on").transform(() => true),
  ]),

  // Array schemas
  skills: z
    .array(z.string().min(1, "Skill name required"))
    .min(1, "At least one skill required"),

  stringArray: z.array(z.string()),

  // Enum schemas
  questionType: z.enum(["multiple_choice", "open_question", "code_snippet"], {
    error: () => "Invalid question type",
  }),

  experienceLevel: z.enum(["junior", "mid", "senior", "lead"], {
    error: () => "Invalid experience level",
  }),

  contractType: z.enum(["full-time", "part-time", "contract", "internship"], {
    error: () => "Invalid contract type",
  }),

  interviewStatus: z.enum(
    ["pending", "in_progress", "completed", "cancelled"],
    {
      error: () => "Invalid interview status",
    }
  ),

  candidateStatus: z.enum(
    ["pending", "in_progress", "completed", "hired", "rejected"],
    {
      error: () => "Invalid candidate status",
    }
  ),
} as const;

// Composite schemas for reuse
export const commonSchemas = {
  pagination: z.object({
    page: z.int().min(1).prefault(1),
    limit: z.int().min(1).max(100).prefault(10),
  }),

  timestamps: z.object({
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime().optional(),
  }),

  userReference: z.object({
    created_by: baseSchemas.id,
    updated_by: baseSchemas.id.optional(),
  }),
} as const;

// Form-specific transformers for handling FormData
export const formTransformers = {
  // Transform string "true"/"false" to boolean
  stringToBoolean: z.string().transform((val) => val === "true"),

  // Transform string number to number with validation
  stringToNumber: z.string().transform((val) => {
    const num = Number(val);
    if (isNaN(num)) throw new Error("Invalid number");
    return num;
  }),

  // Transform comma-separated string to array
  stringToArray: z.string().transform((val) =>
    val
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  ),

  // Coerce string to number (for FormData)
  coerceNumber: z.coerce.number(),

  // Coerce string to integer (for FormData)
  coerceInt: z.int(),
} as const;

// Type exports for the base schemas
export type QuestionType = z.infer<typeof baseSchemas.questionType>;
export type ExperienceLevel = z.infer<typeof baseSchemas.experienceLevel>;
export type ContractType = z.infer<typeof baseSchemas.contractType>;
export type InterviewStatus = z.infer<typeof baseSchemas.interviewStatus>;
export type CandidateStatus = z.infer<typeof baseSchemas.candidateStatus>;
