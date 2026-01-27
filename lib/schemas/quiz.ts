import { z } from "zod";
import { baseSchemas, formTransformers } from "./base";
import { questionSchemas } from "./question";

// ====================
// UNIFIED QUIZ SCHEMAS
// ====================
// Consolidated quiz schemas providing a single source of truth.
// Schemas are organized by their purpose:
// - AI Generation: aiQuizGenerationSchema
// - Form Input: quizFormSchemas (frontend, formData, basic)
// - API Contracts: quizApiSchemas (generateQuiz, update, save, generateQuestion)
// - Entity Validation: quizSchema (validates DB entity structure)

// AI Generation schema - only includes fields that the AI should generate
// This schema excludes backend-managed fields like IDs, timestamps, etc.
export const aiQuizGenerationSchema = z.object({
  title: baseSchemas.title,
  questions: z.array(questionSchemas.flexible),
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
        question: z.string().min(1, "Question text required"),
        type: z.string().optional(),
      }),
    )
    .optional(),
});

// API request schemas - extend base configuration
export const quizApiSchemas = {
  generateQuiz: quizGenerationConfigSchema.extend({
    positionId: baseSchemas.id,
  }),

  // Quiz update request (unified schema)
  update: z.object({
    quizId: baseSchemas.id,
    title: baseSchemas.title,
    timeLimit: baseSchemas.timeLimit,
    questions: z.array(questionSchemas.flexible),
    instructions: baseSchemas.instructions.optional(),
    updatedBy: baseSchemas.id.optional(),
  }),

  // Quiz save request
  save: z.object({
    title: baseSchemas.title,
    positionId: baseSchemas.id,
    questions: z
      .array(questionSchemas.flexible)
      .min(1, "At least one question required"),
    timeLimit: baseSchemas.timeLimit,
    instructions: baseSchemas.instructions.optional(),
  }),

  generateQuestion: z.object({
    quizTitle: baseSchemas.title,
    positionTitle: baseSchemas.title,
    experienceLevel: z.string().min(1, "Experience level is required"),
    skills: baseSchemas.skills,
    type: baseSchemas.questionType,
    difficulty: baseSchemas.difficulty.optional(),
    previousQuestions: z
      .array(
        z.object({
          question: z.string().min(1, "Question text required"),
          type: z.string().optional(),
        }),
      )
      .optional(),
    specificModel: z.string().optional(),
    instructions: baseSchemas.instructions,

    // Type-specific parameters for different question types
    // Multiple choice specific
    focusAreas: z.array(z.string()).optional(),
    distractorComplexity: z.enum(["simple", "moderate", "complex"]).optional(),

    // Open question specific
    expectedResponseLength: z.enum(["short", "medium", "long"]).optional(),
    evaluationCriteria: z.array(z.string()).optional(),

    // Code snippet specific
    language: z.string().optional(), // 🎯 THIS IS THE KEY FIELD!
    bugType: z.enum(["syntax", "logic", "performance", "security"]).optional(),
    codeComplexity: z.enum(["basic", "intermediate", "advanced"]).optional(),
    includeComments: z.boolean().optional(),
  }),
} as const;

// Form schemas with proper transformation
export const quizFormSchemas = {
  // Frontend form schema (React Hook Form)
  frontend: quizGenerationConfigSchema.extend({
    enableTimeLimit: z.boolean(),
    timeLimit: baseSchemas.timeLimit,
    llmModel: z.string(),
  }),

  // FormData schema (server actions) with transformations
  formData: z.object({
    positionId: baseSchemas.id,
    title: baseSchemas.title,
    questionCount: formTransformers.coerceInt.pipe(baseSchemas.questionCount),
    difficulty: formTransformers.coerceInt.pipe(baseSchemas.difficulty),
    includeMultipleChoice: formTransformers.stringToBoolean,
    includeOpenQuestions: formTransformers.stringToBoolean,
    includeCodeSnippets: formTransformers.stringToBoolean,
    includeBehavioralScenarios: formTransformers.stringToBoolean,
    instructions: z.string().max(2000).optional(),
    enableTimeLimit: formTransformers.stringToBoolean.optional(),
    timeLimit: baseSchemas.timeLimit.optional(),
    llmModel: z.string().optional(),
  }),

  // Simplified quiz form for basic editing
  basic: z.object({
    title: z.string().min(2, "Il titolo deve contenere almeno 2 caratteri."),
    instructions: baseSchemas.instructions,
    questionCount: baseSchemas.questionCount,
    includeMultipleChoice: z.boolean(),
    includeOpenQuestions: z.boolean(),
    includeCodeSnippets: z.boolean(),
    includeBehavioralScenarios: z.boolean(),
    difficulty: baseSchemas.difficulty,
    timeLimit: baseSchemas.timeLimit,
    enableTimeLimit: z.boolean(),
    llmModel: z.string(),
  }),
} as const;

// NOTE: Entity types are defined in lib/data/quizzes.ts as QuizResponse
// This file contains ONLY validation schemas, not entity definitions.
// Use Prisma-derived types from the data layer for entity representation.

// Type exports with consistent naming
export type QuizGenerationConfig = z.infer<typeof quizGenerationConfigSchema>;
export type QuizApiRequest = z.infer<typeof quizApiSchemas.generateQuiz>;
export type QuizFormData = z.infer<typeof quizFormSchemas.frontend>;
export type QuizFormDataRaw = z.infer<typeof quizFormSchemas.formData>;
export type QuizBasicForm = z.infer<typeof quizFormSchemas.basic>;
export type AIQuizGeneration = z.infer<typeof aiQuizGenerationSchema>;

// API request types
export type GenerateQuizRequest = z.infer<typeof quizApiSchemas.generateQuiz>;
export type GenerateQuestionRequest = z.infer<
  typeof quizApiSchemas.generateQuestion
>;
export type SaveQuizRequest = z.infer<typeof quizApiSchemas.save>;
export type UpdateQuizRequest = z.infer<typeof quizApiSchemas.update>;

// Legacy alias - prefer importing QuizResponse from @/lib/data/quizzes
export type GenerateQuizFormData = QuizFormDataRaw;

// Schema exports for direct usage (aliases for cleaner imports)
export const generateQuizRequestSchema = quizApiSchemas.generateQuiz;
export const generateQuestionRequestSchema = quizApiSchemas.generateQuestion;
export const saveQuizRequestSchema = quizApiSchemas.save;
export const updateQuizRequestSchema = quizApiSchemas.update;
export const generateQuizFormDataSchema = quizFormSchemas.formData;
export const quizFormSchema = quizFormSchemas.basic;
