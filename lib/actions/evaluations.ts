"use server";

import { requireUser } from "../auth-server";
import { baseSchemas, interviewEvaluationInputSchema } from "../schemas";
import {
  completeInterviewEvaluation,
  evaluateInterviewAnswer,
} from "../services/interview-evaluation";
import { invalidateEvaluationCache } from "../utils/cache-utils";
import { runAction } from "./run-action";

/**
 * Score one answer of an interview. The answer and the question are read on
 * the server; the client only names them.
 */
export async function evaluateInterviewAnswerAction(
  interviewId: string,
  questionId: string,
) {
  return runAction("evaluateInterviewAnswerAction", async () => {
    await requireUser();

    const evaluation = await evaluateInterviewAnswer(
      baseSchemas.id.parse(interviewId),
      baseSchemas.id.parse(questionId),
    );

    return { evaluation };
  });
}

/**
 * Generate the overall evaluation of an interview from the per-question
 * results and store it. The quiz score is computed on the server.
 */
export async function completeInterviewEvaluationAction(input: unknown) {
  return runAction("completeInterviewEvaluationAction", async () => {
    const user = await requireUser();
    const { interviewId, questionEvaluations } =
      interviewEvaluationInputSchema.parse(input);

    const result = await completeInterviewEvaluation({
      interviewId,
      questionEvaluations,
      userId: user.id,
    });

    invalidateEvaluationCache({
      evaluationId: result.evaluationId,
      interviewId,
    });

    return result;
  });
}
