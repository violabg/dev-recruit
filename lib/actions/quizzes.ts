"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import {
  baseSchemas,
  duplicateQuizSchema,
  generateQuestionParamsSchema,
  generateQuizSchema,
  questionSchemas,
  saveQuizSchema,
  type DuplicateQuizInput,
  type FlexibleQuestion,
  type GenerateQuizInput,
  type SaveQuizInput,
} from "../schemas";
import { aiQuizService, GenerateQuestionParams } from "../services/ai-service";
import { QuizErrorCode, QuizSystemError } from "../services/error-handler";
import { logger } from "../services/logger";
import { invalidateQuizCache } from "../utils/cache-utils";
import { syncQuizQuestions } from "../services/quiz-questions";
import {
  assertActiveCriteria,
  getActiveCriteria,
} from "../services/scorecards";
import { mapQuizQuestionsToFlexible } from "../utils/question-utils";
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
 * Check the criteria linked to the questions of a quiz before it is saved.
 * Ids that are neither active nor archived criteria of the position belong to
 * deleted criteria: they are dropped. Every other id must be an active
 * criterion, unless it is already stored on a link of the same quiz (an
 * archived criterion stays where it was).
 */
async function checkQuestionCriteria(
  positionId: string,
  quizId: string | undefined,
  questions: FlexibleQuestion[],
): Promise<FlexibleQuestion[]> {
  const knownIds = new Set(
    (
      await prisma.scorecardCriterion.findMany({
        where: { scorecard: { positionId } },
        select: { id: true },
      })
    ).map((criterion) => criterion.id),
  );

  const cleaned = questions.map((question) =>
    question.criterionIds
      ? {
          ...question,
          criterionIds: question.criterionIds.filter((id) => knownIds.has(id)),
        }
      : question,
  );

  const requested = new Set(cleaned.flatMap((q) => q.criterionIds ?? []));
  if (requested.size === 0) return cleaned;

  const alreadyStored = new Set<string>();
  if (quizId) {
    const links = await prisma.quizQuestion.findMany({
      where: { quizId },
      select: { criterionIds: true },
    });
    for (const link of links) {
      for (const id of link.criterionIds) alreadyStored.add(id);
    }
  }

  await assertActiveCriteria(
    positionId,
    [...requested].filter((id) => !alreadyStored.has(id)),
  );

  return cleaned;
}

/**
 * Create or update a quiz together with its ordered question set.
 * With `quizId` it updates that quiz; without it, it creates one for
 * `positionId`. Always returns the quiz id.
 */
export async function upsertQuizAction(input: SaveQuizInput) {
  return runAction("upsertQuizAction", async () => {
    const user = await requireUser();

    const parsed = saveQuizSchema.safeParse(input);
    if (!parsed.success) {
      throw new UserError(
        parsed.error.issues[0]?.message ?? "Dati del quiz non validi",
      );
    }
    const { quizId, positionId, title, timeLimit } = parsed.data;

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

      const questions = await checkQuestionCriteria(
        quiz.positionId,
        quizId,
        parsed.data.questions,
      );

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

    const questions = await checkQuestionCriteria(
      position.id,
      undefined,
      parsed.data.questions,
    );

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

    // Copies carry no dbId, so every question is created fresh for the new
    // quiz. Favorite status stays with the original. The criteria belong to
    // the scorecard of the position: kept only when the copy stays on it.
    const samePosition = newPositionId === originalQuiz.positionId;
    const copies: FlexibleQuestion[] = mapQuizQuestionsToFlexible(
      originalQuiz.quizQuestions,
    ).map(
      ({
        dbId: _dbId,
        isFavorite: _isFavorite,
        criterionIds,
        ...question
      }) => (samePosition ? { ...question, criterionIds } : question),
    );

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
  });
}
