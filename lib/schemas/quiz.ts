import { z } from "zod";
import { baseSchemas } from "./base";
import { questionSchemas } from "./question";

// ====================
// UNIFIED QUIZ SCHEMAS
// ====================
// Consolidated quiz schemas providing a single source of truth.
// Schemas are organized by their purpose:
// - AI output: aiQuizGenerationSchema
// - Generation: quizGenerationConfigSchema, quizGenerationFormSchema,
//   generateQuizSchema
// - Editor + save: quizEditorSchema, saveQuizSchema
// - Duplication: duplicateQuizFormSchema, duplicateQuizSchema

// AI Generation schema - only includes fields that the AI should generate
// This schema excludes backend-managed fields like IDs, timestamps, etc.
// Each question may carry the keys (C1, C2, ...) of the criteria it verifies:
// the AI answers with keys, never ids. Intersection because the flexible
// schema is refined and cannot be extended.
export const aiQuizGenerationSchema = z.object({
  title: baseSchemas.title,
  questions: z.array(
    questionSchemas.flexible.and(
      z.object({ criterionKeys: z.array(z.string()).optional() }),
    ),
  ),
  timeLimit: z.number().nullable().optional(),
  difficulty: baseSchemas.difficulty.optional(),
  instructions: baseSchemas.instructions.optional(),
});

// Generation configuration - shared across all generation contexts
export const quizGenerationConfigSchema = z.object({
  quizTitle: baseSchemas.title,
  difficulty: baseSchemas.difficulty,
  questionCount: baseSchemas.questionCount,
  instructions: baseSchemas.instructions,

  // Question type inclusion flags
  includeMultipleChoice: z.boolean(),
  includeOpenQuestions: z.boolean(),
  includeCodeSnippets: z.boolean(),
  includeBehavioralScenarios: z.boolean(),

  // Optional generation parameters
  specificModel: z.string().optional(),
  previousQuestions: z
    .array(
      z.object({
        question: z.string().min(1, "Il testo della domanda è obbligatorio"),
        type: z.string().optional(),
      }),
    )
    .optional(),
});

// Generation dialog form: generation config plus the time limit controls
export const quizGenerationFormSchema = quizGenerationConfigSchema.extend({
  enableTimeLimit: z.boolean(),
  timeLimit: z.number().min(5).max(120),
});

/** Starting values of the generation form of a position (no model choice) */
export function quizGenerationDefaults(position: {
  title: string;
  experienceLevel: string;
}): Omit<QuizGenerationFormData, "specificModel" | "previousQuestions"> {
  return {
    quizTitle: `Quiz per ${position.title} (${position.experienceLevel})`,
    instructions: "",
    questionCount: 10,
    includeMultipleChoice: true,
    includeOpenQuestions: true,
    includeCodeSnippets: true,
    includeBehavioralScenarios: false,
    difficulty: 3,
    timeLimit: 30,
    enableTimeLimit: true,
  };
}

// Input of generateNewQuizAction
export const generateQuizSchema = quizGenerationConfigSchema.extend({
  positionId: baseSchemas.id,
});

// Quiz editor form (create and edit). positionId is only needed on create.
export const quizEditorSchema = z.object({
  title: baseSchemas.title,
  positionId: baseSchemas.id.optional(),
  timeLimit: baseSchemas.timeLimit,
  questions: z
    .array(questionSchemas.flexible)
    .min(1, "Almeno una domanda è obbligatoria"),
});

// Input of upsertQuizAction: with quizId it updates, without it creates
export const saveQuizSchema = quizEditorSchema
  .extend({ quizId: baseSchemas.id.optional() })
  .refine((data) => Boolean(data.quizId || data.positionId), {
    message: "La posizione è obbligatoria per creare un quiz",
    path: ["positionId"],
  });

// Duplicate dialog form
export const duplicateQuizFormSchema = z.object({
  newTitle: z
    .string()
    .min(2, "Il titolo deve contenere almeno 2 caratteri.")
    .max(200, "Il titolo non può superare 200 caratteri"),
  newPositionId: z.string().min(1, "Seleziona una posizione."),
});

// Input of duplicateQuizAction
export const duplicateQuizSchema = duplicateQuizFormSchema.extend({
  quizId: baseSchemas.id,
});

// Input of addExistingQuizzesToPositionAction: copies of existing quizzes
// added to a position. Duplicate ids are removed, first occurrence kept.
export const MAX_QUIZZES_PER_ADD = 20;
export const addExistingQuizzesSchema = z.object({
  positionId: baseSchemas.id,
  quizIds: z
    .array(baseSchemas.id)
    .min(1, "Seleziona almeno un quiz")
    .max(MAX_QUIZZES_PER_ADD, "Puoi aggiungere al massimo 20 quiz alla volta")
    .transform((ids) => [...new Set(ids)]),
});

// NOTE: Entity types are defined in lib/data/quizzes.ts.
// This file contains ONLY validation schemas, not entity definitions.

export type QuizGenerationFormData = z.infer<typeof quizGenerationFormSchema>;
export type GenerateQuizInput = z.infer<typeof generateQuizSchema>;
export type QuizEditorData = z.infer<typeof quizEditorSchema>;
export type SaveQuizInput = z.infer<typeof saveQuizSchema>;
export type DuplicateQuizFormData = z.infer<typeof duplicateQuizFormSchema>;
export type DuplicateQuizInput = z.infer<typeof duplicateQuizSchema>;
export type AddExistingQuizzesInput = z.input<typeof addExistingQuizzesSchema>;
