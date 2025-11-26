import { z } from "zod/v4";
import { baseSchemas } from "./base";

// ====================
// DATABASE QUESTION ENTITY SCHEMAS
// ====================
// Schemas for the Question entity stored in the database
// This is different from the inline question schemas used for AI generation

/**
 * Schema for creating a new question in the database
 */
export const createQuestionSchema = z
  .object({
    type: baseSchemas.questionType,
    question: z.string().min(1, "Question text is required"),
    keywords: z.array(z.string()).default([]),
    explanation: z.string().optional(),

    // Multiple choice fields
    options: z.array(z.string()).default([]),
    correctAnswer: z.int().min(0).max(3).optional(),

    // Open question fields
    sampleAnswer: z.string().optional(),

    // Code snippet fields
    codeSnippet: z.string().optional(),
    sampleSolution: z.string().optional(),
    language: z.string().optional(),

    // Favorites
    isFavorite: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    // Validate multiple choice questions
    if (data.type === "multiple_choice") {
      if (!data.options || data.options.length < 4) {
        ctx.issues.push({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          error: "Multiple choice questions require at least 4 options",
          input: data.options,
        });
      }
      if (data.correctAnswer === undefined) {
        ctx.issues.push({
          code: z.ZodIssueCode.custom,
          path: ["correctAnswer"],
          error: "Multiple choice questions require a correct answer",
          input: data.correctAnswer,
        });
      }
    }

    // Validate open questions
    if (data.type === "open_question") {
      if (!data.sampleAnswer) {
        ctx.issues.push({
          code: z.ZodIssueCode.custom,
          path: ["sampleAnswer"],
          error: "Open questions require a sample answer",
          input: data.sampleAnswer,
        });
      }
    }

    // Validate code snippet questions
    if (data.type === "code_snippet") {
      if (!data.codeSnippet) {
        ctx.issues.push({
          code: z.ZodIssueCode.custom,
          path: ["codeSnippet"],
          error: "Code snippet questions require a code snippet",
          input: data.codeSnippet,
        });
      }
      if (!data.sampleSolution) {
        ctx.issues.push({
          code: z.ZodIssueCode.custom,
          path: ["sampleSolution"],
          error: "Code snippet questions require a sample solution",
          input: data.sampleSolution,
        });
      }
      if (!data.language) {
        ctx.issues.push({
          code: z.ZodIssueCode.custom,
          path: ["language"],
          error: "Code snippet questions require a language",
          input: data.language,
        });
      }
    }
  });

/**
 * Schema for updating an existing question
 */
export const updateQuestionSchema = createQuestionSchema.partial().extend({
  id: z.string().min(1, "Question ID is required"),
});

/**
 * Schema for the full question entity (from database)
 */
export const questionEntitySchema = z.object({
  id: z.string(),
  type: baseSchemas.questionType,
  question: z.string(),
  keywords: z.array(z.string()),
  explanation: z.string().nullable(),

  // Multiple choice fields
  options: z.array(z.string()),
  correctAnswer: z.int().nullable(),

  // Open question fields
  sampleAnswer: z.string().nullable(),

  // Code snippet fields
  codeSnippet: z.string().nullable(),
  sampleSolution: z.string().nullable(),
  language: z.string().nullable(),

  // Favorites
  isFavorite: z.boolean(),

  // Metadata
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Schema for adding questions to a quiz
 */
export const addQuestionsToQuizSchema = z.object({
  quizId: z.string().min(1, "Quiz ID is required"),
  questionIds: z.array(z.string()).min(1, "At least one question is required"),
});

/**
 * Schema for removing a question from a quiz
 */
export const removeQuestionFromQuizSchema = z.object({
  quizId: z.string().min(1, "Quiz ID is required"),
  questionId: z.string().min(1, "Question ID is required"),
});

/**
 * Schema for reordering questions in a quiz
 */
export const reorderQuizQuestionsSchema = z.object({
  quizId: z.string().min(1, "Quiz ID is required"),
  questionIds: z.array(z.string()).min(1, "At least one question is required"),
});

/**
 * Schema for filtering questions
 */
export const questionFilterSchema = z.object({
  type: baseSchemas.questionType.optional(),
  isFavorite: z.boolean().optional(),
  search: z.string().optional(),
  page: z.int().min(1).default(1),
  limit: z.int().min(1).max(100).default(20),
});

// Type exports
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type QuestionEntity = z.infer<typeof questionEntitySchema>;
export type AddQuestionsToQuizInput = z.infer<typeof addQuestionsToQuizSchema>;
export type RemoveQuestionFromQuizInput = z.infer<
  typeof removeQuestionFromQuizSchema
>;
export type ReorderQuizQuestionsInput = z.infer<
  typeof reorderQuizQuestionsSchema
>;
export type QuestionFilterInput = z.infer<typeof questionFilterSchema>;
