"use server";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import { removeQuestionFromQuizSchema } from "../schemas";
import {
  invalidateQuestionCache,
  invalidateQuizCache,
} from "../utils/cache-utils";
import type { ActionResult } from "../utils/action-result";
import { runAction, UserError } from "./run-action";

/**
 * Toggle favorite status of a question
 */
export async function toggleQuestionFavoriteAction(questionId: string) {
  return runAction("toggleQuestionFavoriteAction", async () => {
    await requireUser();

    if (!questionId) {
      throw new UserError("La domanda è obbligatoria");
    }

    // Get current favorite status
    const existing = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, isFavorite: true },
    });

    if (!existing) {
      throw new UserError("Domanda non trovata");
    }

    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        isFavorite: !existing.isFavorite,
      },
    });

    // Invalidate cache
    invalidateQuestionCache({ questionId });

    return { isFavorite: question.isFavorite };
  });
}

/**
 * Delete a question from a quiz.
 * The Question row is deleted only when the question is not a favorite and no
 * other quiz links it (the same rule the quiz save applies): otherwise only
 * this quiz's link is removed and the question stays available.
 */
export async function deleteQuestionFromQuizAction(
  quizId: string,
  questionId: string,
): Promise<
  ActionResult<{
    wasDeleted: boolean;
    wasFavorite: boolean;
    wasLinkedElsewhere: boolean;
  }>
> {
  return runAction("deleteQuestionFromQuizAction", async () => {
    await requireUser();

    const validatedInput = removeQuestionFromQuizSchema.parse({
      quizId,
      questionId,
    });

    const question = await prisma.question.findUnique({
      where: { id: validatedInput.questionId },
      select: { id: true, isFavorite: true },
    });

    if (!question) {
      throw new UserError("Domanda non trovata");
    }

    const links = await prisma.quizQuestion.findMany({
      where: { questionId: validatedInput.questionId },
      select: { quizId: true },
    });
    const linkedElsewhere = links.some(
      (link) => link.quizId !== validatedInput.quizId,
    );
    const canDelete = !question.isFavorite && !linkedElsewhere;

    if (canDelete) {
      // The cascade removes this quiz's link as well
      await prisma.question.delete({
        where: { id: validatedInput.questionId },
      });
      invalidateQuestionCache({ questionId: validatedInput.questionId });
    } else {
      // A favorite or shared question only loses this quiz's link
      await prisma.quizQuestion.deleteMany({
        where: {
          quizId: validatedInput.quizId,
          questionId: validatedInput.questionId,
        },
      });
    }

    invalidateQuizCache({ quizId: validatedInput.quizId });

    return {
      wasDeleted: canDelete,
      wasFavorite: question.isFavorite,
      wasLinkedElsewhere: linkedElsewhere,
    };
  });
}
