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
