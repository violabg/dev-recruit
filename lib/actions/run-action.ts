/**
 * Shared shell of every server action: runs the body and turns failures into
 * an ActionResult (see lib/utils/action-result.ts).
 *
 * Not a "use server" module: it is imported by the action files.
 */

import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { describeAIError } from "../services/ai/generate";
import { AIGenerationError } from "../services/ai/types";
import {
  getUserFriendlyErrorMessage,
  QuizSystemError,
} from "../services/error-handler";
import { logger } from "../services/logger";
import { UserError } from "../services/user-error";
import {
  GENERIC_ERROR,
  type ActionResult,
} from "../utils/action-result";

function toUserMessage(operation: string, error: unknown): string {
  if (error instanceof UserError) return error.message;

  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "I dati inseriti non sono validi.";
  }

  if (error instanceof QuizSystemError) {
    return getUserFriendlyErrorMessage(error);
  }

  if (error instanceof AIGenerationError) {
    return describeAIError(error);
  }

  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return "Sessione scaduta. Accedi di nuovo per continuare.";
  }

  logger.error(`${operation} failed`, { error });
  return GENERIC_ERROR;
}

/**
 * Run an action body. What it returns is merged into `{ success: true }`;
 * what it throws becomes `{ success: false, error }`.
 * redirect() and notFound() pass through untouched.
 */
export async function runAction<T extends object>(
  operation: string,
  body: () => Promise<T | void>,
): Promise<ActionResult<T>> {
  try {
    const data = await body();
    return { ...(data as T), success: true };
  } catch (error) {
    unstable_rethrow(error);
    return { success: false, error: toUserMessage(operation, error) };
  }
}

export { UserError };
