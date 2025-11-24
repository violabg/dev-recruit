"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import { convertToStrictQuestions, questionSchemas } from "../schemas";
import {
  AIGenerationError,
  aiQuizService,
  GenerateQuestionParams,
} from "../services/ai-service";
import {
  errorHandler,
  getUserFriendlyErrorMessage,
  QuizErrorCode,
  QuizSystemError,
} from "../services/error-handler";
import { revalidateQuizCache } from "../utils/cache";

// Note: performance monitoring removed — keep simple debug logs instead

type GenerateNewQuizActionParams = {
  positionId: string;
  quizTitle: string;
  questionCount: number;
  difficulty: number;
  includeMultipleChoice: boolean;
  includeOpenQuestions: boolean;
  includeCodeSnippets: boolean;
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
  instructions,
  previousQuestions,
  specificModel,
}: GenerateNewQuizActionParams) {
  console.debug("generateNewQuizAction started");

  try {
    // Validate user authentication
    const user = await requireUser();

    // Get position details with ownership check
    const position = await prisma.position.findFirst({
      where: {
        id: positionId,
        createdBy: user.id,
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
        { positionId }
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
      instructions,
      previousQuestions,
      specificModel,
    });

    console.debug("generateNewQuizAction completed");
    return quizData;
  } catch (error) {
    console.debug("generateNewQuizAction failed");

    // Enhanced error handling
    if (
      error instanceof QuizSystemError ||
      error instanceof AIGenerationError
    ) {
      throw error;
    }

    try {
      await errorHandler.handleError(error, {
        operation: "generateNewQuizAction",
        positionId,
      });
    } catch {
      throw new Error("AI generation failed. Please try again.");
    }
  }
}

export async function generateNewQuestionAction(
  params: GenerateQuestionParams
) {
  console.debug("generateNewQuestionAction started");

  try {
    // Generate question using AI service with the new parameter structure
    const question = await aiQuizService.generateQuestion(params);

    // Validate generated question
    const validatedQuestion = questionSchemas.strict.parse(question);

    console.debug("generateNewQuestionAction completed");
    return validatedQuestion;
  } catch (error) {
    console.debug("generateNewQuestionAction failed");

    // Enhanced error handling
    if (
      error instanceof QuizSystemError ||
      error instanceof AIGenerationError
    ) {
      throw error;
    }

    try {
      await errorHandler.handleError(error, {
        operation: "generateNewQuestionAction",
        questionType: params.type,
      });
    } catch {
      // If error handling fails, continue with original error
    }

    if (error instanceof z.ZodError) {
      console.error("Question validation failed:", error.issues);
      throw new QuizSystemError(
        "Generated question failed validation",
        QuizErrorCode.INVALID_INPUT,
        { zodErrors: error.issues }
      );
    } else {
      console.error("Unknown error in generateNewQuestionAction:", error);
      throw new Error("Question generation failed. Please try again.");
    }
  }
}

export async function deleteQuiz(formData: FormData) {
  console.debug("deleteQuiz started");

  try {
    const quizId = formData.get("quiz_id") as string;

    if (!quizId) {
      throw new QuizSystemError(
        "Quiz ID is required",
        QuizErrorCode.INVALID_INPUT
      );
    }

    const user = await requireUser();

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { createdBy: true, positionId: true },
    });

    if (!quiz || quiz.createdBy !== user.id) {
      throw new QuizSystemError(
        "Quiz not found or access denied",
        QuizErrorCode.QUIZ_NOT_FOUND,
        { quizId }
      );
    }

    const positionTag = quiz.positionId ? `positions-${quiz.positionId}` : null;

    await prisma.quiz.delete({ where: { id: quizId } });

    // Invalidate Cache Components tags to refresh quizzes list
    updateTag("quizzes");
    if (positionTag) {
      updateTag(positionTag);
    }

    // Also revalidate traditional cache paths for compatibility
    revalidateQuizCache(quizId);

    console.debug("deleteQuiz completed");
    redirect("/dashboard/quizzes");
  } catch (error) {
    console.debug("deleteQuiz failed");

    // Check if this is a redirect (Next.js throws special errors for redirects)
    if (error && typeof error === "object" && "digest" in error) {
      throw error; // Re-throw redirect responses
    }

    if (error instanceof QuizSystemError) {
      throw new Error(getUserFriendlyErrorMessage(error));
    }

    try {
      await errorHandler.handleError(error, {
        operation: "deleteQuiz",
      });
    } catch {
      throw new Error("Quiz deletion failed. Please try again.");
    }
  }
}

/**
 * Unified action for creating or updating a quiz.
 * Auto-detects operation based on presence of quiz_id in FormData.
 * FormData expects:
 * - title: string (required)
 * - questions: JSON stringified array (required)
 * - time_limit?: string (optional)
 * - quiz_id?: string (if provided, updates; otherwise creates)
 * - position_id?: string (required for create, ignored for update)
 */
export async function upsertQuizAction(formData: FormData) {
  console.debug("upsertQuizAction started");

  try {
    const user = await requireUser();

    // Parse form data
    const quizId = formData.get("quiz_id") as string | null;
    const title = formData.get("title") as string;
    const questionsRaw = formData.get("questions") as string;
    const timeLimitRaw = formData.get("time_limit") as string;

    const isCreate = !quizId;

    // Validate inputs
    if (!title || !questionsRaw) {
      throw new QuizSystemError(
        "Title and questions are required",
        QuizErrorCode.INVALID_INPUT
      );
    }

    const timeLimit = timeLimitRaw ? Number(timeLimitRaw) : null;

    // Parse and validate questions
    let questions;
    try {
      questions = JSON.parse(questionsRaw);
      // Ensure question IDs are in the format 'q1', 'q2', etc.
      const formattedQuestions = questions.map(
        (q: Record<string, unknown>, index: number) => ({
          ...q,
          id: `q${index + 1}`,
        })
      );
      questions = z.array(questionSchemas.flexible).parse(formattedQuestions);
    } catch (parseError) {
      throw new QuizSystemError(
        "Invalid questions format",
        QuizErrorCode.INVALID_INPUT,
        { parseError }
      );
    }

    // Convert questions to strict format
    let strictQuestions;
    try {
      strictQuestions = convertToStrictQuestions(questions);
    } catch (conversionError) {
      throw new QuizSystemError(
        "Failed to validate question format",
        QuizErrorCode.INVALID_INPUT,
        { conversionError }
      );
    }

    if (isCreate) {
      // CREATE MODE
      const positionId = formData.get("position_id") as string;

      if (!positionId) {
        throw new QuizSystemError(
          "Position ID is required for quiz creation",
          QuizErrorCode.INVALID_INPUT
        );
      }

      // Verify user owns the position
      const position = await prisma.position.findFirst({
        where: {
          id: positionId,
          createdBy: user.id,
        },
        select: { id: true },
      });

      if (!position) {
        throw new QuizSystemError(
          "Position not found or access denied",
          QuizErrorCode.POSITION_NOT_FOUND,
          { positionId }
        );
      }

      // Save quiz to database
      const quiz = await prisma.quiz.create({
        data: {
          title,
          positionId: position.id,
          questions: strictQuestions,
          timeLimit,
          createdBy: user.id,
        },
        select: {
          id: true,
        },
      });

      if (!quiz) {
        throw new QuizSystemError(
          "Failed to save quiz to database",
          QuizErrorCode.DATABASE_ERROR
        );
      }

      // Invalidate Cache Components tags to refresh quizzes list
      updateTag("quizzes");
      updateTag(`positions-${position.id}`);

      // Also revalidate traditional cache paths for compatibility
      revalidateQuizCache("");

      console.debug("upsertQuizAction completed");
      return { id: quiz.id };
    } else {
      // UPDATE MODE
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: { createdBy: true, positionId: true },
      });

      if (!quiz) {
        throw new QuizSystemError(
          "Quiz not found or access denied",
          QuizErrorCode.QUIZ_NOT_FOUND,
          { quizId }
        );
      }

      if (quiz.createdBy !== user.id) {
        throw new QuizSystemError(
          "You do not have permission to update this quiz",
          QuizErrorCode.QUIZ_NOT_FOUND,
          { quizId }
        );
      }

      await prisma.quiz.update({
        where: { id: quizId },
        data: {
          title,
          timeLimit,
          questions: strictQuestions,
        },
      });

      // Invalidate Cache Components tags to refresh quizzes list
      updateTag("quizzes");
      if (quiz.positionId) {
        updateTag(`positions-${quiz.positionId}`);
      }

      // Also revalidate traditional cache paths for compatibility
      revalidateQuizCache(quizId);

      console.debug("upsertQuizAction completed");
      return {};
    }
  } catch (error) {
    console.debug("upsertQuizAction failed");

    if (error instanceof QuizSystemError) {
      throw new Error(getUserFriendlyErrorMessage(error));
    }

    try {
      await errorHandler.handleError(error, {
        operation: "upsertQuizAction",
      });
    } catch {
      throw new Error("Quiz operation failed. Please try again.");
    }
  }
}

type RegenerateQuizActionParams = {
  quizId: string;
  positionId: string;
  quizTitle: string;
  questionCount: number;
  difficulty: number;
  includeMultipleChoice: boolean;
  includeOpenQuestions: boolean;
  includeCodeSnippets: boolean;
  instructions?: string;
  previousQuestions?: { question: string }[];
  specificModel?: string;
};

/**
 * Generates a new set of questions and updates an existing quiz.
 * Preserves the quiz ID and position association.
 * Used in edit pages for full quiz regeneration.
 */
export async function regenerateQuizAction({
  quizId,
  positionId,
  quizTitle,
  questionCount,
  difficulty,
  includeMultipleChoice,
  includeOpenQuestions,
  includeCodeSnippets,
  instructions,
  previousQuestions,
  specificModel,
}: RegenerateQuizActionParams) {
  console.debug("regenerateQuizAction started");

  try {
    const user = await requireUser();

    // Verify quiz exists and user owns it
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { createdBy: true },
    });

    if (!quiz) {
      throw new QuizSystemError(
        "Quiz not found",
        QuizErrorCode.QUIZ_NOT_FOUND,
        { quizId }
      );
    }

    if (quiz.createdBy !== user.id) {
      throw new QuizSystemError(
        "You do not have permission to regenerate this quiz",
        QuizErrorCode.QUIZ_NOT_FOUND,
        { quizId }
      );
    }

    // Verify position exists and user owns it
    const position = await prisma.position.findFirst({
      where: {
        id: positionId,
        createdBy: user.id,
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
        { positionId }
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
      instructions,
      previousQuestions,
      specificModel,
    });

    if (!quizData || !quizData.questions) {
      throw new Error("Failed to generate quiz questions");
    }

    // Convert questions to strict format
    let strictQuestions;
    try {
      strictQuestions = convertToStrictQuestions(quizData.questions);
    } catch (conversionError) {
      throw new QuizSystemError(
        "Failed to validate generated questions",
        QuizErrorCode.INVALID_INPUT,
        { conversionError }
      );
    }

    // Update the quiz with new questions (preserve ID, position, creator)
    await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title: quizTitle,
        questions: strictQuestions,
      },
    });

    // Invalidate Cache Components tags to refresh quizzes list
    updateTag("quizzes");
    updateTag(`positions-${position.id}`);

    // Also revalidate traditional cache paths for compatibility
    revalidateQuizCache(quizId);

    console.debug("regenerateQuizAction completed");
    return { id: quizId };
  } catch (error) {
    console.debug("regenerateQuizAction failed");

    // Enhanced error handling
    if (
      error instanceof QuizSystemError ||
      error instanceof AIGenerationError
    ) {
      throw error;
    }

    try {
      await errorHandler.handleError(error, {
        operation: "regenerateQuizAction",
        quizId,
      });
    } catch {
      throw new Error("Quiz regeneration failed. Please try again.");
    }
  }
}

/**
 * Duplicates an existing quiz to a new position.
 * Creates a new quiz with the same questions but different title and position.
 * Doesn't check for user ownership - can duplicate any quiz.
 */
export async function duplicateQuizAction(formData: FormData) {
  console.debug("duplicateQuizAction started");

  try {
    const user = await requireUser();

    // Parse form data
    const quizId = formData.get("quiz_id") as string;
    const newPositionId = formData.get("new_position_id") as string;
    const newTitle = formData.get("new_title") as string;

    if (!quizId || !newPositionId || !newTitle) {
      throw new QuizSystemError(
        "Quiz ID, position ID, and title are required",
        QuizErrorCode.INVALID_INPUT
      );
    }

    // Get the original quiz
    const originalQuiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        title: true,
        questions: true,
        timeLimit: true,
      },
    });

    if (!originalQuiz) {
      throw new QuizSystemError(
        "Quiz not found",
        QuizErrorCode.QUIZ_NOT_FOUND,
        { quizId }
      );
    }

    // Verify the new position exists (no ownership check)
    const position = await prisma.position.findUnique({
      where: { id: newPositionId },
      select: { id: true },
    });

    if (!position) {
      throw new QuizSystemError(
        "Position not found",
        QuizErrorCode.POSITION_NOT_FOUND,
        { newPositionId }
      );
    }

    // Create the duplicated quiz
    const newQuiz = await prisma.quiz.create({
      data: {
        title: newTitle,
        positionId: newPositionId,
        questions: originalQuiz.questions as any,
        timeLimit: originalQuiz.timeLimit,
        createdBy: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!newQuiz) {
      throw new QuizSystemError(
        "Failed to create duplicated quiz",
        QuizErrorCode.DATABASE_ERROR
      );
    }

    // Invalidate Cache Components tags to refresh quizzes list
    updateTag("quizzes");
    updateTag(`positions-${newPositionId}`);

    // Also revalidate traditional cache paths for compatibility
    revalidateQuizCache("");

    console.debug("duplicateQuizAction completed");
    return { id: newQuiz.id };
  } catch (error) {
    console.debug("duplicateQuizAction failed");

    if (error instanceof QuizSystemError) {
      throw new Error(getUserFriendlyErrorMessage(error));
    }

    try {
      await errorHandler.handleError(error, {
        operation: "duplicateQuizAction",
        quizId: (formData.get("quiz_id") as string) || undefined,
      });
    } catch {
      throw new Error("Quiz duplication failed. Please try again.");
    }
  }
}
