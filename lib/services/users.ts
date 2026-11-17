import type { UserRole } from "@/lib/schemas/user";
import { authLogger } from "@/lib/services/logger";
import { UserError } from "@/lib/services/user-error";

// ====================
// TYPES
// ====================

/** The user a role removal or a ban is about to touch. */
export type AdminRuleTarget = { id: string; role: string; banned: boolean | null };

export type UserCountClient = {
  user: {
    count(args: { where: { role: string; banned: boolean } }): Promise<number>;
  };
};

export type LastLoginClient = {
  user: {
    update(args: {
      where: { id: string };
      data: { lastLoginAt: Date };
    }): Promise<unknown>;
  };
};

export type MakeAdminClient = {
  user: {
    findUnique(args: {
      where: { email: string };
      select: { id: true; role: true; banned: true; emailVerified: true };
    }): Promise<{
      id: string;
      role: string;
      banned: boolean | null;
      emailVerified: boolean;
    } | null>;
    update(args: {
      where: { id: string };
      data: {
        role: UserRole;
        emailVerified: boolean;
        banned: boolean;
        banReason: null;
        banExpires: null;
      };
    }): Promise<unknown>;
  };
};

export type MakeAdminResult = {
  status: "promoted" | "already-admin";
  userId: string;
  email: string;
};

const LAST_ACTIVE_ADMIN_MESSAGE = "Deve restare almeno un amministratore attivo";
const ADMIN_ONLY_MESSAGE = "Operazione riservata agli amministratori";

// ====================
// SAFETY RULES
// ====================

/** Refuses an operation an actor may not perform on their own record. */
export function assertNotSelf(
  actorId: string,
  targetId: string,
  message: string
): void {
  if (actorId === targetId) {
    throw new UserError(message);
  }
}

/**
 * Refuses a role removal or a ban that would leave no active administrator
 * (an `admin` that is not banned). No-op when the target is not an active
 * administrator.
 */
export async function assertKeepsActiveAdmin(
  client: UserCountClient,
  target: AdminRuleTarget
): Promise<void> {
  if (target.role !== "admin" || target.banned === true) {
    return;
  }

  const count = await client.user.count({
    where: { role: "admin", banned: false },
  });

  if (count <= 1) {
    throw new UserError(LAST_ACTIVE_ADMIN_MESSAGE);
  }
}

// ====================
// ADMIN PLUGIN ERRORS
// ====================

const ADMIN_API_CODE_MESSAGES: Record<string, string> = {
  YOU_CANNOT_BAN_YOURSELF: "Non puoi bloccare il tuo account",
  USER_NOT_FOUND: "Utente non trovato",
  USER_ALREADY_EXISTS: "Esiste già un utente con questa email",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Esiste già un utente con questa email",
  PASSWORD_TOO_SHORT: "La password deve avere almeno 8 caratteri",
  PASSWORD_TOO_LONG: "La password può avere al massimo 128 caratteri",
  INVALID_EMAIL: "Email non valida",
};

const ADMIN_ONLY_STATUSES = new Set<unknown>([
  "FORBIDDEN",
  "UNAUTHORIZED",
  403,
  401,
]);

type AdminApiErrorShape = {
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
  body?: { code?: unknown } | null;
};

/**
 * Runs a better-auth admin plugin call and turns its known errors into
 * Italian `UserError`s. Unknown errors are rethrown unchanged.
 */
export async function callAdminApi<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    const shape = (error ?? {}) as AdminApiErrorShape;
    const rawCode = shape.body?.code ?? shape.code;
    const code = typeof rawCode === "string" ? rawCode : undefined;
    const status = shape.status ?? shape.statusCode;

    if (code && ADMIN_API_CODE_MESSAGES[code]) {
      throw new UserError(ADMIN_API_CODE_MESSAGES[code]);
    }

    if (
      (code && code.startsWith("YOU_ARE_NOT_ALLOWED")) ||
      ADMIN_ONLY_STATUSES.has(status)
    ) {
      throw new UserError(ADMIN_ONLY_MESSAGE);
    }

    throw error;
  }
}

// ====================
// LAST LOGIN
// ====================

/**
 * Stores the time of a new session as the user's last login. Never throws:
 * a failure is logged and sign-in goes on.
 */
export async function recordLastLogin(
  client: LastLoginClient,
  session: { userId: string; createdAt?: Date | null },
  now: Date = new Date()
): Promise<void> {
  try {
    await client.user.update({
      where: { id: session.userId },
      data: { lastLoginAt: session.createdAt ?? now },
    });
  } catch (error) {
    authLogger.error("Failed to record last login", {
      userId: session.userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ====================
// FIRST ADMINISTRATOR
// ====================

/**
 * Promotes an existing account to an active, verified administrator.
 * Never creates a user.
 */
export async function makeAdmin(
  client: MakeAdminClient,
  email: string
): Promise<MakeAdminResult> {
  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    throw new UserError("Indica l'email dell'utente");
  }

  const existing = await client.user.findUnique({
    where: { email: normalized },
    select: { id: true, role: true, banned: true, emailVerified: true },
  });

  if (!existing) {
    throw new UserError(`Nessun utente con email ${normalized}`);
  }

  const wasAdmin =
    existing.role === "admin" &&
    existing.banned !== true &&
    existing.emailVerified === true;

  await client.user.update({
    where: { id: existing.id },
    data: {
      role: "admin",
      emailVerified: true,
      banned: false,
      banReason: null,
      banExpires: null,
    },
  });

  return {
    status: wasAdmin ? "already-admin" : "promoted",
    userId: existing.id,
    email: normalized,
  };
}
