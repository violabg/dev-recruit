import { z } from "zod";
import { baseSchemas } from "./base";

// ====================
// EVALUATION SCHEMAS
// ====================

export const evaluationResultSchema = z.object({
  evaluation: z
    .string()
    .describe("Una valutazione dettagliata della risposta del candidato"),
  score: baseSchemas.score.describe(
    "Un punteggio da 0 a 10, dove 10 è una risposta perfetta"
  ),
  strengths: z
    .array(z.string())
    .describe("I punti di forza della risposta del candidato"),
  weaknesses: z
    .array(z.string())
    .describe("Le aree di miglioramento nella risposta del candidato"),
});

export const overallEvaluationSchema = z.object({
  evaluation: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendation: z.string(),
  fitScore: z.number().min(0).max(100),
});

// ====================
// TYPE EXPORTS
// ====================

export type EvaluationResult = z.infer<typeof evaluationResultSchema>;
export type OverallEvaluation = z.infer<typeof overallEvaluationSchema>;
