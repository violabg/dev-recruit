import { generateNewQuestionAction } from "@/lib/actions/quizzes";
import { withValidation } from "@/lib/middleware/validation";
import { FlexibleQuestion, generateQuestionRequestSchema } from "@/lib/schemas";
import { QuizErrorCode, QuizSystemError } from "@/lib/services/error-handler";
import { getErrorResponse } from "@/lib/utils/error-response";
import { NextResponse } from "next/server";

// Rate limiting configuration for question generation
const QUESTION_RATE_LIMIT_REQUESTS = 10; // More generous for individual questions
const QUESTION_RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

export type GenerateQuestionResponse = FlexibleQuestion;

// Main handler using validation middleware
const generateQuestionHandler = withValidation(
  { body: generateQuestionRequestSchema },
  {
    rateLimit: {
      requests: QUESTION_RATE_LIMIT_REQUESTS,
      window: QUESTION_RATE_LIMIT_WINDOW,
    },
  },
  async (req, validated) => {
    const startTime = performance.now();

    try {
      const validatedData = validated.body!;

      // Generate question using improved action
      const question = await generateNewQuestionAction({
        quizTitle: validatedData.quizTitle,
        positionTitle: validatedData.positionTitle,
        experienceLevel: validatedData.experienceLevel,
        skills: validatedData.skills,
        type: validatedData.type,
        previousQuestions: validatedData.previousQuestions,
        specificModel: validatedData.specificModel,
        instructions: validatedData.instructions,
        questionIndex: validatedData.questionIndex,

        // Pass type-specific parameters
        // Multiple choice specific
        focusAreas: validatedData.focusAreas,
        distractorComplexity: validatedData.distractorComplexity,

        // Open question specific
        requireCodeExample: validatedData.requireCodeExample,
        expectedResponseLength: validatedData.expectedResponseLength,
        evaluationCriteria: validatedData.evaluationCriteria,

        // Code snippet specific - THE CRITICAL FIX!
        language: validatedData.language,
        bugType: validatedData.bugType,
        codeComplexity: validatedData.codeComplexity,
        includeComments: validatedData.includeComments,
      });

      // Log performance metrics
      const duration = performance.now() - startTime;
      console.log(`Question generation completed in ${duration.toFixed(2)}ms`);

      // Add performance headers for monitoring
      const headers = new Headers({
        "X-Generation-Time": duration.toString(),
        "X-Question-Type": validatedData.type,
      });

      return NextResponse.json(question, { headers });
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(
        `Question generation failed after ${duration.toFixed(2)}ms:`,
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

export const POST = generateQuestionHandler;

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "question-generation",
    timestamp: new Date().toISOString(),
  });
}
