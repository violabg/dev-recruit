/**
 * Live reads of the MCP admin page: never cached (tokens and switches change
 * outside any cache tag). Called only after requireAdminPage.
 *
 * MCP access tokens are JWTs and are not stored: the active grants are the
 * stored refresh tokens (not revoked, not expired) plus any opaque access
 * token row still valid. Revoking one revokes its whole grant
 * (lib/services/mcp-access.ts).
 */

import prisma from "@/lib/prisma";
import { isMcpEnabledGlobally } from "@/lib/services/mcp-access";

export interface ActiveMcpToken {
  /** Refresh token or opaque access token id, accepted by revokeMcpToken */
  id: string;
  user: { id: string; name: string; email: string };
  clientId: string;
  clientName: string;
  scopes: string[];
  createdAt: Date;
  expiresAt: Date;
  refreshExpiresAt: Date | null;
}

export interface McpAuditRow {
  id: string;
  user: { id: string; name: string } | null;
  clientId: string | null;
  scopes: string[];
  tool: string;
  arguments: unknown;
  status: string;
  summary: string;
  createdAt: Date;
}

const AUDIT_PAGE_SIZE = 50;

const userSelect = {
  id: true,
  name: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

function displayName(user: {
  name: string;
  firstName: string | null;
  lastName: string | null;
}): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.name;
}

export async function getActiveMcpTokens(): Promise<ActiveMcpToken[]> {
  const now = new Date();
  const clientSelect = { select: { clientId: true, name: true } } as const;

  const [refreshTokens, accessTokens] = await Promise.all([
    prisma.oauthRefreshToken.findMany({
      where: { revoked: null, expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        scopes: true,
        createdAt: true,
        expiresAt: true,
        user: { select: userSelect },
        client: clientSelect,
      },
    }),
    // Opaque access tokens not covered by a listed refresh token
    prisma.oauthAccessToken.findMany({
      where: { revoked: null, expiresAt: { gt: now }, userId: { not: null } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        scopes: true,
        createdAt: true,
        expiresAt: true,
        refreshId: true,
        user: { select: userSelect },
        client: clientSelect,
        refreshToken: { select: { expiresAt: true, revoked: true } },
      },
    }),
  ]);

  const listedRefreshIds = new Set(refreshTokens.map((token) => token.id));

  const rows: ActiveMcpToken[] = [
    ...refreshTokens.map((token) => ({
      id: token.id,
      user: {
        id: token.user.id,
        name: displayName(token.user),
        email: token.user.email,
      },
      clientId: token.client.clientId,
      clientName: token.client.name ?? token.client.clientId,
      scopes: token.scopes,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      refreshExpiresAt: token.expiresAt,
    })),
    ...accessTokens.flatMap((token) =>
      token.user && !(token.refreshId && listedRefreshIds.has(token.refreshId))
        ? [
            {
              id: token.id,
              user: {
                id: token.user.id,
                name: displayName(token.user),
                email: token.user.email,
              },
              clientId: token.client.clientId,
              clientName: token.client.name ?? token.client.clientId,
              scopes: token.scopes,
              createdAt: token.createdAt,
              expiresAt: token.expiresAt,
              refreshExpiresAt:
                token.refreshToken && !token.refreshToken.revoked
                  ? token.refreshToken.expiresAt
                  : null,
            },
          ]
        : [],
    ),
  ];

  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getMcpAudit(filter: {
  userId?: string;
  tool?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize?: number;
}): Promise<{ rows: McpAuditRow[]; total: number }> {
  const pageSize = filter.pageSize ?? AUDIT_PAGE_SIZE;
  const page = Math.max(1, Math.floor(filter.page) || 1);

  const where = {
    ...(filter.userId ? { userId: filter.userId } : {}),
    ...(filter.tool ? { tool: filter.tool } : {}),
    ...(filter.from || filter.to
      ? {
          createdAt: {
            ...(filter.from ? { gte: filter.from } : {}),
            ...(filter.to ? { lte: filter.to } : {}),
          },
        }
      : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.mcpAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.mcpAuditLog.count({ where }),
  ]);

  // The audit row keeps a plain user id: resolve the names in one read
  const userIds = [
    ...new Set(entries.flatMap((entry) => (entry.userId ? [entry.userId] : []))),
  ];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, firstName: true, lastName: true },
      })
    : [];
  const nameById = new Map(users.map((user) => [user.id, displayName(user)]));

  return {
    rows: entries.map((entry) => ({
      id: entry.id,
      user: entry.userId
        ? { id: entry.userId, name: nameById.get(entry.userId) ?? entry.userId }
        : null,
      clientId: entry.clientId,
      scopes: entry.scopes,
      tool: entry.tool,
      arguments: entry.arguments,
      status: entry.status,
      summary: entry.summary,
      createdAt: entry.createdAt,
    })),
    total,
  };
}

export async function getMcpAccessState(): Promise<{
  enabled: boolean;
  disabledUsers: { id: string; name: string; email: string }[];
  users: { id: string; name: string; email: string; mcpDisabled: boolean }[];
}> {
  const [enabled, rows] = await Promise.all([
    isMcpEnabledGlobally(),
    prisma.user.findMany({
      where: { banned: false, emailVerified: true },
      orderBy: { name: "asc" },
      select: { ...userSelect, mcpDisabled: true },
    }),
  ]);

  const users = rows.map((user) => ({
    id: user.id,
    name: displayName(user),
    email: user.email,
    mcpDisabled: user.mcpDisabled,
  }));

  return {
    enabled,
    users,
    disabledUsers: users
      .filter((user) => user.mcpDisabled)
      .map(({ id, name, email }) => ({ id, name, email })),
  };
}
