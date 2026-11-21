/**
 * Bearer-token actor of the MCP endpoint: the MCP equivalent of requireUser.
 * Never reads cookies. The access token is a JWT of the OAuth provider
 * (typ at+jwt) signed with the jwt plugin keys; it is accepted only for the
 * MCP resource, while the consent of its grant exists (revocation and ban
 * delete it) and while its user can use MCP. The role is read from the
 * database on every call.
 */

import { verifyJwsAccessToken } from "better-auth/oauth2";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { toActor, type Actor } from "@/lib/services/actor";
import { isMcpEnabledGlobally } from "@/lib/services/mcp-access";
import { APP_URL, MCP_RESOURCE_URL, MCP_SCOPES, type McpScope } from "./config";

export type { McpScope };

export interface McpActor extends Actor {
  readonly clientId: string;
  readonly scopes: readonly McpScope[];
  readonly tokenId: string;
}

export type McpAuthErrorCode =
  | "invalid_token"
  | "insufficient_scope"
  | "access_disabled";

export class McpAuthError extends Error {
  constructor(
    readonly code: McpAuthErrorCode,
    message: string,
    readonly requiredScope?: McpScope,
  ) {
    super(message);
    this.name = "McpAuthError";
  }
}

/** Issuer of the OAuth provider: the auth base URL */
export const MCP_TOKEN_ISSUER = `${APP_URL}/api/auth`;

const INVALID_TOKEN_MESSAGE = "Token non valido o scaduto";
const ACCESS_DISABLED_MESSAGE = "Accesso MCP disattivato";

/** Stable key: the verifier caches the JWKS under it */
const JWKS_CACHE_KEY = {};

function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match) throw new McpAuthError("invalid_token", "Token mancante");
  return match[1];
}

function isMcpScope(scope: string): scope is McpScope {
  return (MCP_SCOPES as readonly string[]).includes(scope);
}

async function verifyAccessToken(token: string) {
  try {
    const payload = await verifyJwsAccessToken(token, {
      jwksFetch: async () => auth.api.getJwks(),
      jwksCacheKey: JWKS_CACHE_KEY,
      verifyOptions: {
        issuer: MCP_TOKEN_ISSUER,
        audience: MCP_RESOURCE_URL,
        typ: "at+jwt",
      },
    });

    // Exactly this resource: a token issued for several audiences is refused
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    const clientId = payload.client_id ?? payload.azp;
    if (
      audience.length !== 1 ||
      audience[0] !== MCP_RESOURCE_URL ||
      typeof payload.sub !== "string" ||
      typeof clientId !== "string" ||
      typeof payload.jti !== "string"
    ) {
      throw new Error("unexpected claims");
    }

    return {
      userId: payload.sub,
      clientId,
      tokenId: payload.jti,
      scope: typeof payload.scope === "string" ? payload.scope : "",
    };
  } catch {
    throw new McpAuthError("invalid_token", INVALID_TOKEN_MESSAGE);
  }
}

/**
 * Resolves the bearer token of an MCP request to its actor, or throws
 * McpAuthError: invalid_token (missing, malformed, expired, other audience,
 * revoked grant) or access_disabled (unverified, banned, MCP off for the user
 * or for everyone).
 */
export async function requireMcpActor(request: Request): Promise<McpActor> {
  const token = bearerToken(request);
  const claims = await verifyAccessToken(token);

  // Revocation: the grant lives as long as its consent
  const consent = await prisma.oauthConsent.findFirst({
    where: { clientId: claims.clientId, userId: claims.userId },
    select: { id: true },
  });
  if (!consent) throw new McpAuthError("invalid_token", INVALID_TOKEN_MESSAGE);

  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: {
      id: true,
      role: true,
      emailVerified: true,
      banned: true,
      mcpDisabled: true,
    },
  });

  if (
    !user ||
    !user.emailVerified ||
    user.banned ||
    user.mcpDisabled ||
    !(await isMcpEnabledGlobally())
  ) {
    throw new McpAuthError("access_disabled", ACCESS_DISABLED_MESSAGE);
  }

  return {
    ...toActor(user),
    clientId: claims.clientId,
    scopes: claims.scope.split(" ").filter(isMcpScope),
    tokenId: claims.tokenId,
  };
}

/** Each tool names exactly one scope; no scope implies another. */
export function requireScope(actor: McpActor, scope: McpScope): void {
  if (!actor.scopes.includes(scope)) {
    throw new McpAuthError(
      "insufficient_scope",
      `Permesso non concesso: ${scope}`,
      scope,
    );
  }
}
