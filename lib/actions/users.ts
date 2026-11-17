"use server";

import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import {
  banUserSchema,
  buildDisplayName,
  createUserSchema,
  emailVerifiedSchema,
  sessionIdSchema,
  setUserPasswordSchema,
  userDataSchema,
  userIdSchema,
  userRoleSchema,
  type BanUserFormData,
  type CreateUserFormData,
  type SetUserPasswordFormData,
  type UserDataFormData,
  type UserRole,
} from "@/lib/schemas/user";
import {
  assertKeepsActiveAdmin,
  assertNotSelf,
  callAdminApi,
} from "@/lib/services/users";
import type { ActionResult } from "@/lib/utils/action-result";
import { invalidateUserCache } from "@/lib/utils/cache-utils";
import { headers } from "next/headers";
import { runAction, UserError } from "./run-action";

// User-management actions: administrators only (requireAdmin right after the
// session check, before parsing input). Writes go through the better-auth
// admin plugin on the server; its HTTP endpoints are disabled.

const DUPLICATE_EMAIL_MESSAGE = "Esiste già un utente con questa email";

async function loadTarget(userId: string) {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, banned: true, email: true },
  });

  if (!target) {
    throw new UserError("Utente non trovato");
  }

  return target;
}

export async function createUserAction(
  values: CreateUserFormData,
): Promise<ActionResult<{ userId: string }>> {
  return runAction("createUserAction", async () => {
    await requireAdmin();
    const payload = createUserSchema.parse(values);

    const existing = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true },
    });
    if (existing) {
      throw new UserError(DUPLICATE_EMAIL_MESSAGE);
    }

    const requestHeaders = await headers();
    const result = await callAdminApi(() =>
      auth.api.createUser({
        headers: requestHeaders,
        body: {
          email: payload.email,
          password: payload.password,
          name: buildDisplayName(payload.firstName, payload.lastName),
          role: payload.role,
          data: { firstName: payload.firstName, lastName: payload.lastName },
        },
      }),
    );
    const userId = result.user.id;

    if (payload.emailVerified) {
      // Separate call: emailVerified is not an input field of createUser.
      await callAdminApi(() =>
        auth.api.adminUpdateUser({
          headers: requestHeaders,
          body: { userId, data: { emailVerified: true } },
        }),
      );
    }

    invalidateUserCache(userId);
    return { userId };
  });
}

export async function updateUserAction(
  userId: string,
  values: UserDataFormData,
): Promise<ActionResult> {
  return runAction("updateUserAction", async () => {
    await requireAdmin();
    const id = userIdSchema.parse(userId);
    const payload = userDataSchema.parse(values);
    const target = await loadTarget(id);

    const emailChanged = payload.email !== target.email;
    if (emailChanged) {
      const other = await prisma.user.findFirst({
        where: { email: payload.email, NOT: { id } },
        select: { id: true },
      });
      if (other) {
        throw new UserError(DUPLICATE_EMAIL_MESSAGE);
      }
    }

    const requestHeaders = await headers();
    await callAdminApi(() =>
      auth.api.adminUpdateUser({
        headers: requestHeaders,
        body: {
          userId: id,
          data: {
            firstName: payload.firstName,
            lastName: payload.lastName,
            name: buildDisplayName(payload.firstName, payload.lastName),
            ...(emailChanged ? { email: payload.email } : {}),
          },
        },
      }),
    );

    invalidateUserCache(id);
  });
}

export async function setUserRoleAction(
  userId: string,
  role: UserRole,
): Promise<ActionResult> {
  return runAction("setUserRoleAction", async () => {
    const actor = await requireAdmin();
    const id = userIdSchema.parse(userId);
    const newRole = userRoleSchema.parse(role);
    const target = await loadTarget(id);

    assertNotSelf(actor.id, id, "Non puoi cambiare il tuo ruolo");
    if (newRole === "user") {
      await assertKeepsActiveAdmin(prisma, target);
    }

    const requestHeaders = await headers();
    await callAdminApi(() =>
      auth.api.setRole({
        headers: requestHeaders,
        body: { userId: id, role: newRole },
      }),
    );

    invalidateUserCache(id);
  });
}

export async function setUserEmailVerifiedAction(
  userId: string,
  emailVerified: boolean,
): Promise<ActionResult> {
  return runAction("setUserEmailVerifiedAction", async () => {
    const actor = await requireAdmin();
    const id = userIdSchema.parse(userId);
    const value = emailVerifiedSchema.parse(emailVerified);
    await loadTarget(id);

    assertNotSelf(
      actor.id,
      id,
      "Non puoi cambiare la verifica della tua email",
    );

    // Sessions stay open: closing them is a separate, explicit command.
    const requestHeaders = await headers();
    await callAdminApi(() =>
      auth.api.adminUpdateUser({
        headers: requestHeaders,
        body: { userId: id, data: { emailVerified: value } },
      }),
    );

    invalidateUserCache(id);
  });
}

export async function setUserPasswordAction(
  userId: string,
  values: SetUserPasswordFormData,
): Promise<ActionResult> {
  return runAction("setUserPasswordAction", async () => {
    await requireAdmin();
    const id = userIdSchema.parse(userId);
    const payload = setUserPasswordSchema.parse(values);
    await loadTarget(id);

    // Sessions stay open: closing them is a separate, explicit command.
    const requestHeaders = await headers();
    await callAdminApi(() =>
      auth.api.setUserPassword({
        headers: requestHeaders,
        body: { userId: id, newPassword: payload.password },
      }),
    );

    invalidateUserCache(id);
  });
}

export async function banUserAction(
  userId: string,
  values: BanUserFormData,
): Promise<ActionResult> {
  return runAction("banUserAction", async () => {
    const actor = await requireAdmin();
    const id = userIdSchema.parse(userId);
    const payload = banUserSchema.parse(values);
    const target = await loadTarget(id);

    assertNotSelf(actor.id, id, "Non puoi bloccare il tuo account");
    await assertKeepsActiveAdmin(prisma, target);

    // Permanent ban (no expiry); the plugin also deletes the user's sessions.
    const requestHeaders = await headers();
    await callAdminApi(() =>
      auth.api.banUser({
        headers: requestHeaders,
        body: { userId: id, banReason: payload.reason },
      }),
    );

    invalidateUserCache(id);
  });
}

export async function unbanUserAction(userId: string): Promise<ActionResult> {
  return runAction("unbanUserAction", async () => {
    await requireAdmin();
    const id = userIdSchema.parse(userId);
    await loadTarget(id);

    const requestHeaders = await headers();
    await callAdminApi(() =>
      auth.api.unbanUser({
        headers: requestHeaders,
        body: { userId: id },
      }),
    );

    invalidateUserCache(id);
  });
}

export async function revokeUserSessionAction(
  userId: string,
  sessionId: string,
): Promise<ActionResult> {
  return runAction("revokeUserSessionAction", async () => {
    await requireAdmin();
    const id = userIdSchema.parse(userId);
    const sid = sessionIdSchema.parse(sessionId);

    // The client only knows the session id; the token stays on the server.
    const session = await prisma.session.findFirst({
      where: { id: sid, userId: id },
      select: { token: true },
    });
    if (!session) {
      throw new UserError("Sessione non trovata");
    }

    const requestHeaders = await headers();
    await callAdminApi(() =>
      auth.api.revokeUserSession({
        headers: requestHeaders,
        body: { sessionToken: session.token },
      }),
    );

    invalidateUserCache(id);
  });
}

export async function revokeUserSessionsAction(
  userId: string,
): Promise<ActionResult> {
  return runAction("revokeUserSessionsAction", async () => {
    await requireAdmin();
    const id = userIdSchema.parse(userId);
    await loadTarget(id);

    const requestHeaders = await headers();
    await callAdminApi(() =>
      auth.api.revokeUserSessions({
        headers: requestHeaders,
        body: { userId: id },
      }),
    );

    invalidateUserCache(id);
  });
}
