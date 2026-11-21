/**
 * Quizzes
 *
 * The single save path of a quiz with its ordered questions, shared by the
 * dashboard and MCP. Domain logic only: no Next.js import and no cache call.
 * It throws UserError for expected failures; the callers invalidate the
 * cache.
 */

import prisma from "@/lib/prisma";
import {
  saveQuizSchema,
  type FlexibleQuestion,
  type SaveQuizInput,
} from "@/lib/schemas";
import { assertActorEnabled, type Actor } from "./actor";
import { syncQuizQuestions } from "./quiz-questions";
import { assertActiveCriteria } from "./scorecards";
import { UserError } from "./user-error";

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
 * `positionId`, authored by the actor.
 */
export async function saveQuiz(
  actor: Actor,
  input: SaveQuizInput,
): Promise<{ quizId: string; positionId: string; created: boolean }> {
  await assertActorEnabled(prisma, actor);

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
      throw new UserError("Quiz non trovato o accesso negato.");
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
      await syncQuizQuestions(tx, quizId, questions, actor.userId);
    });

    return { quizId, positionId: quiz.positionId, created: false };
  }

  const position = await prisma.position.findUnique({
    where: { id: positionId },
    select: { id: true },
  });

  if (!position) {
    throw new UserError("Posizione non trovata o accesso negato.");
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
        createdBy: actor.userId,
      },
      select: { id: true },
    });
    await syncQuizQuestions(tx, newQuiz.id, questions, actor.userId);
    return newQuiz;
  });

  return { quizId: quiz.id, positionId: position.id, created: true };
}
