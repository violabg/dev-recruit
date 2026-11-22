/**
 * MCP and OAuth constants. Everything here is public: the repository is
 * public, so this module holds no secret, only the public endpoint, the
 * scopes, the redirect allowlist of the supported clients and the limits.
 */

export type McpScope = "recruit:read" | "recruit:draft" | "recruit:write";

export type McpToolGroup = "read" | "draft" | "write";

/** Public base URL of the app (same variable and fallback as lib/auth.ts) */
export const APP_URL: string = (
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
).replace(/\/+$/, "");

/** The MCP endpoint: the only protected resource and token audience */
export const MCP_RESOURCE_URL = `${APP_URL}/api/mcp`;

export const MCP_SCOPES: readonly McpScope[] = [
  "recruit:read",
  "recruit:draft",
  "recruit:write",
];

/** Tool groups served by /api/mcp; each tool still needs its scope */
export const MCP_ENABLED_TOOL_GROUPS: readonly McpToolGroup[] = [
  "read",
  "draft",
  "write",
];

export const MCP_ACCESS_TOKEN_TTL_SECONDS = 900;
export const MCP_REFRESH_TOKEN_TTL_SECONDS = 2_592_000;

/**
 * Redirect URIs of the supported clients (docs/mcp.md): the Claude hosted
 * apps callback, then VS Code (loopback on any port, and the vscode.dev
 * redirect).
 */
export const MCP_REDIRECT_ALLOWLIST: readonly string[] = [
  "https://claude.ai/api/mcp/auth_callback",
  "http://127.0.0.1/",
  "https://vscode.dev/redirect",
];

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost"]);

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLoopbackEntry(url: URL): boolean {
  return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
}

/**
 * Whether a redirect URI is on the allowlist: exact match, except that a
 * loopback entry (http on 127.0.0.1 or localhost) matches scheme, host and
 * path whatever the port. An invalid URL is never allowed.
 */
export function isAllowedRedirectUri(uri: string): boolean {
  const candidate = parseUrl(uri);
  if (!candidate) return false;

  return MCP_REDIRECT_ALLOWLIST.some((entry) => {
    if (entry === uri) return true;

    const allowed = parseUrl(entry);
    if (!allowed || !isLoopbackEntry(allowed)) return false;

    return (
      candidate.protocol === allowed.protocol &&
      candidate.hostname === allowed.hostname &&
      candidate.pathname === allowed.pathname &&
      candidate.username === "" &&
      candidate.password === "" &&
      candidate.search === "" &&
      candidate.hash === ""
    );
  });
}

/** Public client id of the pre-registered VS Code client */
export const VSCODE_CLIENT_ID = "dev-recruit-vscode";

export const MCP_RATE_LIMITS = {
  mcpPerUserPerMinute: 60,
  mcpPerIpPerMinute: 120,
  oauthPerIpPerMinute: 20,
  oauthPerUserPerMinute: 20,
} as const;

export const MCP_MAX_BODY_BYTES = 262_144;
export const OAUTH_MAX_BODY_BYTES = 16_384;
export const AUDIT_ARGUMENTS_MAX_BYTES = 4_096;
