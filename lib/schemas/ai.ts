import { z } from "zod/v4";
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
