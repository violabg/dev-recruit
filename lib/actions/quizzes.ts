"use server";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import { FlexibleQuestion, questionSchemas } from "../schemas";
import { aiQuizService, GenerateQuestionParams } from "../services/ai-service";
import { QuizErrorCode, QuizSystemError } from "../services/error-handler";
import {
  handleActionError,
  isRedirectError,
} from "../utils/action-error-handler";
import { invalidateQuizCache } from "../utils/cache-utils";
import { prepareQuestionForCreate } from "../utils/question-utils";

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
  params: GenerateQuestionParams
) {
  try {
    // Generate question using AI service with the new parameter structure
    const question = await aiQuizService.generateQuestion(params);

    // Validate generated question
    const validatedQuestion = questionSchemas.strict.parse(question);

    return validatedQuestion;
  } catch (error) {
    // Handle Zod validation errors specially
    if (error instanceof z.ZodError) {
      console.error("Question validation failed:", error.issues);
      throw new QuizSystemError(
        "Generated question failed validation",
        QuizErrorCode.INVALID_INPUT,
        { zodErrors: error.issues }
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

export async function deleteQuiz(formData: FormData) {
  const quizId = formData.get("quizId") as string;
  return deleteQuizById(quizId);
}

export async function deleteQuizById(quizId: string) {
  try {
    if (!quizId) {
      throw new QuizSystemError(
        "Quiz ID is required",
        QuizErrorCode.INVALID_INPUT
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
        { quizId }
      );
    }

    await prisma.quiz.delete({ where: { id: quizId } });

    // Invalidate cache
    invalidateQuizCache({
      quizId,
      positionId: quiz.positionId ?? undefined,
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
 * Unified action for creating or updating a quiz.
 * Auto-detects operation based on presence of quizId in FormData.
 * Now saves questions as Question entities linked via QuizQuestion.
 * FormData expects:
 * - title: string (required)
 * - questions: JSON stringified array (required)
 * - timeLimit?: string (optional)
 * - quizId?: string (if provided, updates; otherwise creates)
 * - positionId?: string (required for create, ignored for update)
 */
export async function upsertQuizAction(formData: FormData) {
  try {
    const user = await requireUser();

    // Parse form data
    const quizId = formData.get("quizId") as string | null;
    const title = formData.get("title") as string;
    const questionsRaw = formData.get("questions") as string;
    const timeLimitRaw = formData.get("timeLimit") as string;

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
      questions = z.array(questionSchemas.flexible).parse(questions);
    } catch (parseError) {
      throw new QuizSystemError(
        "Invalid questions format",
        QuizErrorCode.INVALID_INPUT,
        { parseError }
      );
    }

    if (isCreate) {
      // CREATE MODE
      const positionId = formData.get("positionId") as string;

      if (!positionId) {
        throw new QuizSystemError(
          "Position ID is required for quiz creation",
          QuizErrorCode.INVALID_INPUT
        );
      }

      // Verify position exists
      const position = await prisma.position.findUnique({
        where: {
          id: positionId,
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

      // Create quiz and questions in a transaction
      const quiz = await prisma.$transaction(async (tx) => {
        // Create the quiz first
        const newQuiz = await tx.quiz.create({
          data: {
            title,
            positionId: position.id,
            timeLimit,
            createdBy: user.id,
          },
          select: {
            id: true,
          },
        });

        // Create Question entities or link existing ones to quiz
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i] as FlexibleQuestion;
          let questionId: string;

          // If question has an existing questionId, link to it; otherwise create new
          if (q.questionId) {
            // Verify the question exists
            const existingQuestion = await tx.question.findUnique({
              where: { id: q.questionId },
              select: { id: true },
            });

            if (existingQuestion) {
              questionId = existingQuestion.id;
            } else {
              // Fallback: create new if referenced question doesn't exist
              const newQuestion = await tx.question.create({
                data: prepareQuestionForCreate(q, user.id),
              });
              questionId = newQuestion.id;
            }
          } else {
            // No existing ID, create new question
            const newQuestion = await tx.question.create({
              data: prepareQuestionForCreate(q, user.id),
            });
            questionId = newQuestion.id;
          }

          // Link question to quiz
          await tx.quizQuestion.create({
            data: {
              quizId: newQuiz.id,
              questionId,
              order: i,
            },
          });
        }

        return newQuiz;
      });

      if (!quiz) {
        throw new QuizSystemError(
          "Failed to save quiz to database",
          QuizErrorCode.DATABASE_ERROR
        );
      }

      // Invalidate cache
      invalidateQuizCache({
        quizId: quiz.id,
        positionId: position.id,
      });

      return { id: quiz.id };
    } else {
      // UPDATE MODE
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: { positionId: true },
      });

      if (!quiz) {
        throw new QuizSystemError(
          "Quiz not found",
          QuizErrorCode.QUIZ_NOT_FOUND,
          { quizId }
        );
      }

      // Update quiz and replace questions in a transaction
      await prisma.$transaction(async (tx) => {
        // Update quiz metadata
        await tx.quiz.update({
          where: { id: quizId },
          data: {
            title,
            timeLimit,
          },
        });

        // Get existing linked questions
        const existingLinks = await tx.quizQuestion.findMany({
          where: { quizId },
          select: { questionId: true },
        });

        // Build a set of questionIds that will be kept (linked from favorites)
        const keepQuestionIds = new Set(
          questions
            .filter((q: FlexibleQuestion) => q.questionId)
            .map((q: FlexibleQuestion) => q.questionId)
        );

        // Delete existing quiz-question links
        await tx.quizQuestion.deleteMany({
          where: { quizId },
        });

        // Delete old questions that are not being reused and aren't linked elsewhere
        const questionIdsToDelete = existingLinks
          .filter((l) => !keepQuestionIds.has(l.questionId))
          .map((l) => l.questionId);

        if (questionIdsToDelete.length > 0) {
          await tx.question.deleteMany({
            where: {
              id: { in: questionIdsToDelete },
              // Only delete questions that aren't linked to other quizzes
              quizQuestions: { none: {} },
            },
          });
        }

        // Create new Question entities or link existing ones to quiz
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i] as FlexibleQuestion;
          let questionId: string;

          // If question has an existing questionId, link to it; otherwise create new
          if (q.questionId) {
            // Verify the question exists
            const existingQuestion = await tx.question.findUnique({
              where: { id: q.questionId },
              select: { id: true },
            });

            if (existingQuestion) {
              questionId = existingQuestion.id;
            } else {
              // Fallback: create new if referenced question doesn't exist
              const newQuestion = await tx.question.create({
                data: prepareQuestionForCreate(q, user.id),
              });
              questionId = newQuestion.id;
            }
          } else {
            // No existing ID, create new question
            const newQuestion = await tx.question.create({
              data: prepareQuestionForCreate(q, user.id),
            });
            questionId = newQuestion.id;
          }

          // Link question to quiz
          await tx.quizQuestion.create({
            data: {
              quizId,
              questionId,
              order: i,
            },
          });
        }
      });

      // Invalidate cache
      invalidateQuizCache({
        quizId,
        positionId: quiz.positionId ?? undefined,
      });

      return {};
    }
  } catch (error) {
    handleActionError(error, {
      operation: "upsertQuizAction",
      fallbackMessage: "Quiz operation failed. Please try again.",
    });
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
 * Now saves questions as Question entities linked via QuizQuestion.
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

    // Verify position exists
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

    // Update quiz and replace questions in a transaction
    await prisma.$transaction(async (tx) => {
      // Update quiz title
      await tx.quiz.update({
        where: { id: quizId },
        data: {
          title: quizTitle,
        },
      });

      // Get existing linked questions to delete them
      const existingLinks = await tx.quizQuestion.findMany({
        where: { quizId },
        select: { questionId: true },
      });

      // Delete existing quiz-question links
      await tx.quizQuestion.deleteMany({
        where: { quizId },
      });

      // Delete the old questions (they were created for this quiz)
      if (existingLinks.length > 0) {
        await tx.question.deleteMany({
          where: {
            id: { in: existingLinks.map((l) => l.questionId) },
            // Only delete questions that aren't linked elsewhere
            quizQuestions: { none: {} },
          },
        });
      }

      // Create new Question entities from AI-generated questions
      for (let i = 0; i < quizData.questions.length; i++) {
        const q = quizData.questions[i] as FlexibleQuestion;
        const question = await tx.question.create({
          data: prepareQuestionForCreate(q, user.id),
        });

        // Link question to quiz
        await tx.quizQuestion.create({
          data: {
            quizId,
            questionId: question.id,
            order: i,
          },
        });
      }
    });

    // Invalidate cache
    invalidateQuizCache({
      quizId,
      positionId: position.id,
    });

    return { id: quizId };
  } catch (error) {
    handleActionError(error, {
      operation: "regenerateQuizAction",
      context: { quizId },
      fallbackMessage: "Quiz regeneration failed. Please try again.",
      rethrowKnownErrors: true,
    });
  }
}

/**
 * Duplicates an existing quiz to a new position.
 * Creates a new quiz with the same questions but different title and position.
 * Doesn't check for user ownership - can duplicate any quiz.
 * Copies linked Question entities to the new quiz.
 */
export async function duplicateQuizAction(formData: FormData) {
  try {
    const user = await requireUser();

    // Parse form data
    const quizId = formData.get("quizId") as string;
    const newPositionId = formData.get("newPositionId") as string;
    const newTitle = formData.get("newTitle") as string;

    if (!quizId || !newPositionId || !newTitle) {
      throw new QuizSystemError(
        "Quiz ID, position ID, and title are required",
        QuizErrorCode.INVALID_INPUT
      );
    }

    // Get the original quiz with linked questions
    const originalQuiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        title: true,
        timeLimit: true,
        quizQuestions: {
          include: {
            question: true,
          },
          orderBy: {
            order: "asc",
          },
        },
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

    // Create the duplicated quiz with questions in a transaction
    const newQuiz = await prisma.$transaction(async (tx) => {
      // Create the new quiz
      const quiz = await tx.quiz.create({
        data: {
          title: newTitle,
          positionId: newPositionId,
          timeLimit: originalQuiz.timeLimit,
          createdBy: user.id,
        },
        select: {
          id: true,
        },
      });

      // Duplicate questions and link to new quiz
      for (let i = 0; i < originalQuiz.quizQuestions.length; i++) {
        const qq = originalQuiz.quizQuestions[i];

        // Create a copy of the question (convert DB question to FlexibleQuestion for the utility)
        const flexibleQuestion: FlexibleQuestion = {
          id: `q${i + 1}`,
          type: qq.question.type as FlexibleQuestion["type"],
          question: qq.question.question,
          keywords: qq.question.keywords,
          explanation: qq.question.explanation || undefined,
          options: qq.question.options,
          correctAnswer: qq.question.correctAnswer ?? undefined,
          sampleAnswer: qq.question.sampleAnswer || undefined,
          codeSnippet: qq.question.codeSnippet || undefined,
          sampleSolution: qq.question.sampleSolution || undefined,
          language: qq.question.language || undefined,
        };

        const newQuestion = await tx.question.create({
          data: prepareQuestionForCreate(flexibleQuestion, user.id),
        });

        // Link to new quiz
        await tx.quizQuestion.create({
          data: {
            quizId: quiz.id,
            questionId: newQuestion.id,
            order: qq.order,
          },
        });
      }

      return quiz;
    });

    if (!newQuiz) {
      throw new QuizSystemError(
        "Failed to create duplicated quiz",
        QuizErrorCode.DATABASE_ERROR
      );
    }

    // Invalidate cache
    invalidateQuizCache({
      quizId: newQuiz.id,
      positionId: newPositionId,
    });

    return { id: newQuiz.id };
  } catch (error) {
    handleActionError(error, {
      operation: "duplicateQuizAction",
      context: { quizId: (formData.get("quizId") as string) || undefined },
      fallbackMessage: "Quiz duplication failed. Please try again.",
    });
  }
}
