"use server";

import { requireUser } from "../auth-server";
import {
  assessmentEvaluationInputSchema,
  baseSchemas,
  recalculateAnswerEvaluationsSchema,
} from "../schemas";
import {
  completeAssessmentEvaluation,
  evaluateAssessmentAnswer,
  recalculateAnswerEvaluations,
} from "../services/assessment-evaluation";
import { invalidateEvaluationCache } from "../utils/cache-utils";
import { runAction } from "./run-action";

/**
 * Score one answer of an assessment. The answer and the question are read on
 * the server; the client only names them.
 */
export async function evaluateAssessmentAnswerAction(
  assessmentId: string,
  questionId: string,
) {
  return runAction("evaluateAssessmentAnswerAction", async () => {
    await requireUser();

    const evaluation = await evaluateAssessmentAnswer(
      baseSchemas.id.parse(assessmentId),
      baseSchemas.id.parse(questionId),
    );

    return { evaluation };
  });
}

/**
 * Generate the overall evaluation of an assessment from the per-question
 * results and store it. The quiz score is computed on the server.
 */
export async function completeAssessmentEvaluationAction(input: unknown) {
  return runAction("completeAssessmentEvaluationAction", async () => {
    const user = await requireUser();
    const { assessmentId, questionEvaluations } =
      assessmentEvaluationInputSchema.parse(input);

    const result = await completeAssessmentEvaluation({
      assessmentId,
      questionEvaluations,
      userId: user.id,
    });

    invalidateEvaluationCache({
      evaluationId: result.evaluationId,
      assessmentId,
    });

    return result;
  });
}

/**
 * Store the per-answer detail ("Ricalcola dettaglio risposte") on an
 * evaluation saved without it. Only answerEvaluations is written: quizScore
 * and fitScore stay as they were.
 */
export async function recalculateAnswerEvaluationsAction(input: unknown) {
  return runAction("recalculateAnswerEvaluationsAction", async () => {
    await requireUser();
    const { assessmentId, questionEvaluations } =
      recalculateAnswerEvaluationsSchema.parse(input);

    const result = await recalculateAnswerEvaluations({
      assessmentId,
      questionEvaluations,
    });

    invalidateEvaluationCache({
      evaluationId: result.evaluationId,
      assessmentId,
    });

    return result;
  });
}
