"use server";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import { FlexibleQuestion, questionSchemas } from "../schemas";
import {
  addQuestionsToQuizSchema,
  createQuestionSchema,
  removeQuestionFromQuizSchema,
  reorderQuizQuestionsSchema,
  updateQuestionSchema,
  type CreateQuestionInput,
  type UpdateQuestionInput,
} from "../schemas/questionEntity";
import { QuizErrorCode, QuizSystemError } from "../services/error-handler";
import {
  handleActionError,
  isRedirectError,
} from "../utils/action-error-handler";
import {
  invalidateQuestionCache,
  invalidateQuizCache,
} from "../utils/cache-utils";
import { prepareQuestionForCreate } from "../utils/question-utils";

/**
 * Create a new reusable question
 */
export async function createQuestionAction(input: CreateQuestionInput) {
  try {
    const user = await requireUser();

    // Validate input
    const validatedInput = createQuestionSchema.parse(input);

    const question = await prisma.question.create({
      data: {
        type: validatedInput.type,
        question: validatedInput.question,
        keywords: validatedInput.keywords,
        explanation: validatedInput.explanation,
        options: validatedInput.options,
        correctAnswer: validatedInput.correctAnswer,
        sampleAnswer: validatedInput.sampleAnswer,
        codeSnippet: validatedInput.codeSnippet,
        sampleSolution: validatedInput.sampleSolution,
        language: validatedInput.language,
        isFavorite: validatedInput.isFavorite,
        createdBy: user.id,
      },
    });

    // Invalidate cache
    invalidateQuestionCache({ questionId: question.id });

    return { success: true, question };
  } catch (error) {
    handleActionError(error, {
      operation: "createQuestionAction",
      fallbackMessage: "Failed to create question. Please try again.",
    });
  }
}

/**
 * Update an existing question
 */
export async function updateQuestionAction(input: UpdateQuestionInput) {
  try {
    await requireUser();

    // Validate input
    const validatedInput = updateQuestionSchema.parse(input);
    const { id, ...data } = validatedInput;

    // Check question exists
    const existing = await prisma.question.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new QuizSystemError(
        "Question not found",
        QuizErrorCode.QUESTION_NOT_FOUND,
        { questionId: id }
      );
    }

    const question = await prisma.question.update({
      where: { id },
      data,
    });

    // Invalidate cache
    invalidateQuestionCache({ questionId: id });

    return { success: true, question };
  } catch (error) {
    handleActionError(error, {
      operation: "updateQuestionAction",
      fallbackMessage: "Failed to update question. Please try again.",
    });
  }
}

/**
 * Delete a question
 */
export async function deleteQuestionAction(questionId: string) {
  try {
    await requireUser();

    if (!questionId) {
      throw new QuizSystemError(
        "Question ID is required",
        QuizErrorCode.INVALID_INPUT
      );
    }

    // Check question exists
    const existing = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true },
    });

    if (!existing) {
      throw new QuizSystemError(
        "Question not found",
        QuizErrorCode.QUESTION_NOT_FOUND,
        { questionId }
      );
    }

    await prisma.question.delete({
      where: { id: questionId },
    });

    // Invalidate cache
    invalidateQuestionCache({ questionId });

    return { success: true };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    handleActionError(error, {
      operation: "deleteQuestionAction",
      fallbackMessage: "Failed to delete question. Please try again.",
    });
  }
}

/**
 * Toggle favorite status of a question
 */
export async function toggleQuestionFavoriteAction(questionId: string) {
  try {
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

    return { success: true, isFavorite: question.isFavorite };
  } catch (error) {
    handleActionError(error, {
      operation: "toggleQuestionFavoriteAction",
      fallbackMessage: "Failed to toggle favorite. Please try again.",
    });
  }
}

/**
 * Add questions to a quiz
 */
export async function addQuestionsToQuizAction(
  quizId: string,
  questionIds: string[]
) {
  try {
    await requireUser();

    // Validate input
    const validatedInput = addQuestionsToQuizSchema.parse({
      quizId,
      questionIds,
    });

    // Check quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: validatedInput.quizId },
      select: { id: true },
    });

    if (!quiz) {
      throw new QuizSystemError(
        "Quiz not found",
        QuizErrorCode.QUIZ_NOT_FOUND,
        { quizId: validatedInput.quizId }
      );
    }

    // Get current max order
    const maxOrder = await prisma.quizQuestion.aggregate({
      where: { quizId: validatedInput.quizId },
      _max: { order: true },
    });

    let currentOrder = (maxOrder._max.order ?? -1) + 1;

    // Add questions to quiz (skip if already exists)
    const results = await Promise.all(
      validatedInput.questionIds.map(async (questionId, index) => {
        try {
          return await prisma.quizQuestion.create({
            data: {
              quizId: validatedInput.quizId,
              questionId,
              order: currentOrder + index,
            },
          });
        } catch {
          // Skip if already exists (unique constraint violation)
          return null;
        }
      })
    );

    const addedCount = results.filter(Boolean).length;

    // Invalidate cache
    invalidateQuizCache({ quizId: validatedInput.quizId });

    return { success: true, addedCount };
  } catch (error) {
    handleActionError(error, {
      operation: "addQuestionsToQuizAction",
      fallbackMessage: "Failed to add questions to quiz. Please try again.",
    });
  }
}

/**
 * Remove a question from a quiz
 */
export async function removeQuestionFromQuizAction(
  quizId: string,
  questionId: string
) {
  try {
    await requireUser();

    // Validate input
    const validatedInput = removeQuestionFromQuizSchema.parse({
      quizId,
      questionId,
    });

    await prisma.quizQuestion.deleteMany({
      where: {
        quizId: validatedInput.quizId,
        questionId: validatedInput.questionId,
      },
    });

    // Invalidate cache
    invalidateQuizCache({ quizId: validatedInput.quizId });

    return { success: true };
  } catch (error) {
    handleActionError(error, {
      operation: "removeQuestionFromQuizAction",
      fallbackMessage: "Failed to remove question from quiz. Please try again.",
    });
  }
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
  try {
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
      success: true,
      wasDeleted: !question.isFavorite,
      wasFavorite: question.isFavorite,
    };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    handleActionError(error, {
      operation: "deleteQuestionFromQuizAction",
      fallbackMessage: "Failed to delete question from quiz. Please try again.",
    });
  }
}

/**
 * Reorder questions in a quiz
 */
export async function reorderQuizQuestionsAction(
  quizId: string,
  questionIds: string[]
) {
  try {
    await requireUser();

    // Validate input
    const validatedInput = reorderQuizQuestionsSchema.parse({
      quizId,
      questionIds,
    });

    // Update order for each question
    await prisma.$transaction(
      validatedInput.questionIds.map((questionId, index) =>
        prisma.quizQuestion.updateMany({
          where: {
            quizId: validatedInput.quizId,
            questionId,
          },
          data: {
            order: index,
          },
        })
      )
    );

    // Invalidate cache
    invalidateQuizCache({ quizId: validatedInput.quizId });

    return { success: true };
  } catch (error) {
    handleActionError(error, {
      operation: "reorderQuizQuestionsAction",
      fallbackMessage: "Failed to reorder questions. Please try again.",
    });
  }
}

/**
 * Create multiple questions at once (bulk create)
 * Useful for importing questions or saving AI-generated questions
 */
export async function createBulkQuestionsAction(
  questions: CreateQuestionInput[]
) {
  try {
    const user = await requireUser();

    // Validate all inputs
    const validatedQuestions = questions.map((q) =>
      createQuestionSchema.parse(q)
    );

    const createdQuestions = await prisma.question.createMany({
      data: validatedQuestions.map((q) => ({
        type: q.type,
        question: q.question,
        keywords: q.keywords,
        explanation: q.explanation,
        options: q.options,
        correctAnswer: q.correctAnswer,
        sampleAnswer: q.sampleAnswer,
        codeSnippet: q.codeSnippet,
        sampleSolution: q.sampleSolution,
        language: q.language,
        isFavorite: q.isFavorite,
        createdBy: user.id,
      })),
    });

    // Invalidate cache
    invalidateQuestionCache({});

    return { success: true, count: createdQuestions.count };
  } catch (error) {
    handleActionError(error, {
      operation: "createBulkQuestionsAction",
      fallbackMessage: "Failed to create questions. Please try again.",
    });
  }
}

/**
 * Save a single question from a quiz to the question library
 * Converts from FlexibleQuestion format to Question entity
 */
export async function saveQuestionToLibraryAction(
  question: FlexibleQuestion,
  markAsFavorite = false
) {
  try {
    const user = await requireUser();

    // Validate the incoming question
    const validated = questionSchemas.flexible.parse(question);

    // Create the question entity using shared utility
    const questionData = prepareQuestionForCreate(validated, user.id);
    const savedQuestion = await prisma.question.create({
      data: {
        ...questionData,
        isFavorite: markAsFavorite, // Override default
      },
    });

    // Invalidate cache
    invalidateQuestionCache({
      questionId: savedQuestion.id,
      isFavorite: markAsFavorite,
    });

    return { success: true, question: savedQuestion };
  } catch (error) {
    handleActionError(error, {
      operation: "saveQuestionToLibraryAction",
      fallbackMessage: "Failed to save question to library. Please try again.",
    });
  }
}

/**
 * Save multiple questions from a quiz to the question library
 * Returns the created question IDs for optional linking to quiz
 */
export async function saveQuestionsToLibraryAction(
  questions: FlexibleQuestion[],
  markAsFavorite = false
) {
  try {
    const user = await requireUser();

    // Validate all questions
    const validatedQuestions = questions.map((q) =>
      questionSchemas.flexible.parse(q)
    );

    // Create questions one by one to get their IDs
    const createdQuestions = await Promise.all(
      validatedQuestions.map((q) => {
        const questionData = prepareQuestionForCreate(q, user.id);
        return prisma.question.create({
          data: {
            ...questionData,
            isFavorite: markAsFavorite, // Override default
          },
        });
      })
    );

    // Invalidate cache
    invalidateQuestionCache({ isFavorite: markAsFavorite });

    return {
      success: true,
      count: createdQuestions.length,
      questionIds: createdQuestions.map((q) => q.id),
    };
  } catch (error) {
    handleActionError(error, {
      operation: "saveQuestionsToLibraryAction",
      fallbackMessage: "Failed to save questions to library. Please try again.",
    });
  }
}

/**
 * Save quiz questions to library AND link them to the quiz
 * This replaces the JSON-based questions with entity-linked questions
 */
export async function saveQuizQuestionsToLibraryAndLinkAction(
  quizId: string,
  questions: FlexibleQuestion[]
) {
  try {
    const user = await requireUser();

    // Verify quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true },
    });

    if (!quiz) {
      throw new QuizSystemError(
        "Quiz not found",
        QuizErrorCode.QUIZ_NOT_FOUND,
        { quizId }
      );
    }

    // Validate all questions
    const validatedQuestions = questions.map((q) =>
      questionSchemas.flexible.parse(q)
    );

    // Create questions and link to quiz in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create all questions using shared utility
      const createdQuestions = await Promise.all(
        validatedQuestions.map((q) =>
          tx.question.create({
            data: prepareQuestionForCreate(q, user.id),
          })
        )
      );

      // Remove existing quiz-question links
      await tx.quizQuestion.deleteMany({
        where: { quizId },
      });

      // Create new quiz-question links with order
      await tx.quizQuestion.createMany({
        data: createdQuestions.map((q, index) => ({
          quizId,
          questionId: q.id,
          order: index,
        })),
      });

      return createdQuestions;
    });

    // Invalidate cache
    invalidateQuestionCache({});
    invalidateQuizCache({ quizId });

    return {
      success: true,
      count: result.length,
      questionIds: result.map((q) => q.id),
    };
  } catch (error) {
    handleActionError(error, {
      operation: "saveQuizQuestionsToLibraryAndLinkAction",
      fallbackMessage:
        "Failed to save and link questions to quiz. Please try again.",
    });
  }
}

/**
 * Link existing library questions to a quiz
 * Optionally clears existing links first
 */
export async function linkLibraryQuestionsToQuizAction(
  quizId: string,
  questionIds: string[],
  clearExisting = false
) {
  try {
    await requireUser();

    // Verify quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true },
    });

    if (!quiz) {
      throw new QuizSystemError(
        "Quiz not found",
        QuizErrorCode.QUIZ_NOT_FOUND,
        { quizId }
      );
    }

    // Verify all questions exist
    const existingQuestions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true },
    });

    if (existingQuestions.length !== questionIds.length) {
      throw new QuizSystemError(
        "Some questions not found",
        QuizErrorCode.INVALID_INPUT,
        { questionIds }
      );
    }

    await prisma.$transaction(async (tx) => {
      if (clearExisting) {
        // Remove existing links
        await tx.quizQuestion.deleteMany({
          where: { quizId },
        });
      }

      // Get current max order if not clearing
      let startOrder = 0;
      if (!clearExisting) {
        const maxOrder = await tx.quizQuestion.aggregate({
          where: { quizId },
          _max: { order: true },
        });
        startOrder = (maxOrder._max.order ?? -1) + 1;
      }

      // Create new links (skip duplicates)
      for (let i = 0; i < questionIds.length; i++) {
        try {
          await tx.quizQuestion.create({
            data: {
              quizId,
              questionId: questionIds[i],
              order: startOrder + i,
            },
          });
        } catch {
          // Skip if already exists (unique constraint)
        }
      }
    });

    // Invalidate cache
    invalidateQuizCache({ quizId });

    return { success: true };
  } catch (error) {
    handleActionError(error, {
      operation: "linkLibraryQuestionsToQuizAction",
      fallbackMessage: "Failed to link questions to quiz. Please try again.",
    });
  }
}

/**
 * Fetch favorite questions (server action for client components)
 * This wraps the data layer function for use in client components
 */
export async function fetchFavoriteQuestionsAction(page = 1, limit = 100) {
  try {
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
      success: true,
      questions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    handleActionError(error, {
      operation: "fetchFavoriteQuestionsAction",
      fallbackMessage: "Failed to fetch favorite questions. Please try again.",
    });
  }
}
