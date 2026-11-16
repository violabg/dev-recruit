import { z } from "zod";

// ====================
// ASSESSMENT ANSWER SCHEMAS
// ====================
// Shared schemas for the candidate answering an assessment question.
// The answer is either an open text, the index of a chosen option or a code
// snippet, so the action and the form validate the same union.

export const assessmentAnswerSchema = z.union([
  z.string().min(1, "La risposta non può essere vuota"),
  z.number().int().min(0, "L'indice della risposta non è valido"),
  z.object({
    code: z.string().min(1, "Il codice non può essere vuoto"),
  }),
]);

export const submitAnswerSchema = z.object({
  token: z.string().min(1, "Il token del test è obbligatorio"),
  questionId: z.string().min(1, "La domanda è obbligatoria"),
  answer: assessmentAnswerSchema,
});

export const transcriptionRequestSchema = z.object({
  token: z.string().min(1, "Il token del test è obbligatorio"),
});

// ====================
// TYPE EXPORTS
// ====================

export type AssessmentAnswer = z.infer<typeof assessmentAnswerSchema>;
