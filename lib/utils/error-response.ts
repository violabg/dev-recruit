import { AIGenerationError } from "../services/ai-service";
import {
  QuizErrorCode,
  QuizSystemError,
  getUserFriendlyErrorMessage,
} from "../services/error-handler";

// Helper function to get user-friendly error messages for API responses
export function getErrorResponse(error: unknown): {
  error: string;
  code?: string;
} {
  if (error instanceof QuizSystemError) {
    return {
      error: getUserFriendlyErrorMessage(error),
      code: error.code,
    };
  }

  if (error instanceof AIGenerationError) {
    return {
      error: "AI generation failed. Please try again.",
      code: "AI_ERROR",
    };
  }

  return {
    error: "Si è verificato un errore interno. Riprova più tardi.",
    code: QuizErrorCode.INTERNAL_ERROR,
  };
}
