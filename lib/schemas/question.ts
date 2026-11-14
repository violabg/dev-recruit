import { z } from "zod";
import { baseSchemas } from "./base";

// ====================
// UNIFIED QUESTION SCHEMAS
// ====================
// Enhanced question schema system with better type discrimination

// Base question schema with common fields
const baseQuestionSchema = z.object({
  question: z.string().min(1, "Il testo della domanda è obbligatorio"),
  keywords: z.array(z.string()).optional(),
  explanation: z.string().optional(),
});

// Specific question type schemas with strict validation
const multipleChoiceQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("multiple_choice"),
  options: z
    .array(
      z.string().min(3, "Ogni opzione deve contenere almeno 3 caratteri"),
    )
    .min(4, "Servono almeno 4 opzioni"),
  correctAnswer: z.coerce.number<number>().int().min(0).max(3),
});

const openQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("open_question"),
  sampleAnswer: z.string().min(1, "La risposta di esempio è obbligatoria"),
  sampleSolution: z.string().optional(),
  codeSnippet: z.string().optional(),
});

const behavioralScenarioQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("behavioral_scenario"),
  sampleAnswer: z.string().min(1, "La risposta di esempio è obbligatoria"),
});

const codeSnippetQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("code_snippet"),
  codeSnippet: z.string().min(1, "Lo snippet di codice è obbligatorio"),
  sampleSolution: z.string().min(1, "La soluzione di esempio è obbligatoria"),
  language: z.string().min(1, "Il linguaggio di programmazione è obbligatorio"),
});

// Question type schemas for automatic type inference
const questionTypeSchemas = [
  multipleChoiceQuestionSchema,
  openQuestionSchema,
  codeSnippetQuestionSchema,
  behavioralScenarioQuestionSchema,
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
      question: z.string().min(1, "Il testo della domanda è obbligatorio"),
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
            code: "custom",
            path: ["options"],
            error:
              "Le domande a scelta multipla richiedono almeno 4 opzioni (ognuna di almeno 3 caratteri) e una risposta corretta entro i limiti",
            input: "",
          });
        }
        if (data.options) {
          data.options.forEach((option, index) => {
            if (option.length < 3) {
              ctx.issues.push({
                code: "custom",
                path: ["options", index],
                error: "Ogni opzione deve contenere almeno 3 caratteri",
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
            code: "custom",
            path: ["correctAnswer"],
            error:
              "Le domande a scelta multipla richiedono almeno 4 opzioni (ognuna di almeno 3 caratteri) e una risposta corretta entro i limiti",
            input: "",
          });
        }
      }
    }),

  // Individual schemas for targeted validation
  multipleChoice: multipleChoiceQuestionSchema,
  openQuestion: openQuestionSchema,
  codeSnippet: codeSnippetQuestionSchema,
  behavioralScenario: behavioralScenarioQuestionSchema,

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
export type BehavioralScenarioQuestion = z.infer<
  typeof behavioralScenarioQuestionSchema
>;

// SavedQuestion is a FlexibleQuestion with required dbId (for questions loaded from DB)
export type SavedQuestion = FlexibleQuestion & { dbId: string };

// Type guards for runtime type checking
export const isMultipleChoiceQuestion = (
  q: Question | FlexibleQuestion,
): q is MultipleChoiceQuestion => q.type === "multiple_choice";

export const isOpenQuestion = (
  q: Question | FlexibleQuestion,
): q is OpenQuestion => q.type === "open_question";

export const isCodeSnippetQuestion = (
  q: Question | FlexibleQuestion,
): q is CodeSnippetQuestion => q.type === "code_snippet";

export const isBehavioralScenarioQuestion = (
  q: Question | FlexibleQuestion,
): q is BehavioralScenarioQuestion => q.type === "behavioral_scenario";

// Question conversion utilities
export const convertToStrictQuestion = (
  flexibleQuestion: FlexibleQuestion,
): Question => {
  // Ensure required fields are present for strict validation
  const normalizedQuestion = { ...flexibleQuestion };

  // For open questions, ensure sampleAnswer is present
  if (
    normalizedQuestion.type === "open_question" &&
    !normalizedQuestion.sampleAnswer
  ) {
    normalizedQuestion.sampleAnswer = "Risposta di esempio da fornire";
  }

  if (
    normalizedQuestion.type === "behavioral_scenario" &&
    !normalizedQuestion.sampleAnswer
  ) {
    normalizedQuestion.sampleAnswer = "Risposta di esempio da fornire";
  }

  // For code snippet questions, ensure required fields are present
  if (normalizedQuestion.type === "code_snippet") {
    if (!normalizedQuestion.sampleSolution) {
      normalizedQuestion.sampleSolution = "// Soluzione di esempio da fornire";
    }
    if (!normalizedQuestion.codeSnippet) {
      normalizedQuestion.codeSnippet = "// Snippet di codice da fornire";
    }
    if (!normalizedQuestion.language) {
      normalizedQuestion.language = "javascript";
    }
  }

  return questionSchemas.strict.parse(normalizedQuestion);
};

export const convertToStrictQuestions = (
  flexibleQuestions: FlexibleQuestion[],
): Question[] => {
  return flexibleQuestions.map(convertToStrictQuestion);
};

/**
 * Input for removing a question from a quiz
 */
export const removeQuestionFromQuizSchema = z.object({
  quizId: z.string().min(1, "Il quiz è obbligatorio"),
  questionId: z.string().min(1, "La domanda è obbligatoria"),
});
