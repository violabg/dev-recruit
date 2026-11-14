/**
 * The contract between server actions and their callers.
 *
 * Every mutation returns an ActionResult instead of throwing for failures a
 * user can cause or fix (invalid input, missing record, expired session...).
 * Messages of errors thrown on the server are replaced by a generic text in
 * production builds, so a returned `error` is the only way a specific,
 * Italian message reaches the screen.
 *
 * Safe to import from both server and client code.
 */

export type ActionFailure = { success: false; error: string };
export type ActionSuccess<T = unknown> = { success: true } & T;
export type ActionResult<T = unknown> = ActionSuccess<T> | ActionFailure;

/**
 * Client-side companion: returns the successful result, or throws an Error
 * carrying the action's message so one `try/catch` handles every failure.
 *
 * ```ts
 * try {
 *   const { id } = unwrap(await upsertQuizAction(values));
 * } catch (error) {
 *   toast.error(errorMessage(error));
 * }
 * ```
 */
export function unwrap<R extends { success: boolean }>(
  result: R | undefined | void,
): Extract<R, { success: true }> {
  if (!result || !result.success) {
    const message =
      result && "error" in result && typeof result.error === "string"
        ? result.error
        : GENERIC_ERROR;
    throw new Error(message);
  }
  return result as Extract<R, { success: true }>;
}

export const GENERIC_ERROR = "Si è verificato un errore. Riprova.";

/** Message to show for anything caught on the client. */
export function errorMessage(error: unknown, fallback = GENERIC_ERROR) {
  return error instanceof Error && error.message ? error.message : fallback;
}
