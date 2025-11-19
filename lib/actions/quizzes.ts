"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import { convertToStrictQuestions, questionSchemas } from "../schemas";
import { AIGenerationError, aiQuizService } from "../services/ai-service";
import {
  errorHandler,
  getUserFriendlyErrorMessage,
  QuizErrorCode,
  QuizSystemError,
} from "../services/error-handler";
import { revalidateQuizCache } from "../utils/cache";

// Performance monitoring
class PerformanceMonitor {
  private startTime: number;

  constructor(private operationName: string) {
    this.startTime = performance.now();
  }

  end(): void {
    const duration = performance.now() - this.startTime;
    console.log(`${this.operationName} completed in ${duration.toFixed(2)}ms`);

    if (process.env.NODE_ENV === "production" && duration > 10000) {
      console.warn(
        `Slow operation detected: ${this.operationName} took ${duration.toFixed(
          2
        )}ms`
      );
    }
  }
}

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
  const monitor = new PerformanceMonitor("generateNewQuizAction");

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

    monitor.end();
    return quizData;
  } catch (error) {
    monitor.end();

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

import { GenerateQuestionParams } from "../services/ai-service";

export async function generateNewQuestionAction(
  params: GenerateQuestionParams
) {
  const monitor = new PerformanceMonitor("generateNewQuestionAction");

  try {
    // Generate question using AI service with the new parameter structure
    const question = await aiQuizService.generateQuestion(params);

    // Validate generated question
    const validatedQuestion = questionSchemas.strict.parse(question);

    monitor.end();
    return validatedQuestion;
  } catch (error) {
    monitor.end();

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
  const monitor = new PerformanceMonitor("deleteQuiz");

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
      select: { createdBy: true },
    });

    if (!quiz || quiz.createdBy !== user.id) {
      throw new QuizSystemError(
        "Quiz not found or access denied",
        QuizErrorCode.QUIZ_NOT_FOUND,
        { quizId }
      );
    }

    await prisma.quiz.delete({ where: { id: quizId } });

    // Invalidate Cache Components tags to refresh quizzes list
    updateTag("quizzes");

    // Also revalidate traditional cache paths for compatibility
    revalidateQuizCache(quizId);

    monitor.end();
    redirect("/dashboard/quizzes");
  } catch (error) {
    monitor.end();

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

export async function updateQuizAction(formData: FormData) {
  const monitor = new PerformanceMonitor("updateQuizAction");

  try {
    const user = await requireUser();

    // Parse form data
    const quizId = formData.get("quiz_id") as string;
    const title = formData.get("title") as string;
    const timeLimit = formData.get("time_limit")
      ? Number(formData.get("time_limit"))
      : null;
    const questionsRaw = formData.get("questions") as string;

    // Validate inputs
    if (!quizId || !title) {
      throw new QuizSystemError(
        "Quiz ID and title are required",
        QuizErrorCode.INVALID_INPUT
      );
    }

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

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { createdBy: true },
    });

    if (!quiz || quiz.createdBy !== user.id) {
      throw new QuizSystemError(
        "Quiz not found or access denied",
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

    // Also revalidate traditional cache paths for compatibility
    revalidateQuizCache(quizId);

    monitor.end();
  } catch (error) {
    monitor.end();

    if (error instanceof QuizSystemError) {
      throw new Error(getUserFriendlyErrorMessage(error));
    }

    try {
      await errorHandler.handleError(error, {
        operation: "updateQuizAction",
      });
    } catch {
      throw new Error("Quiz update failed. Please try again.");
    }
  }
}
