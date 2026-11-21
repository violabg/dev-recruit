/**
 * MCP access switches and token revocation. The global switch is the
 * AppSetting 'mcp.enabled' (whole deployment), the per-user one
 * User.mcpDisabled. Revoking a grant deletes the OAuth provider rows of that
 * client and user (refresh tokens, opaque access tokens, consent): the MCP
 * endpoint accepts an access token only while the consent of its grant exists.
 * Domain logic only: no Next.js import and no cache call.
 */

import prisma from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@/lib/prisma/client";
import { assertAdminActor, type Actor } from "./actor";
import { UserError } from "./user-error";

const MCP_ENABLED_KEY = "mcp.enabled";

type Db = PrismaClient | Prisma.TransactionClient;

/** Whether MCP is on for the whole deployment (default on). Never cached. */
export async function isMcpEnabledGlobally(): Promise<boolean> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: MCP_ENABLED_KEY },
    select: { value: true },
  });
  return setting?.value === false ? false : true;
}

export async function setMcpEnabledGlobally(
  actor: Actor,
  enabled: boolean,
): Promise<void> {
  assertAdminActor(actor);
  await prisma.appSetting.upsert({
    where: { key: MCP_ENABLED_KEY },
    create: { key: MCP_ENABLED_KEY, value: enabled, updatedBy: actor.userId },
    update: { value: enabled, updatedBy: actor.userId },
  });
}

/** Switch MCP off or on for one user; switching off also revokes their tokens. */
export async function setUserMcpDisabled(
  actor: Actor,
  userId: string,
  disabled: boolean,
): Promise<void> {
  assertAdminActor(actor);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) throw new UserError("Utente non trovato");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { mcpDisabled: disabled },
    });
    if (disabled) await revokeAllMcpTokensForUser(tx, userId);
  });
}

/** Deletes every token row and consent of one client and user. */
async function revokeGrant(db: Db, clientId: string, userId: string) {
  const where = { clientId, userId };
  await db.oauthAccessToken.deleteMany({ where });
  await db.oauthRefreshToken.deleteMany({ where });
  await db.oauthConsent.deleteMany({ where });
}

/**
 * Revokes the grant a token belongs to: `tokenId` is the id of a refresh
 * token or of an opaque access token row.
 */
export async function revokeMcpToken(
  actor: Actor,
  tokenId: string,
): Promise<void> {
  assertAdminActor(actor);

  const refresh = await prisma.oauthRefreshToken.findUnique({
    where: { id: tokenId },
    select: { clientId: true, userId: true },
  });
  const access = refresh
    ? null
    : await prisma.oauthAccessToken.findUnique({
        where: { id: tokenId },
        select: { clientId: true, userId: true },
      });

  const grant = refresh ?? access;
  if (!grant?.userId) throw new UserError("Token non trovato");

  const { userId } = grant;
  await prisma.$transaction((tx) => revokeGrant(tx, grant.clientId, userId));
}

/**
 * Deletes every OAuth access token, refresh token and consent of a user:
 * every MCP token of the user stops working at once. Returns the number of
 * deleted rows.
 */
export async function revokeAllMcpTokensForUser(
  db: Db,
  userId: string,
): Promise<number> {
  const where = { userId };
  const [access, refresh, consents] = [
    await db.oauthAccessToken.deleteMany({ where }),
    await db.oauthRefreshToken.deleteMany({ where }),
    await db.oauthConsent.deleteMany({ where }),
  ];
  return access.count + refresh.count + consents.count;
}
