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

// Input of completeAssessmentEvaluationAction: per-question results keyed by
// question id
export const assessmentEvaluationInputSchema = z.object({
  assessmentId: baseSchemas.id,
  questionEvaluations: z.record(
    z.string(),
    evaluationResultSchema.extend({ maxScore: z.number().optional() }),
  ),
});

// Stored shape of Evaluation.answerEvaluations (keyed by Question id)
export const answerEvaluationSchema = z.object({
  score: baseSchemas.score,
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

export const answerEvaluationsSchema = z.record(
  z.string(),
  answerEvaluationSchema,
);

// Input of recalculateAnswerEvaluationsAction (same per-question payload as
// assessmentEvaluationInputSchema)
export const recalculateAnswerEvaluationsSchema =
  assessmentEvaluationInputSchema;

// Stored shape of Evaluation.criteriaAssessment (keyed by ScorecardCriterion
// id): score 1-5, or null when the CV gives no evidence
export const criterionAssessmentSchema = z.object({
  score: z.int().min(1).max(5).nullable(),
  evidence: z.string(),
});

export const criteriaAssessmentSchema = z.record(
  z.string(),
  criterionAssessmentSchema,
);

// Shape the model returns for a CV evaluation: the overall fields plus the
// criteria by key (C1, C2, ...). Any number is accepted here: the save rounds
// and clamps it to 1-5 before validating the stored shape.
export const resumeEvaluationResultSchema = overallEvaluationSchema.extend({
  criteriaAssessment: z
    .array(
      z.object({
        criterionKey: z.string(),
        score: z.number().nullable(),
        evidence: z.string(),
      }),
    )
    .optional(),
});

// Input of updateEvaluationNotesAction
export const evaluationNotesSchema = z.object({
  id: baseSchemas.id,
  notes: z.string().max(10000, "Le note non possono superare 10000 caratteri"),
});

// ====================
// TYPE EXPORTS
// ====================

export type EvaluationResult = z.infer<typeof evaluationResultSchema>;
export type OverallEvaluation = z.infer<typeof overallEvaluationSchema>;
export type AnswerEvaluations = z.infer<typeof answerEvaluationsSchema>;
export type CriteriaAssessment = z.infer<typeof criteriaAssessmentSchema>;
export type ResumeEvaluationResult = z.infer<
  typeof resumeEvaluationResultSchema
>;
