/**
 * Shapes the model must produce for questions, one variant per question type.
 *
 * Used only as the schema sent to the model (strict structured outputs): each
 * variant carries exactly the fields of its type, so the model cannot mix
 * them or return an unrequested type. The output is still validated by the
 * app schemas (questionSchemas.flexible, aiQuizGenerationSchema).
 */

import { z } from "zod";
import type { QuestionType } from "../../schemas";

const keywords = z.array(z.string());

const VARIANTS = {
  multiple_choice: z.object({
    type: z.enum(["multiple_choice"]),
    question: z.string(),
    options: z.array(z.string()),
    correctAnswer: z.int(),
    keywords,
    explanation: z.string(),
  }),
  open_question: z.object({
    type: z.enum(["open_question"]),
    question: z.string(),
    sampleAnswer: z.string(),
    keywords,
    explanation: z.string(),
  }),
  code_snippet: z.object({
    type: z.enum(["code_snippet"]),
    question: z.string(),
    codeSnippet: z.string(),
    sampleSolution: z.string(),
    language: z.string(),
    keywords,
    explanation: z.string(),
  }),
  behavioral_scenario: z.object({
    type: z.enum(["behavioral_scenario"]),
    question: z.string(),
    sampleAnswer: z.string(),
    keywords,
    explanation: z.string(),
  }),
} as const satisfies Record<QuestionType, z.ZodObject>;

const ALL_TYPES = Object.keys(VARIANTS) as QuestionType[];

/**
 * Output shape of one question of the given types; with `withCriteria` every
 * variant also has `criterionKeys`.
 */
export function questionOutputSchema(
  types: QuestionType[],
  withCriteria = false,
): z.ZodType {
  const selected: z.ZodType[] = (types.length > 0 ? types : ALL_TYPES).map((type) =>
    withCriteria
      ? VARIANTS[type].extend({ criterionKeys: z.array(z.string()) })
      : VARIANTS[type],
  );
  return selected.length === 1
    ? selected[0]
    : z.union(selected as [z.ZodType, z.ZodType, ...z.ZodType[]]);
}

/** Output shape of a whole quiz */
export function quizOutputSchema(
  types: QuestionType[],
  withCriteria = false,
): z.ZodType {
  return z.object({
    title: z.string(),
    questions: z.array(questionOutputSchema(types, withCriteria)),
  });
}
