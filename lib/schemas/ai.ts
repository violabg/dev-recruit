import { z } from "zod";
import { baseSchemas } from "./base";

// ====================
// AI GENERATION SCHEMAS
// ====================

export const aiGenerationSchema = z.object({
  instructions: baseSchemas.instructions,
  llmModel: z.string(),
  difficulty: baseSchemas.difficulty.optional(),
});

// ====================
// TYPE EXPORTS
// ====================

export type AIGenerationFormData = z.infer<typeof aiGenerationSchema>;

// Options of the "generate question with AI" dialog
export const questionGenerationOptionsSchema = z.object({
  instructions: z.string().optional(),
  llmModel: z.string().min(1, "Seleziona un modello"),
  difficulty: z.number().min(1).max(5).optional(),

  // Multiple choice
  focusAreas: z.array(z.string()).optional(),
  distractorComplexity: z.enum(["simple", "moderate", "complex"]).optional(),

  // Open question / behavioral scenario
  expectedResponseLength: z.enum(["short", "medium", "long"]).optional(),
  evaluationCriteria: z.array(z.string()).optional(),

  // Code snippet
  language: z.string().optional(),
  bugType: z.enum(["syntax", "logic", "performance", "security"]).optional(),
  codeComplexity: z.enum(["basic", "intermediate", "advanced"]).optional(),
  includeComments: z.boolean().optional(),
});

export type QuestionGenerationOptions = z.infer<
  typeof questionGenerationOptionsSchema
>;

// ====================
// SINGLE QUESTION GENERATION PARAMETERS
// ====================
// Validates the input of generateNewQuestionAction. The parsed value is
// assignable to `GenerateQuestionParams` of lib/services/ai/types.ts.

const generateQuestionBaseSchema = z.object({
  quizTitle: z.string().min(1, "Il titolo del quiz è obbligatorio"),
  positionTitle: z.string().min(1, "Il titolo della posizione è obbligatorio"),
  experienceLevel: z
    .string()
    .min(1, "Il livello di esperienza è obbligatorio"),
  skills: z.array(z.string()).min(1, "Serve almeno una competenza"),
  difficulty: z.number().min(1).max(5).optional(),
  previousQuestions: z
    .array(
      z.object({
        question: z.string(),
        type: z.string().optional(),
      }),
    )
    .optional(),
  specificModel: z.string().optional(),
  instructions: z.string().optional(),
});

const generateMultipleChoiceParamsSchema = generateQuestionBaseSchema.extend({
  type: z.literal("multiple_choice"),
  focusAreas: z.array(z.string()).optional(),
  distractorComplexity: z
    .enum(["simple", "moderate", "complex"])
    .optional(),
});

const generateOpenQuestionParamsSchema = generateQuestionBaseSchema.extend({
  type: z.literal("open_question"),
  expectedResponseLength: z.enum(["short", "medium", "long"]).optional(),
  evaluationCriteria: z.array(z.string()).optional(),
});

const generateCodeSnippetParamsSchema = generateQuestionBaseSchema.extend({
  type: z.literal("code_snippet"),
  language: z.string().optional(),
  bugType: z.enum(["syntax", "logic", "performance", "security"]).optional(),
  codeComplexity: z.enum(["basic", "intermediate", "advanced"]).optional(),
  includeComments: z.boolean().optional(),
});

const generateBehavioralScenarioParamsSchema =
  generateQuestionBaseSchema.extend({
    type: z.literal("behavioral_scenario"),
    expectedResponseLength: z.enum(["short", "medium", "long"]).optional(),
    evaluationCriteria: z.array(z.string()).optional(),
  });

export const generateQuestionParamsSchema = z.discriminatedUnion("type", [
  generateMultipleChoiceParamsSchema,
  generateOpenQuestionParamsSchema,
  generateCodeSnippetParamsSchema,
  generateBehavioralScenarioParamsSchema,
]);

export type GenerateQuestionParamsInput = z.infer<
  typeof generateQuestionParamsSchema
>;
