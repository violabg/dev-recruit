"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import {
  addExistingQuizzesSchema,
  baseSchemas,
  duplicateQuizSchema,
  generateQuestionParamsSchema,
  generateQuizSchema,
  questionSchemas,
  type AddExistingQuizzesInput,
  type DuplicateQuizInput,
  type GenerateQuizInput,
  type SaveQuizInput,
} from "../schemas";
import { toActor } from "../services/actor";
import { aiQuizService, GenerateQuestionParams } from "../services/ai-service";
import { QuizErrorCode, QuizSystemError } from "../services/error-handler";
import { logger } from "../services/logger";
import { invalidateQuizCache } from "../utils/cache-utils";
import {
  addExistingQuizzesToPosition,
  copyQuizToPosition,
  saveQuiz,
} from "../services/quizzes";
import { getActiveCriteria } from "../services/scorecards";
import { runAction, UserError } from "./run-action";

/**
 * Ask the AI for a quiz for a position. Nothing is saved: the result goes to
 * the quiz editor, and upsertQuizAction stores it when the user saves.
 */
export async function generateNewQuizAction(input: GenerateQuizInput) {
  return runAction("generateNewQuizAction", async () => {
    await requireUser();
    const { positionId, ...config } = generateQuizSchema.parse(input);

    const position = await prisma.position.findUnique({
      where: { id: positionId },
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

    // Active criteria of the position scorecard: the AI proposes for each
    // question the criteria it verifies (none when the list is empty)
    const criteria = await getActiveCriteria(position.id);

    return aiQuizService.generateQuiz({
      positionTitle: position.title,
      experienceLevel: position.experienceLevel,
      skills: position.skills,
      description: position.description || undefined,
      criteria,
      ...config,
    });
  });
}

export async function generateNewQuestionAction(
  params: GenerateQuestionParams,
) {
  return runAction("generateNewQuestionAction", async () => {
    await requireUser();
    const parsed = generateQuestionParamsSchema.parse(params);

    // Generate question using AI service with the new parameter structure
    const question = await aiQuizService.generateQuestion(parsed);

    const validated = questionSchemas.strict.safeParse(question);
    if (!validated.success) {
      logger.error("Generated question failed validation", {
        issues: validated.error.issues,
      });
      throw new UserError(
        "La domanda generata non è valida. Riprova la generazione.",
      );
    }

    return { question: validated.data };
  });
}

export async function deleteQuizAction(quizId: string) {
  return runAction("deleteQuizAction", async () => {
    await requireUser();

    const id = baseSchemas.id.parse(quizId);

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      select: { positionId: true },
    });

    if (!quiz) {
      throw new QuizSystemError("Quiz not found", QuizErrorCode.QUIZ_NOT_FOUND, {
        quizId: id,
      });
    }

    await prisma.quiz.delete({ where: { id } });

    // Invalidate cache
    invalidateQuizCache({
      quizId: id,
      positionId: quiz.positionId ?? undefined,
      deleted: true,
    });

    redirect("/dashboard/quizzes");
  });
}

/**
 * Create or update a quiz together with its ordered question set through
 * saveQuiz. With `quizId` it updates that quiz; without it, it creates one
 * for `positionId`. Always returns the quiz id.
 */
export async function upsertQuizAction(input: SaveQuizInput) {
  return runAction("upsertQuizAction", async () => {
    const user = await requireUser();
    const { quizId, positionId } = await saveQuiz(toActor(user), input);

    invalidateQuizCache({ quizId, positionId });

    return { id: quizId };
  });
}

/**
 * Duplicate a quiz, with copies of its questions, onto another position.
 */
export async function duplicateQuizAction(input: DuplicateQuizInput) {
  return runAction("duplicateQuizAction", async () => {
    const user = await requireUser();

    const parsed = duplicateQuizSchema.safeParse(input);
    if (!parsed.success) {
      throw new UserError(
        parsed.error.issues[0]?.message ?? "Dati del quiz non validi",
      );
    }
    const { quizId, newPositionId, newTitle } = parsed.data;

    const originalQuiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        positionId: true,
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

    const newQuiz = await prisma.$transaction((tx) =>
      copyQuizToPosition(tx, {
        source: { id: quizId, ...originalQuiz },
        positionId: newPositionId,
        title: newTitle,
        userId: user.id,
      }),
    );

    invalidateQuizCache({ quizId: newQuiz.id, positionId: newPositionId });

    return { id: newQuiz.id };
  });
}

/**
 * Add to a position copies of one or more existing quizzes of other
 * positions, all or nothing.
 */
export async function addExistingQuizzesToPositionAction(
  input: AddExistingQuizzesInput,
) {
  return runAction("addExistingQuizzesToPositionAction", async () => {
    const user = await requireUser();
    const { positionId, quizIds } = addExistingQuizzesSchema.parse(input);

    const { createdQuizIds } = await prisma.$transaction((tx) =>
      addExistingQuizzesToPosition(tx, { positionId, quizIds, userId: user.id }),
    );

    for (const quizId of createdQuizIds) {
      invalidateQuizCache({ quizId, positionId });
    }

    return { count: createdQuizIds.length, quizIds: createdQuizIds };
  });
}
