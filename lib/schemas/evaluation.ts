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
    "Un punteggio da 0 a 10, dove 10 è una risposta perfetta",
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

// Body of POST /api/evaluations/stream
export const resumeEvaluationRequestSchema = z.object({
  candidateId: baseSchemas.id,
  positionId: baseSchemas.id,
});

// Input of completeInterviewEvaluationAction: per-question results keyed by
// question id
export const interviewEvaluationInputSchema = z.object({
  interviewId: baseSchemas.id,
  questionEvaluations: z.record(
    z.string(),
    evaluationResultSchema.extend({ maxScore: z.number().optional() }),
  ),
});

// Input of updateEvaluationNotesAction
export const evaluationNotesSchema = z.object({
  id: baseSchemas.id,
  notes: z.string().max(10000, "Le note non possono superare 10000 caratteri"),
});

export const behavioralRubricSchema = z.object({
  candidateId: baseSchemas.id,
  positionId: baseSchemas.id,
  communicationScore: z.number().int().min(1).max(5),
  collaborationScore: z.number().int().min(1).max(5),
  problemSolvingScore: z.number().int().min(1).max(5),
  cultureFitScore: z.number().int().min(1).max(5),
  leadershipScore: z.number().int().min(1).max(5).optional(),
  strengthExamples: z.array(z.string().min(2)),
  improvementAreas: z.array(z.string().min(2)),
  overallComments: z.string().optional(),
});

export const hiringNotesSchema = z
  .object({
    evaluationId: baseSchemas.id,
    interviewNotes: z.string().min(2).optional(),
    redFlags: z.array(z.string().min(2)).optional(),
    standoutMoments: z.array(z.string().min(2)).optional(),
    hireRecommendation: z
      .enum(["strong_yes", "yes", "maybe", "no", "strong_no"])
      .optional(),
    nextSteps: z.string().min(2).optional(),
  })
  .refine(
    (data) =>
      !!(
        data.interviewNotes ||
        (data.redFlags && data.redFlags.length > 0) ||
        (data.standoutMoments && data.standoutMoments.length > 0) ||
        data.hireRecommendation ||
        data.nextSteps
      ),
    {
      message: "Inserisci almeno un campo da aggiornare",
      path: ["interviewNotes"],
    },
  );

// ====================
// TYPE EXPORTS
// ====================

export type EvaluationResult = z.infer<typeof evaluationResultSchema>;
export type OverallEvaluation = z.infer<typeof overallEvaluationSchema>;
