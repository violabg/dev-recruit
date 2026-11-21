/**
 * Actor
 *
 * The user an operation runs for, given explicitly by the caller: the session
 * user for a server action, the token user for an MCP tool. Every enabled
 * user reads and edits all selection data; only user and MCP management also
 * require the admin role. Domain logic only: no Next.js import.
 */

import type { Prisma, PrismaClient } from "@/lib/prisma/client";
import { UserError } from "./user-error";

export type ActorRole = "user" | "admin";

export interface Actor {
  readonly userId: string;
  readonly role: ActorRole;
}

const SESSION_EXPIRED_MESSAGE =
  "Sessione scaduta. Accedi di nuovo per continuare.";
const ADMIN_ONLY_MESSAGE = "Operazione riservata agli amministratori";

/** Actor of a user row: any role other than 'admin' is 'user'. */
export function toActor(user: { id: string; role?: string | null }): Actor {
  return { userId: user.id, role: user.role === "admin" ? "admin" : "user" };
}

/**
 * Refuses a missing, unverified or banned user. It never checks ownership or
 * role: any enabled user may run a selection-data operation.
 */
export async function assertActorEnabled(
  db: Prisma.TransactionClient | PrismaClient,
  actor: Actor,
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: actor.userId },
    select: { emailVerified: true, banned: true },
  });

  if (!user || !user.emailVerified || user.banned) {
    throw new UserError(SESSION_EXPIRED_MESSAGE);
  }
}

/** Only for user and MCP management: refuses a non-admin actor. */
export function assertAdminActor(actor: Actor): void {
  if (actor.role !== "admin") {
    throw new UserError(ADMIN_ONLY_MESSAGE);
  }
}
