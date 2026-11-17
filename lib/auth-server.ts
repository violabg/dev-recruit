import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { UserError } from "@/lib/services/user-error";
import { auth } from "./auth";
import { authLogger } from "./services/logger";

/**
 * Get current user session from Better Auth
 * Use this in server actions to authorize requests
 * Note: This requires headers() to be available (not during prerendering)
 *
 * Better Auth will automatically refresh the session token if it's stale
 * (see session.updateAge config in lib/auth.ts)
 */
export async function getCurrentUser() {
  try {
    // Check if headers() is available (will throw during prerendering)
    const headersList = await headers();
    const response = await auth.api.getSession({
      headers: headersList,
    });

    if (!response || !response.user) {
      // Session is invalid or expired
      // Better Auth has already attempted refresh if possible
      authLogger.debug("Session not available or expired", {
        hasResponse: !!response,
        hasUser: !!response?.user,
      });
      return null;
    }

    return response.user;
  } catch (error) {
    // Log only if it's not a prerendering error
    if (error instanceof Error && !error.message.includes("prerendering")) {
      authLogger.error("Failed to get current user", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}

/**
 * Require user to be authenticated
 * Throws an error if user is not authenticated
 * Use this in protected server actions
 *
 * When this throws, the error should be handled by the caller
 * to provide appropriate UI feedback (e.g., redirect to login)
 */
export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    // Throw with code that can be caught and handled specifically
    const error = new Error("UNAUTHENTICATED");
    (error as any).code = "UNAUTHENTICATED";
    throw error;
  }

  return user;
}

/**
 * Whether the user has the `admin` role. The only role check in the app:
 * it guards user management and nothing else.
 */
export function isAdmin(
  user: { role?: string | null } | null | undefined
): boolean {
  return user?.role === "admin";
}

/**
 * Require an authenticated administrator. Use it in user-management server
 * actions only, before parsing any input: the session is checked first
 * (Error("UNAUTHENTICATED") as requireUser), then the role (UserError).
 */
export async function requireAdmin() {
  const user = await requireUser();

  if (!isAdmin(user)) {
    throw new UserError("Operazione riservata agli amministratori");
  }

  return user;
}

/**
 * Require an administrator in a user-management server component; anyone
 * else gets the not-found page. Call it after awaiting a request value
 * (`await connection()` or `await searchParams`), never inside "use cache".
 */
export async function requireAdminPage() {
  const user = await getCurrentUser();

  if (!isAdmin(user)) {
    notFound();
  }

  return user!;
}
