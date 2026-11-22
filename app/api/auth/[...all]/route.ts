import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";
import { MCP_RATE_LIMITS, OAUTH_MAX_BODY_BYTES } from "@/lib/mcp/config";
import { checkRateLimit, clientIp } from "@/lib/mcp/rate-limit";
import { authLogger } from "@/lib/services/logger";

const handlers = toNextJsHandler(auth);

type AuthHandler = (request: Request) => Promise<Response>;

/**
 * OAuth endpoints of the provider plugin (docs/mcp.md): size and rate
 * limited here. No CORS header is added: OAuth clients call them from their
 * own servers or native apps. Every other auth path passes through untouched.
 */
const OAUTH_PATHS = new Set(
  ["authorize", "token", "register", "revoke", "consent"].map(
    (endpoint) => `/api/auth/oauth2/${endpoint}`,
  ),
);

function oauthError(
  status: number,
  error: string,
  description: string,
  headers?: HeadersInit,
): Response {
  return Response.json(
    { error, error_description: description },
    { status, headers },
  );
}

const tooLarge = () =>
  oauthError(413, "request_too_large", "Richiesta troppo grande");

/** The request with its body read once and size-checked, or null when too large */
async function readLimitedRequest(request: Request): Promise<Request | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > OAUTH_MAX_BODY_BYTES) return null;

  if (request.method === "GET" || request.method === "HEAD") return request;

  const body = await request.arrayBuffer();
  if (body.byteLength > OAUTH_MAX_BODY_BYTES) return null;

  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body,
  });
}

/** Per-IP limit, then per-user when a session exists; null when allowed */
async function rateLimitRefusal(request: Request): Promise<Response | null> {
  let result = await checkRateLimit(
    `oauth:ip:${clientIp(request)}`,
    MCP_RATE_LIMITS.oauthPerIpPerMinute,
  );

  if (result.allowed) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (session?.user) {
      result = await checkRateLimit(
        `oauth:user:${session.user.id}`,
        MCP_RATE_LIMITS.oauthPerUserPerMinute,
      );
    }
  }

  if (result.allowed) return null;

  return oauthError(
    429,
    "rate_limited",
    "Troppe richieste, riprova tra poco",
    { "Retry-After": String(result.retryAfterSeconds) },
  );
}

function withOAuthLimits(handler: AuthHandler): AuthHandler {
  return async (request) => {
    const { pathname } = new URL(request.url);
    if (!OAUTH_PATHS.has(pathname)) return handler(request);

    try {
      const limited = await readLimitedRequest(request);
      if (!limited) return tooLarge();

      let refusal: Response | null;
      try {
        refusal = await rateLimitRefusal(request);
      } catch (error) {
        // Fail closed: without the limiter the OAuth endpoints stay shut
        authLogger.error("OAuth rate limit check failed", {
          path: pathname,
          error: error instanceof Error ? error.message : String(error),
        });
        return oauthError(
          503,
          "temporarily_unavailable",
          "Servizio temporaneamente non disponibile. Riprova tra poco.",
        );
      }
      if (refusal) return refusal;

      return await handler(limited);
    } catch (error) {
      authLogger.error("OAuth endpoint failed", {
        path: pathname,
        error: error instanceof Error ? error.message : String(error),
      });
      return oauthError(500, "server_error", "Si è verificato un errore. Riprova.");
    }
  };
}

export const GET = withOAuthLimits(handlers.GET);
export const POST = withOAuthLimits(handlers.POST);
