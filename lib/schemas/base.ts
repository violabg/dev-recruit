import { z } from "zod";

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
  id: z.string().min(1, "L'ID è obbligatorio"),

  // Text schemas with consistent validation
  title: z
    .string()
    .min(2, "Il titolo deve contenere almeno 2 caratteri")
    .max(200, "Il titolo non può superare 200 caratteri")
    .trim(),

  description: z
    .string()
    .max(2000, "La descrizione non può superare 2000 caratteri")
    .optional(),

  instructions: z
    .string()
    .max(2000, "Le istruzioni non possono superare 2000 caratteri")
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
    .min(1, "La difficoltà minima è 1")
    .max(5, "La difficoltà massima è 5"),

  questionCount: z
    .int()
    .min(1, "Serve almeno 1 domanda")
    .max(50, "Sono consentite al massimo 50 domande"),

  timeLimit: z.coerce
    .number<number>()
    .int()
    .min(5, "Il tempo limite minimo è 5 minuti")
    .max(120, "Il tempo limite massimo è 120 minuti")
    .nullable(),

  score: z
    .number()
    .min(0, "Il punteggio non può essere negativo")
    .max(10, "Il punteggio massimo è 10"),

  // Boolean schemas with proper coercion
  booleanField: z.union([
    z.boolean(),
    z.string().transform((val) => val === "true"),
    z.literal("on").transform(() => true),
  ]),

  // Array schemas
  skills: z
    .array(z.string().min(1, "Il nome della competenza è obbligatorio"))
    .min(1, "Serve almeno una competenza"),

  stringArray: z.array(z.string()),

  // Enum schemas
  questionType: z.enum(
    ["multiple_choice", "open_question", "code_snippet", "behavioral_scenario"],
    {
      error: () => "Tipo di domanda non valido",
    },
  ),

  interviewStatus: z.enum(
    ["pending", "in_progress", "completed", "cancelled"],
    {
      error: () => "Stato del colloquio non valido",
    },
  ),
} as const;

// Composite schemas for reuse
export const commonSchemas = {
  pagination: z.object({
    page: z.int().min(1).prefault(1),
    limit: z.int().min(1).max(100).prefault(10),
  }),

  timestamps: z.object({
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime().optional(),
  }),

  userReference: z.object({
    createdBy: baseSchemas.id,
    updatedBy: baseSchemas.id.optional(),
  }),
} as const;

// Form-specific transformers for handling FormData
export const formTransformers = {
  // Transform string "true"/"false" to boolean
  stringToBoolean: z.string().transform((val) => val === "true"),

  // Transform string number to number with validation
  stringToNumber: z.string().transform((val) => {
    const num = Number(val);
    if (isNaN(num)) throw new Error("Numero non valido");
    return num;
  }),

  // Transform comma-separated string to array
  stringToArray: z.string().transform((val) =>
    val
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  ),

  // Coerce string to number (for FormData)
  coerceNumber: z.coerce.number(),

  // Coerce string to integer (for FormData)
  coerceInt: z.int(),
} as const;

// Type exports for the base schemas
export type QuestionType = z.infer<typeof baseSchemas.questionType>;
export type InterviewStatus = z.infer<typeof baseSchemas.interviewStatus>;
