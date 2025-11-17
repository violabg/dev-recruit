import { generateNewQuizAction } from "@/lib/actions/quizzes";
import { withValidation } from "@/lib/middleware/validation";
import { generateQuizRequestSchema, Question } from "@/lib/schemas";
import { QuizErrorCode, QuizSystemError } from "@/lib/services/error-handler";
import { getErrorResponse } from "@/lib/utils/error-response";
import { NextRequest, NextResponse } from "next/server";

export type GenerateQuizResponse = {
  id?: string;
  questions: Question[];
};

const generateQuizHandler = withValidation(
  { body: generateQuizRequestSchema },
  {
    rateLimit: {
      requests: 5,
      window: 60 * 1000, // 1 minute
    },
  },
  async (req, validated) => {
    const startTime = performance.now();
    const validatedData = validated.body!;

    try {
      // Validate that at least one question type is selected
      if (
        !validatedData.includeMultipleChoice &&
        !validatedData.includeOpenQuestions &&
        !validatedData.includeCodeSnippets
      ) {
        return NextResponse.json(
          {
            error: "At least one question type must be selected",
            code: QuizErrorCode.INVALID_INPUT,
          },
          { status: 400 }
        );
      }

      // Generate quiz using improved action
      const aiQuiz = await generateNewQuizAction({
        positionId: validatedData.positionId,
        quizTitle: validatedData.quizTitle,
        questionCount: validatedData.questionCount,
        difficulty: validatedData.difficulty,
        includeMultipleChoice: validatedData.includeMultipleChoice,
        includeOpenQuestions: validatedData.includeOpenQuestions,
        includeCodeSnippets: validatedData.includeCodeSnippets,
        previousQuestions: validatedData.previousQuestions,
        specificModel: validatedData.specificModel,
        instructions: validatedData.instructions,
      });

      // Log performance metrics
      const duration = performance.now() - startTime;
      console.log(`Quiz generation completed in ${duration.toFixed(2)}ms`);

      // Add performance headers for monitoring
      const headers = new Headers({
        "X-Generation-Time": duration.toString(),
        "X-Question-Count": validatedData.questionCount.toString(),
      });

      return NextResponse.json(aiQuiz, { headers });
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(
        `Quiz generation failed after ${duration.toFixed(2)}ms:`,
        error
      );

      const errorResponse = getErrorResponse(error);

      // Determine appropriate HTTP status code
      let status = 500;
      if (error instanceof QuizSystemError) {
        switch (error.code) {
          case QuizErrorCode.INVALID_INPUT:
          case QuizErrorCode.INVALID_QUIZ_PARAMS:
            status = 400;
            break;
          case QuizErrorCode.UNAUTHORIZED:
            status = 401;
            break;
          case QuizErrorCode.POSITION_NOT_FOUND:
            status = 404;
            break;
          case QuizErrorCode.SERVICE_UNAVAILABLE:
            status = 503;
            break;
          case QuizErrorCode.TIMEOUT:
            status = 408;
            break;
          case QuizErrorCode.RATE_LIMITED:
            status = 429;
            break;
          default:
            status = 500;
        }
      }

      return NextResponse.json(errorResponse, { status });
    }
  }
);

export async function POST(req: NextRequest) {
  return generateQuizHandler(req);
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "quiz-generation",
    timestamp: new Date().toISOString(),
  });
}
