import { AIErrorCode } from "./ai-service";
import { logger } from "./logger";

// Quiz-specific error types
export class QuizSystemError extends Error {
  constructor(
    message: string,
    public code: QuizErrorCode,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = "QuizSystemError";
  }
}

export enum QuizErrorCode {
  // Input validation errors
  INVALID_INPUT = "INVALID_INPUT",
  INVALID_QUIZ_PARAMS = "INVALID_QUIZ_PARAMS",

  // Authentication and authorization errors
  UNAUTHORIZED = "UNAUTHORIZED",

  // Resource errors
  POSITION_NOT_FOUND = "POSITION_NOT_FOUND",
  QUIZ_NOT_FOUND = "QUIZ_NOT_FOUND",
  QUESTION_NOT_FOUND = "QUESTION_NOT_FOUND",

  // AI service errors
  AI_GENERATION_FAILED = "AI_GENERATION_FAILED",
  AI_MODEL_UNAVAILABLE = "AI_MODEL_UNAVAILABLE",

  // System errors
  DATABASE_ERROR = "DATABASE_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  TIMEOUT = "TIMEOUT",
  RATE_LIMITED = "RATE_LIMITED",
}

// Error context interface
export interface ErrorContext {
  operation?: string;
  userId?: string;
  positionId?: string;
  quizId?: string;
  questionType?: string;
  [key: string]: any;
}

// Italian error messages for user-friendly display
const USER_FRIENDLY_MESSAGES: Record<QuizErrorCode, string> = {
  [QuizErrorCode.INVALID_INPUT]:
    "I dati inseriti non sono validi. Controlla e riprova.",
  [QuizErrorCode.INVALID_QUIZ_PARAMS]:
    "I parametri del quiz non sono corretti. Verifica le impostazioni.",
  [QuizErrorCode.UNAUTHORIZED]:
    "Non hai i permessi per eseguire questa operazione.",
  [QuizErrorCode.POSITION_NOT_FOUND]: "Posizione non trovata o accesso negato.",
  [QuizErrorCode.QUIZ_NOT_FOUND]: "Quiz non trovato o accesso negato.",
  [QuizErrorCode.QUESTION_NOT_FOUND]: "Domanda non trovata o accesso negato.",
  [QuizErrorCode.AI_GENERATION_FAILED]:
    "Generazione AI fallita. Riprova tra qualche minuto.",
  [QuizErrorCode.AI_MODEL_UNAVAILABLE]:
    "Il modello AI richiesto non è disponibile. Prova con un altro modello.",
  [QuizErrorCode.DATABASE_ERROR]: "Errore del database. Riprova più tardi.",
  [QuizErrorCode.INTERNAL_ERROR]:
    "Si è verificato un errore interno. Riprova più tardi.",
  [QuizErrorCode.SERVICE_UNAVAILABLE]:
    "Il servizio è temporaneamente non disponibile. Riprova tra qualche minuto.",
  [QuizErrorCode.TIMEOUT]:
    "L'operazione ha richiesto troppo tempo. Riprova con parametri più semplici.",
  [QuizErrorCode.RATE_LIMITED]:
    "Troppe richieste. Attendi un minuto prima di riprovare.",
};

// Get user-friendly error message
export function getUserFriendlyErrorMessage(error: QuizSystemError): string {
  return (
    USER_FRIENDLY_MESSAGES[error.code] ||
    "Si è verificato un errore imprevisto."
  );
}

// Enhanced error handler class
export class ErrorHandler {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
  }

  /**
   * Handle and log errors with appropriate context
   */
  async handleError(error: unknown, context: ErrorContext = {}): Promise<void> {
    const timestamp = new Date().toISOString();
    const errorInfo = this.extractErrorInfo(error);

    // Create comprehensive error log
    const logEntry = {
      timestamp,
      level: "error",
      message: errorInfo.message,
      code: errorInfo.code,
      stack: errorInfo.stack,
      context,
      ...errorInfo.details,
    };

    // Log using centralized logger
    if (this.isDevelopment) {
      logger.error("Error occurred", {
        message: errorInfo.message,
        code: errorInfo.code,
        context,
        stack: errorInfo.stack,
      });
    } else {
      // In production, log structured data
      logger.error(errorInfo.message, {
        code: errorInfo.code,
        context,
        ...errorInfo.details,
      });
    }

    // In a real application, you would also store logs or send alerts.
  }

  /**
   * Extract structured information from any error type
   */
  private extractErrorInfo(error: unknown): {
    message: string;
    code?: string;
    stack?: string;
    details?: Record<string, any>;
  } {
    if (error instanceof QuizSystemError) {
      return {
        message: error.message,
        code: error.code,
        stack: error.stack,
        details: error.context,
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        code: "UNKNOWN_ERROR",
      };
    }

    return {
      message: String(error),
      code: "UNKNOWN_ERROR",
    };
  }

  // No external monitoring integration in this project.

  /**
   * Create a QuizSystemError from an AI error
   */
  mapAIError(aiError: any): QuizSystemError {
    if (typeof aiError === "object" && aiError.code) {
      switch (aiError.code) {
        case AIErrorCode.GENERATION_FAILED:
          return new QuizSystemError(
            "AI generation failed",
            QuizErrorCode.AI_GENERATION_FAILED,
            { aiError: aiError.message }
          );

        case AIErrorCode.MODEL_UNAVAILABLE:
          return new QuizSystemError(
            "AI model unavailable",
            QuizErrorCode.AI_MODEL_UNAVAILABLE,
            { aiError: aiError.message }
          );

        case AIErrorCode.TIMEOUT:
          return new QuizSystemError(
            "AI generation timeout",
            QuizErrorCode.TIMEOUT,
            { aiError: aiError.message }
          );

        case AIErrorCode.RATE_LIMITED:
          return new QuizSystemError(
            "AI service rate limited",
            QuizErrorCode.RATE_LIMITED,
            { aiError: aiError.message }
          );

        case AIErrorCode.QUOTA_EXCEEDED:
          return new QuizSystemError(
            "AI service quota exceeded",
            QuizErrorCode.SERVICE_UNAVAILABLE,
            { aiError: aiError.message }
          );

        default:
          return new QuizSystemError(
            "AI generation failed",
            QuizErrorCode.AI_GENERATION_FAILED,
            { aiError: aiError.message }
          );
      }
    }

    // Fallback for unknown AI errors
    return new QuizSystemError(
      "AI generation failed",
      QuizErrorCode.AI_GENERATION_FAILED,
      { aiError: String(aiError) }
    );
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Utility function to create standardized errors
export function createQuizError(
  message: string,
  code: QuizErrorCode,
  context?: Record<string, any>
): QuizSystemError {
  return new QuizSystemError(message, code, context);
}

// Utility function to check if an error is a known quiz error
export function isQuizSystemError(error: unknown): error is QuizSystemError {
  return error instanceof QuizSystemError;
}

// Utility function to safely extract error message
export function getErrorMessage(error: unknown): string {
  if (error instanceof QuizSystemError) {
    return getUserFriendlyErrorMessage(error);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Si è verificato un errore imprevisto.";
}
