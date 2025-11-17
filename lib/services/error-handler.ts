import { AIErrorCode } from "./ai-service";

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

    // Log to console (in production, this would go to a logging service)
    if (this.isDevelopment) {
      console.error("=== ERROR DETAILS ===");
      console.error("Timestamp:", timestamp);
      console.error("Message:", errorInfo.message);
      console.error("Code:", errorInfo.code);
      console.error("Context:", context);
      if (errorInfo.stack) {
        console.error("Stack:", errorInfo.stack);
      }
      console.error("===================");
    } else {
      // In production, log structured data
      console.error(JSON.stringify(logEntry));
    }

    // In a real application, you would also:
    // - Send to error monitoring service (Sentry, Rollbar, etc.)
    // - Store in database for analysis
    // - Send alerts for critical errors
    // - Update metrics/dashboards

    try {
      // Example: Send to monitoring service
      await this.sendToMonitoringService(logEntry);
    } catch (monitoringError) {
      // Don't let monitoring failures break the application
      console.error(
        "Failed to send error to monitoring service:",
        monitoringError
      );
    }
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

  /**
   * Send error information to monitoring service
   * In a real application, this would integrate with your monitoring solution
   */
  private async sendToMonitoringService(logEntry: any): Promise<void> {
    // Placeholder for monitoring service integration
    // Examples: Sentry, Rollbar, DataDog, New Relic, etc.

    if (this.isDevelopment) {
      // In development, just log that we would send to monitoring
      console.log("Would send to monitoring service:", {
        service: "error-monitoring",
        severity: this.getSeverityLevel(logEntry.code),
        error: logEntry.message,
        context: logEntry.context,
      });
    }

    // In production, you would make actual API calls:
    /*
    try {
      await fetch('https://your-monitoring-service/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      // Handle monitoring service errors
    }
    */
  }

  /**
   * Determine severity level for monitoring
   */
  private getSeverityLevel(
    code?: string
  ): "low" | "medium" | "high" | "critical" {
    if (!code) return "medium";

    switch (code) {
      case QuizErrorCode.INVALID_INPUT:
      case QuizErrorCode.INVALID_QUIZ_PARAMS:
        return "low";

      case QuizErrorCode.UNAUTHORIZED:
      case QuizErrorCode.POSITION_NOT_FOUND:
      case QuizErrorCode.QUIZ_NOT_FOUND:
        return "medium";

      case QuizErrorCode.DATABASE_ERROR:
      case QuizErrorCode.SERVICE_UNAVAILABLE:
        return "high";

      case QuizErrorCode.INTERNAL_ERROR:
        return "critical";

      default:
        return "medium";
    }
  }

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
