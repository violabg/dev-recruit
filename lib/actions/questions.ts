"use server";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import { removeQuestionFromQuizSchema } from "../schemas";
import { QuizErrorCode, QuizSystemError } from "../services/error-handler";
import {
  invalidateQuestionCache,
  invalidateQuizCache,
} from "../utils/cache-utils";
import { runAction } from "./run-action";

/**
 * Toggle favorite status of a question
 */
export async function toggleQuestionFavoriteAction(questionId: string) {
  return runAction("toggleQuestionFavoriteAction", async () => {
    await requireUser();

    if (!questionId) {
      throw new QuizSystemError(
        "Question ID is required",
        QuizErrorCode.INVALID_INPUT
      );
    }

    // Get current favorite status
    const existing = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, isFavorite: true },
    });

    if (!existing) {
      throw new QuizSystemError(
        "Question not found",
        QuizErrorCode.QUESTION_NOT_FOUND,
        { questionId }
      );
    }

    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        isFavorite: !existing.isFavorite,
      },
    });

    // Invalidate cache
    invalidateQuestionCache({ questionId, isFavorite: true });

    return { isFavorite: question.isFavorite };
  });
}

/**
 * Delete a question from a quiz.
 * - If the question is a favorite, only unlink it from the quiz (keep the question entity)
 * - If the question is NOT a favorite, delete the question entity entirely
 */
export async function deleteQuestionFromQuizAction(
  quizId: string,
  questionId: string
) {
  return runAction("deleteQuestionFromQuizAction", async () => {
    await requireUser();

    // Validate input
    const validatedInput = removeQuestionFromQuizSchema.parse({
      quizId,
      questionId,
    });

    // Check if the question is a favorite
    const question = await prisma.question.findUnique({
      where: { id: validatedInput.questionId },
      select: { id: true, isFavorite: true },
    });

    if (!question) {
      throw new QuizSystemError(
        "Question not found",
        QuizErrorCode.QUESTION_NOT_FOUND,
        { questionId: validatedInput.questionId }
      );
    }

    if (question.isFavorite) {
      // Only unlink the question from the quiz (keep the entity)
      await prisma.quizQuestion.deleteMany({
        where: {
          quizId: validatedInput.quizId,
          questionId: validatedInput.questionId,
        },
      });
    } else {
      // Delete the question entity entirely (cascades to QuizQuestion links)
      await prisma.question.delete({
        where: { id: validatedInput.questionId },
      });
      invalidateQuestionCache({ questionId: validatedInput.questionId });
    }

    // Invalidate quiz cache
    invalidateQuizCache({ quizId: validatedInput.quizId });

    return {
      wasDeleted: !question.isFavorite,
      wasFavorite: question.isFavorite,
    };
  });
}

/**
 * Fetch favorite questions (server action for client components)
 * This wraps the data layer function for use in client components
 */
export async function fetchFavoriteQuestionsAction(page = 1, limit = 100) {
  return runAction("fetchFavoriteQuestionsAction", async () => {
    await requireUser();

    const skip = (page - 1) * limit;

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where: { isFavorite: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.question.count({ where: { isFavorite: true } }),
    ]);

    return {
      questions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });
}
