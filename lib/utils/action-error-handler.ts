import { AIGenerationError } from "@/lib/services/ai-service";
import {
  errorHandler,
  getUserFriendlyErrorMessage,
  QuizSystemError,
} from "@/lib/services/error-handler";
import { logger } from "@/lib/services/logger";

/**
 * Options for the action error handler
 */
export interface ActionErrorOptions {
  /** Operation name for logging context */
  operation: string;
  /** Additional context to log with the error */
  context?: Record<string, unknown>;
  /** Default error message if no specific handler matches */
  fallbackMessage?: string;
  /** Whether to re-throw AI and Quiz system errors directly */
  rethrowKnownErrors?: boolean;
}

/**
 * Handles errors in server actions with consistent patterns:
 * 1. Logs the error with context using errorHandler
 * 2. Re-throws known error types (QuizSystemError, AIGenerationError) when specified
 * 3. Converts QuizSystemError to user-friendly messages
 * 4. Throws a generic error for unknown errors
 *
 * @example
 * ```ts
 * try {
 *   // action logic
 * } catch (error) {
 *   handleActionError(error, {
 *     operation: "createQuiz",
 *     context: { positionId },
 *     fallbackMessage: "Quiz creation failed. Please try again.",
 *   });
 * }
 * ```
 */
export function handleActionError(
  error: unknown,
  options: ActionErrorOptions
): never {
  const {
    operation,
    context = {},
    fallbackMessage = "Operation failed. Please try again.",
    rethrowKnownErrors = false,
  } = options;

  logger.debug(`${operation} failed`, context);

  // Re-throw known errors directly if specified (for AI generation flows)
  if (rethrowKnownErrors) {
    if (
      error instanceof QuizSystemError ||
      error instanceof AIGenerationError
    ) {
      throw error;
    }
  }

  // Convert QuizSystemError to user-friendly message
  if (error instanceof QuizSystemError) {
    throw new Error(getUserFriendlyErrorMessage(error));
  }

  // Log the error with context
  errorHandler
    .handleError(error, {
      operation,
      ...context,
    })
    .catch(() => {
      // Ignore logging errors
    });

  // Throw generic error for unknown errors
  throw new Error(fallbackMessage);
}

/**
 * Checks if an error is a Next.js redirect response.
 * Redirects should be re-thrown, not caught as errors.
 */
export function isRedirectError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "digest" in error);
}
