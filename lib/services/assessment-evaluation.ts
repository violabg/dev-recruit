/**
 * Assessment evaluation
 *
 * Scores the answers of a completed Assessment and stores the resulting
 * Evaluation. Answers and questions are always read from the database: the
 * caller only says which assessment (and which question) to evaluate.
 */

import prisma from "../prisma";
import {
  evaluationResultSchema,
  overallEvaluationSchema,
  type AnswerEvaluations,
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

async function loadAssessment(assessmentId: string) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
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
            select: { order: true, criterionIds: true, question: true },
          },
        },
      },
    },
  });

  if (!assessment) {
    throw new UserError("Test non trovato");
  }

  const questions: SavedQuestion[] = mapQuizQuestionsToFlexible(
    assessment.quiz.quizQuestions,
  );
  const answers = (assessment.answers as StoredAnswers | null) ?? {};

  return { assessment, questions, answers };
}

type PerQuestionResults = Record<
  string,
  Pick<QuestionEvaluation, "score" | "strengths" | "weaknesses">
>;

/** Ids of the questions of the assessment that have an answer */
function answeredQuestionIds(
  questions: SavedQuestion[],
  answers: StoredAnswers,
): Set<string> {
  return new Set(
    questions
      .filter((q) => answerToText(q, answers[q.dbId]) !== null)
      .map((q) => q.dbId),
  );
}

/**
 * Stored per-answer detail: for each question id only score (0-10),
 * strengths and weaknesses.
 */
function toAnswerEvaluations(results: PerQuestionResults): AnswerEvaluations {
  return Object.fromEntries(
    Object.entries(results).map(([questionId, result]) => [
      questionId,
      {
        score: result.score,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
      },
    ]),
  );
}

/**
 * Score one answer of an assessment with the AI evaluator.
 */
export async function evaluateAssessmentAnswer(
  assessmentId: string,
  questionId: string,
): Promise<QuestionEvaluation> {
  const { questions, answers } = await loadAssessment(assessmentId);

  const question = questions.find((q) => q.dbId === questionId);
  if (!question) {
    throw new UserError("Domanda non trovata in questo test");
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
 * answered question of this assessment are rejected.
 */
export async function completeAssessmentEvaluation(params: {
  assessmentId: string;
  questionEvaluations: PerQuestionResults;
  userId: string;
}): Promise<{
  evaluationId: string;
  overall: OverallEvaluation;
  quizScore: number;
}> {
  const { assessmentId, questionEvaluations, userId } = params;
  const { assessment, questions, answers } =
    await loadAssessment(assessmentId);

  if (assessment.evaluation) {
    throw new UserError("Esiste già una valutazione per questo test");
  }

  const answeredIds = answeredQuestionIds(questions, answers);

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
    `${assessment.candidate.firstName} ${assessment.candidate.lastName}`.trim();

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
      title: assessment.quiz.title,
      assessmentId: assessment.id,
      evaluation: overall.evaluation,
      strengths: overall.strengths,
      weaknesses: overall.weaknesses,
      recommendation: overall.recommendation,
      fitScore: Math.round(overall.fitScore / 10), // 0-100 -> 0-10
      quizScore,
      // Per-answer detail, shown again when the evaluation is reopened
      answerEvaluations: toAnswerEvaluations(questionEvaluations),
      createdBy: userId,
    },
    select: { id: true },
  });

  return { evaluationId: evaluation.id, overall, quizScore };
}

/**
 * Store the per-answer detail on an evaluation saved without it.
 * The per-question results come from evaluateAssessmentAnswer; this function
 * neither calls the AI nor recomputes a score: it writes `answerEvaluations`
 * only, so quizScore, fitScore and the overall texts never change.
 */
export async function recalculateAnswerEvaluations(params: {
  assessmentId: string;
  questionEvaluations: PerQuestionResults;
}): Promise<{ evaluationId: string; answerEvaluations: AnswerEvaluations }> {
  const { assessmentId, questionEvaluations } = params;
  const { questions, answers } = await loadAssessment(assessmentId);

  const evaluation = await prisma.evaluation.findUnique({
    where: { assessmentId },
    select: { id: true },
  });
  if (!evaluation) {
    throw new UserError("Valutazione non trovata");
  }

  const evaluated = Object.keys(questionEvaluations);
  if (evaluated.length === 0) {
    throw new UserError("Nessuna risposta valutata");
  }

  const answeredIds = answeredQuestionIds(questions, answers);
  if (evaluated.some((questionId) => !answeredIds.has(questionId))) {
    throw new UserError("Una o più domande non hanno una risposta");
  }

  const answerEvaluations = toAnswerEvaluations(questionEvaluations);

  await prisma.evaluation.update({
    where: { id: evaluation.id },
    data: { answerEvaluations },
  });

  return { evaluationId: evaluation.id, answerEvaluations };
}
