import type { Prisma } from "../prisma/client";
import type { FlexibleQuestion } from "../schemas";
import {
  prepareQuestionForCreate,
  prepareQuestionForUpdate,
} from "../utils/question-utils";

/**
 * Make `questions` the complete, ordered question set of a quiz.
 *
 * The single place that writes the QuizQuestion join table:
 * - a question with a `dbId` that still exists is updated in place and linked;
 * - any other question is created and linked;
 * - questions previously linked to this quiz and no longer in the set are
 *   deleted, unless they are favorites or still used by another quiz.
 *
 * Must run inside a transaction so a failure leaves the quiz untouched.
 */
export async function syncQuizQuestions(
  tx: Prisma.TransactionClient,
  quizId: string,
  questions: FlexibleQuestion[],
  userId: string,
): Promise<void> {
  const previousLinks = await tx.quizQuestion.findMany({
    where: { quizId },
    select: { questionId: true },
  });

  if (previousLinks.length > 0) {
    await tx.quizQuestion.deleteMany({ where: { quizId } });

    const keptIds = new Set(questions.map((q) => q.dbId).filter(Boolean));
    const droppedIds = previousLinks
      .map((link) => link.questionId)
      .filter((id) => !keptIds.has(id));

    if (droppedIds.length > 0) {
      await tx.question.deleteMany({
        where: {
          id: { in: droppedIds },
          isFavorite: false,
          quizQuestions: { none: {} },
        },
      });
    }
  }

  for (const [order, question] of questions.entries()) {
    const existing = question.dbId
      ? await tx.question.findUnique({
          where: { id: question.dbId },
          select: { id: true },
        })
      : null;

    let questionId: string;
    if (existing) {
      await tx.question.update({
        where: { id: existing.id },
        data: prepareQuestionForUpdate(question),
      });
      questionId = existing.id;
    } else {
      const created = await tx.question.create({
        data: prepareQuestionForCreate(question, userId),
        select: { id: true },
      });
      questionId = created.id;
    }

    // The criteria the question verifies live on the link: the same question
    // can verify different criteria in another quiz
    await tx.quizQuestion.create({
      data: {
        quizId,
        questionId,
        order,
        criterionIds: question.criterionIds ?? [],
      },
    });
  }
}
