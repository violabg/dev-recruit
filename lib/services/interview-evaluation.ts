/**
 * Interview evaluation
 *
 * Scores the answers of a completed Interview and stores the resulting
 * Evaluation. Answers and questions are always read from the database: the
 * caller only says which interview (and which question) to evaluate.
 */

import prisma from "../prisma";
import {
  evaluationResultSchema,
  overallEvaluationSchema,
  type EvaluationResult,
  type FlexibleQuestion,
  type OverallEvaluation,
  type SavedQuestion,
} from "../schemas";
import { mapQuizQuestionsToFlexible } from "../utils/question-utils";
import {
  ANSWER_EVALUATION_SYSTEM_PROMPT,
  buildAnswerEvaluationPrompt,
  buildOverallEvaluationPrompt,
  OVERALL_EVALUATION_SYSTEM_PROMPT,
} from "./ai/evaluation-prompts";
import { generateStructured } from "./ai/generate";
import { UserError } from "./user-error";

/** Maximum score of a single question */
export const QUESTION_MAX_SCORE = 10;

export type QuestionEvaluation = EvaluationResult & { maxScore: number };

type StoredAnswers = Record<string, unknown>;

/**
 * Turn a stored answer into the text handed to the evaluator.
 * Returns null when the question was not answered.
 *
 * - multiple_choice: the index of the selected option, as a string
 * - code_snippet: stored as `{ code }` (older answers may be plain strings)
 * - open_question / behavioral_scenario: plain text
 */
export function answerToText(
  question: Pick<FlexibleQuestion, "type">,
  rawAnswer: unknown,
): string | null {
  if (rawAnswer === undefined || rawAnswer === null || rawAnswer === "") {
    return null;
  }

  if (
    question.type === "code_snippet" &&
    typeof rawAnswer === "object" &&
    "code" in rawAnswer
  ) {
    const code = (rawAnswer as { code: unknown }).code;
    return code ? String(code) : null;
  }

  return String(rawAnswer);
}

/**
 * Quiz score as a 0-100 percentage of the points available on the
 * evaluated questions.
 */
export function computeQuizScore(
  evaluations: Pick<QuestionEvaluation, "score">[],
): number {
  if (evaluations.length === 0) return 0;
  const total = evaluations.reduce((sum, item) => sum + item.score, 0);
  const max = evaluations.length * QUESTION_MAX_SCORE;
  return Math.round((total / max) * 100);
}

async function loadInterview(interviewId: string) {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    select: {
      id: true,
      answers: true,
      candidate: { select: { firstName: true, lastName: true } },
      evaluation: { select: { id: true } },
      quiz: {
        select: {
          title: true,
          quizQuestions: {
            orderBy: { order: "asc" },
            select: { order: true, question: true },
          },
        },
      },
    },
  });

  if (!interview) {
    throw new UserError("Colloquio non trovato");
  }

  const questions: SavedQuestion[] = mapQuizQuestionsToFlexible(
    interview.quiz.quizQuestions,
  );
  const answers = (interview.answers as StoredAnswers | null) ?? {};

  return { interview, questions, answers };
}

/**
 * Score one answer of an interview with the AI evaluator.
 */
export async function evaluateInterviewAnswer(
  interviewId: string,
  questionId: string,
): Promise<QuestionEvaluation> {
  const { questions, answers } = await loadInterview(interviewId);

  const question = questions.find((q) => q.dbId === questionId);
  if (!question) {
    throw new UserError("Domanda non trovata in questo colloquio");
  }

  const answer = answerToText(question, answers[questionId]);
  if (answer === null) {
    throw new UserError("Il candidato non ha risposto a questa domanda");
  }

  const result = await generateStructured({
    task: "evaluation",
    schema: evaluationResultSchema,
    system: ANSWER_EVALUATION_SYSTEM_PROMPT,
    prompt: buildAnswerEvaluationPrompt(question, answer),
    // Deterministic, reproducible scoring
    temperature: 0,
    seed: 42,
  });

  return { ...result, maxScore: QUESTION_MAX_SCORE };
}

/**
 * Build the overall evaluation from the per-question results and store it.
 * `questionEvaluations` is keyed by question id; ids that do not belong to an
 * answered question of this interview are rejected.
 */
export async function completeInterviewEvaluation(params: {
  interviewId: string;
  questionEvaluations: Record<string, Pick<
    QuestionEvaluation,
    "score" | "strengths" | "weaknesses"
  >>;
  userId: string;
}): Promise<{
  evaluationId: string;
  overall: OverallEvaluation;
  quizScore: number;
}> {
  const { interviewId, questionEvaluations, userId } = params;
  const { interview, questions, answers } = await loadInterview(interviewId);

  if (interview.evaluation) {
    throw new UserError("Esiste già una valutazione per questo colloquio");
  }

  const answeredIds = new Set(
    questions
      .filter((q) => answerToText(q, answers[q.dbId]) !== null)
      .map((q) => q.dbId),
  );

  const evaluated = Object.entries(questionEvaluations);
  if (evaluated.length === 0) {
    throw new UserError("Nessuna risposta valutata");
  }
  if (evaluated.some(([questionId]) => !answeredIds.has(questionId))) {
    throw new UserError("La valutazione contiene domande non valide");
  }

  const results = evaluated.map(([, result]) => result);
  const quizScore = computeQuizScore(results);
  const candidateName =
    `${interview.candidate.firstName} ${interview.candidate.lastName}`.trim();

  const overall = await generateStructured({
    task: "overall_evaluation",
    schema: overallEvaluationSchema,
    system: OVERALL_EVALUATION_SYSTEM_PROMPT,
    prompt: buildOverallEvaluationPrompt({
      candidateName,
      answeredCount: answeredIds.size,
      totalCount: questions.length,
      percentageScore: quizScore,
      evaluations: results,
    }),
    temperature: 0,
    seed: 42,
  });

  const evaluation = await prisma.evaluation.create({
    data: {
      title: interview.quiz.title,
      interviewId: interview.id,
      evaluation: overall.evaluation,
      strengths: overall.strengths,
      weaknesses: overall.weaknesses,
      recommendation: overall.recommendation,
      fitScore: Math.round(overall.fitScore / 10), // 0-100 -> 0-10
      quizScore,
      createdBy: userId,
    },
    select: { id: true },
  });

  return { evaluationId: evaluation.id, overall, quizScore };
}
