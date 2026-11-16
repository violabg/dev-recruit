"use server";

import { requireUser } from "../auth-server";
import { assessmentEvaluationInputSchema, baseSchemas } from "../schemas";
import {
  completeAssessmentEvaluation,
  evaluateAssessmentAnswer,
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
