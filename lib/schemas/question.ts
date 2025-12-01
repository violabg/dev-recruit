import { z } from "zod/v4";
import { baseSchemas } from "./base";

// ====================
// UNIFIED QUESTION SCHEMAS
// ====================
// Enhanced question schema system with better type discrimination

// Base question schema with common fields
const baseQuestionSchema = z.object({
  question: z.string().min(1, "Question text is required"),
  keywords: z.array(z.string()).optional(),
  explanation: z.string().optional(),
});

// Specific question type schemas with strict validation
const multipleChoiceQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("multiple_choice"),
  options: z
    .array(z.string().min(3, "Each option must be at least 3 characters long"))
    .min(4, "Must be at least 4 options"),
  correctAnswer: z.coerce.number<number>().int().min(0).max(3),
});

const openQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("open_question"),
  sampleAnswer: z.string().min(1, "Sample answer required"),
  sampleSolution: z.string().optional(),
  codeSnippet: z.string().optional(),
});

const codeSnippetQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("code_snippet"),
  codeSnippet: z.string().min(1, "Code snippet required"),
  sampleSolution: z.string().min(1, "Sample solution required"),
  language: z.string().min(1, "Programming language required"),
});

// Question type schemas for automatic type inference
const questionTypeSchemas = [
  multipleChoiceQuestionSchema,
  openQuestionSchema,
  codeSnippetQuestionSchema,
] as const;

// Discriminated union for type safety
export const questionSchemas = {
  // Strict schema for runtime validation
  strict: z.discriminatedUnion("type", questionTypeSchemas),

  // Flexible schema for parsing AI responses and existing data
  // Note: 'dbId' is the Prisma database ID (optional for new questions)
  // We use 'dbId' instead of 'id' to avoid conflicts with React Hook Form's useFieldArray which adds its own 'id' property
  flexible: z
    .object({
      dbId: z.string().optional(), // Database ID for linked questions
      type: baseSchemas.questionType,
      question: z.string().min(1, "Question text required"),
      options: z.array(z.string()).optional(),
      correctAnswer: z.coerce.number<number>().optional(),
      explanation: z.string().optional(),
      sampleAnswer: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      language: z.string().optional(),
      codeSnippet: z.string().optional(),
      sampleSolution: z.string().optional(),
      isFavorite: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
      // For multiple choice questions, validate options
      if (data.type === "multiple_choice") {
        if (!data.options || data.options.length < 4) {
          ctx.issues.push({
            code: z.ZodIssueCode.custom,
            path: ["options"],
            error:
              "Multiple choice questions require at least 4 options (each with at least 3 characters) and correct answer within bounds",
            input: "",
          });
        }
        if (data.options) {
          data.options.forEach((option, index) => {
            if (option.length < 3) {
              ctx.issues.push({
                code: z.ZodIssueCode.custom,
                path: ["options", index],
                error: "Each option must be at least 3 characters long",
                input: "",
              });
            }
          });
        }
        if (
          data.correctAnswer !== undefined &&
          data.options !== undefined &&
          data.correctAnswer >= data.options.length
        ) {
          ctx.issues.push({
            code: z.ZodIssueCode.custom,
            path: ["correctAnswer"],
            error:
              "Multiple choice questions require at least 4 options (each with at least 3 characters) and correct answer within bounds",
            input: "",
          });
        }
      }
    }),

  // Individual schemas for targeted validation
  multipleChoice: multipleChoiceQuestionSchema,
  openQuestion: openQuestionSchema,
  codeSnippet: codeSnippetQuestionSchema,

  // Base schema for common fields
  base: baseQuestionSchema,
} as const;

// Type exports
export type Question = z.infer<typeof questionSchemas.strict>;
export type FlexibleQuestion = z.infer<typeof questionSchemas.flexible>;
export type MultipleChoiceQuestion = z.infer<
  typeof multipleChoiceQuestionSchema
>;
export type OpenQuestion = z.infer<typeof openQuestionSchema>;
export type CodeSnippetQuestion = z.infer<typeof codeSnippetQuestionSchema>;

// SavedQuestion is a FlexibleQuestion with required dbId (for questions loaded from DB)
export type SavedQuestion = FlexibleQuestion & { dbId: string };

// Type guards for runtime type checking
export const isMultipleChoiceQuestion = (
  q: Question | FlexibleQuestion
): q is MultipleChoiceQuestion => q.type === "multiple_choice";

export const isOpenQuestion = (
  q: Question | FlexibleQuestion
): q is OpenQuestion => q.type === "open_question";

export const isCodeSnippetQuestion = (
  q: Question | FlexibleQuestion
): q is CodeSnippetQuestion => q.type === "code_snippet";

// Question conversion utilities
export const convertToStrictQuestion = (
  flexibleQuestion: FlexibleQuestion
): Question => {
  // Ensure required fields are present for strict validation
  const normalizedQuestion = { ...flexibleQuestion };

  // For open questions, ensure sampleAnswer is present
  if (
    normalizedQuestion.type === "open_question" &&
    !normalizedQuestion.sampleAnswer
  ) {
    normalizedQuestion.sampleAnswer = "Sample answer to be provided";
  }

  // For code snippet questions, ensure required fields are present
  if (normalizedQuestion.type === "code_snippet") {
    if (!normalizedQuestion.sampleSolution) {
      normalizedQuestion.sampleSolution = "// Sample solution to be provided";
    }
    if (!normalizedQuestion.codeSnippet) {
      normalizedQuestion.codeSnippet = "// Code snippet to be provided";
    }
    if (!normalizedQuestion.language) {
      normalizedQuestion.language = "javascript";
    }
  }

  return questionSchemas.strict.parse(normalizedQuestion);
};

export const convertToStrictQuestions = (
  flexibleQuestions: FlexibleQuestion[]
): Question[] => {
  return flexibleQuestions.map(convertToStrictQuestion);
};
