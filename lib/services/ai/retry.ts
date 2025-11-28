/**
 * AI Service Retry Utilities
 *
 * Retry mechanism with exponential backoff and timeout handling.
 */

import { AIErrorCode, AIGenerationConfig, AIGenerationError } from "./types";

/**
 * Retry mechanism with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: AIGenerationConfig
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (error instanceof AIGenerationError) {
        if (error.code === AIErrorCode.CONTENT_FILTERED) {
          throw error; // Don't retry content filtering
        }
      }

      if (attempt < config.maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = config.retryDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Unknown error occurred during retry");
}

/**
 * Timeout wrapper for promises
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeout: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new AIGenerationError(
              "AI generation timed out",
              AIErrorCode.TIMEOUT
            )
          ),
        timeout
      )
    ),
  ]);
}
