"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import {
  duplicateQuizSchema,
  questionSchemas,
  saveQuizSchema,
  type DuplicateQuizInput,
  type FlexibleQuestion,
  type SaveQuizInput,
} from "../schemas";
import { aiQuizService, GenerateQuestionParams } from "../services/ai-service";
import { QuizErrorCode, QuizSystemError } from "../services/error-handler";
import { logger } from "../services/logger";
import {
  handleActionError,
  isRedirectError,
} from "../utils/action-error-handler";
import { invalidateQuizCache } from "../utils/cache-utils";
import { syncQuizQuestions } from "../services/quiz-questions";
import { mapQuizQuestionsToFlexible } from "../utils/question-utils";

type GenerateNewQuizActionParams = {
  positionId: string;
  quizTitle: string;
  questionCount: number;
  difficulty: number;
  includeMultipleChoice: boolean;
  includeOpenQuestions: boolean;
  includeCodeSnippets: boolean;
  includeBehavioralScenarios: boolean;
  instructions?: string;
  previousQuestions?: { question: string }[];
  specificModel?: string;
};

export async function generateNewQuizAction({
  positionId,
  quizTitle,
  questionCount,
  difficulty,
  includeMultipleChoice,
  includeOpenQuestions,
  includeCodeSnippets,
  includeBehavioralScenarios,
  instructions,
  previousQuestions,
  specificModel,
}: GenerateNewQuizActionParams) {
  try {
    // Validate user authentication
    const user = await requireUser();

    // Get position details
    const position = await prisma.position.findUnique({
      where: {
        id: positionId,
      },
      select: {
        id: true,
        title: true,
        experienceLevel: true,
        skills: true,
        description: true,
      },
    });

    if (!position) {
      throw new QuizSystemError(
        "Position not found or access denied",
        QuizErrorCode.POSITION_NOT_FOUND,
        { positionId },
      );
    }

    // Generate quiz using AI service
    const quizData = await aiQuizService.generateQuiz({
      positionTitle: position.title,
      experienceLevel: position.experienceLevel,
      skills: position.skills,
      description: position.description || undefined,
      quizTitle,
      questionCount,
      difficulty,
      includeMultipleChoice,
      includeOpenQuestions,
      includeCodeSnippets,
      includeBehavioralScenarios,
      instructions,
      previousQuestions,
      specificModel,
    });

    return quizData;
  } catch (error) {
    handleActionError(error, {
      operation: "generateNewQuizAction",
      context: { positionId },
      fallbackMessage: "AI generation failed. Please try again.",
      rethrowKnownErrors: true,
    });
  }
}

export async function generateNewQuestionAction(
  params: GenerateQuestionParams,
) {
  try {
    await requireUser();

    // Generate question using AI service with the new parameter structure
    const question = await aiQuizService.generateQuestion(params);

    // Validate generated question
    const validatedQuestion = questionSchemas.strict.parse(question);

    return validatedQuestion;
  } catch (error) {
    // Handle Zod validation errors specially
    if (error instanceof z.ZodError) {
      logger.error("Question validation failed:", { issues: error.issues });
      throw new QuizSystemError(
        "Generated question failed validation",
        QuizErrorCode.INVALID_INPUT,
        { zodErrors: error.issues },
      );
    }

    handleActionError(error, {
      operation: "generateNewQuestionAction",
      context: { questionType: params.type },
      fallbackMessage: "Question generation failed. Please try again.",
      rethrowKnownErrors: true,
    });
  }
}

export async function deleteQuizById(quizId: string) {
  try {
    if (!quizId) {
      throw new QuizSystemError(
        "Quiz ID is required",
        QuizErrorCode.INVALID_INPUT,
      );
    }

    const user = await requireUser();

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { positionId: true },
    });

    if (!quiz) {
      throw new QuizSystemError(
        "Quiz not found",
        QuizErrorCode.QUIZ_NOT_FOUND,
        { quizId },
      );
    }

    await prisma.quiz.delete({ where: { id: quizId } });

    // Invalidate cache
    invalidateQuizCache({
      quizId,
      positionId: quiz.positionId ?? undefined,
      deleted: true,
    });

    redirect("/dashboard/quizzes");
  } catch (error) {
    // Re-throw redirect responses (Next.js uses special errors for redirects)
    if (isRedirectError(error)) {
      throw error;
    }

    handleActionError(error, {
      operation: "deleteQuizById",
      fallbackMessage: "Quiz deletion failed. Please try again.",
    });
  }
}

/**
 * Create or update a quiz together with its ordered question set.
 * With `quizId` it updates that quiz; without it, it creates one for
 * `positionId`. Always returns the quiz id.
 */
export async function upsertQuizAction(input: SaveQuizInput) {
  try {
    const user = await requireUser();

    const parsed = saveQuizSchema.safeParse(input);
    if (!parsed.success) {
      throw new QuizSystemError(
        "Dati del quiz non validi",
        QuizErrorCode.INVALID_INPUT,
        { issues: parsed.error.issues },
      );
    }
    const { quizId, positionId, title, timeLimit, questions } = parsed.data;

    if (quizId) {
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: { positionId: true },
      });

      if (!quiz) {
        throw new QuizSystemError(
          "Quiz not found",
          QuizErrorCode.QUIZ_NOT_FOUND,
          { quizId },
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.quiz.update({
          where: { id: quizId },
          data: { title, timeLimit },
        });
        await syncQuizQuestions(tx, quizId, questions, user.id);
      });

      invalidateQuizCache({
        quizId,
        positionId: quiz.positionId ?? undefined,
      });

      return { id: quizId };
    }

    const position = await prisma.position.findUnique({
      where: { id: positionId },
      select: { id: true },
    });

    if (!position) {
      throw new QuizSystemError(
        "Position not found or access denied",
        QuizErrorCode.POSITION_NOT_FOUND,
        { positionId },
      );
    }

    const quiz = await prisma.$transaction(async (tx) => {
      const newQuiz = await tx.quiz.create({
        data: {
          title,
          positionId: position.id,
          timeLimit,
          createdBy: user.id,
        },
        select: { id: true },
      });
      await syncQuizQuestions(tx, newQuiz.id, questions, user.id);
      return newQuiz;
    });

    invalidateQuizCache({ quizId: quiz.id, positionId: position.id });

    return { id: quiz.id };
  } catch (error) {
    handleActionError(error, {
      operation: "upsertQuizAction",
      fallbackMessage: "Quiz operation failed. Please try again.",
    });
  }
}

/**
 * Duplicate a quiz, with copies of its questions, onto another position.
 */
export async function duplicateQuizAction(input: DuplicateQuizInput) {
  try {
    const user = await requireUser();

    const parsed = duplicateQuizSchema.safeParse(input);
    if (!parsed.success) {
      throw new QuizSystemError(
        "Quiz ID, position ID, and title are required",
        QuizErrorCode.INVALID_INPUT,
        { issues: parsed.error.issues },
      );
    }
    const { quizId, newPositionId, newTitle } = parsed.data;

    const originalQuiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        title: true,
        timeLimit: true,
        quizQuestions: {
          include: { question: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!originalQuiz) {
      throw new QuizSystemError(
        "Quiz not found",
        QuizErrorCode.QUIZ_NOT_FOUND,
        { quizId },
      );
    }

    const position = await prisma.position.findUnique({
      where: { id: newPositionId },
      select: { id: true },
    });

    if (!position) {
      throw new QuizSystemError(
        "Position not found",
        QuizErrorCode.POSITION_NOT_FOUND,
        { newPositionId },
      );
    }

    // Copies carry no dbId, so every question is created fresh for the new
    // quiz. Favorite status stays with the original.
    const copies: FlexibleQuestion[] = mapQuizQuestionsToFlexible(
      originalQuiz.quizQuestions,
    ).map(({ dbId: _dbId, isFavorite: _isFavorite, ...question }) => question);

    const newQuiz = await prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          title: newTitle,
          positionId: newPositionId,
          timeLimit: originalQuiz.timeLimit,
          createdBy: user.id,
        },
        select: { id: true },
      });
      await syncQuizQuestions(tx, quiz.id, copies, user.id);
      return quiz;
    });

    invalidateQuizCache({ quizId: newQuiz.id, positionId: newPositionId });

    return { id: newQuiz.id };
  } catch (error) {
    handleActionError(error, {
      operation: "duplicateQuizAction",
      context: { quizId: input?.quizId },
      fallbackMessage: "Quiz duplication failed. Please try again.",
    });
  }
}
