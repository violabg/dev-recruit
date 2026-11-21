import { beforeEach, describe, expect, it, vi } from "vitest";

const { pluginGET, pluginPOST, getSession } = vi.hoisted(() => ({
  pluginGET: vi.fn(),
  pluginPOST: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: () => ({ GET: pluginGET, POST: pluginPOST }),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

vi.mock("@/lib/mcp/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mcp/rate-limit")>()),
  checkRateLimit: vi.fn(),
}));

import { GET, POST } from "@/app/api/auth/[...all]/route";
import { OAUTH_MAX_BODY_BYTES } from "@/lib/mcp/config";
import { assertAccountCanAuthorize } from "@/lib/mcp/oauth-registration";
import { checkRateLimit } from "@/lib/mcp/rate-limit";

const BASE = "http://localhost:3000/api/auth";
const allowed = { allowed: true, remaining: 10, retryAfterSeconds: 30 };

const tokenRequest = (body: string, headers: Record<string, string> = {}) =>
  new Request(`${BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-forwarded-for": "1.2.3.4",
      ...headers,
    },
    body,
  });

beforeEach(() => {
  vi.mocked(checkRateLimit).mockResolvedValue(allowed);
  getSession.mockResolvedValue(null);
  pluginGET.mockResolvedValue(new Response("plugin GET"));
  pluginPOST.mockResolvedValue(new Response("plugin POST"));
});

describe("auth catch-all: OAuth endpoints", () => {
  it("passes an allowed request to the plugin with its body", async () => {
    const response = await POST(tokenRequest("grant_type=authorization_code&code=x"));

    expect(await response.text()).toBe("plugin POST");
    const forwarded: Request = pluginPOST.mock.calls[0][0];
    expect(await forwarded.text()).toBe("grant_type=authorization_code&code=x");
    expect(checkRateLimit).toHaveBeenCalledWith("oauth:ip:1.2.3.4", 20);
  });

  it("answers 413 when content-length exceeds the limit, before reading the body", async () => {
    // Request drops a hand-set content-length (forbidden header): build the
    // request the runtime would deliver
    const arrayBuffer = vi.fn();
    const declared = {
      url: `${BASE}/oauth2/token`,
      method: "POST",
      headers: new Headers({
        "content-length": String(OAUTH_MAX_BODY_BYTES + 1),
        "x-forwarded-for": "1.2.3.4",
      }),
      arrayBuffer,
    } as unknown as Request;

    const response = await POST(declared);
    expect(arrayBuffer).not.toHaveBeenCalled();

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: "request_too_large",
      error_description: "Richiesta troppo grande",
    });
    expect(pluginPOST).not.toHaveBeenCalled();
  });

  it("answers 413 when the read body exceeds the limit", async () => {
    const response = await POST(
      new Request(`${BASE}/oauth2/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "x".repeat(OAUTH_MAX_BODY_BYTES + 1),
      }),
    );

    expect(response.status).toBe(413);
    expect(pluginPOST).not.toHaveBeenCalled();
  });

  it("answers 429 with Retry-After over the per-IP limit", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 42,
    });

    const response = await POST(tokenRequest("grant_type=refresh_token"));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(await response.json()).toEqual({
      error: "rate_limited",
      error_description: "Troppe richieste, riprova tra poco",
    });
    expect(pluginPOST).not.toHaveBeenCalled();
  });

  it("also limits per user when a session exists", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(checkRateLimit)
      .mockResolvedValueOnce(allowed)
      .mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterSeconds: 5 });

    const response = await GET(
      new Request(`${BASE}/oauth2/authorize?client_id=c&response_type=code`),
    );

    expect(checkRateLimit).toHaveBeenNthCalledWith(2, "oauth:user:u1", 20);
    expect(response.status).toBe(429);
    expect(pluginGET).not.toHaveBeenCalled();
  });

  it("fails closed with 503 when the limiter cannot reach the database", async () => {
    vi.mocked(checkRateLimit).mockRejectedValue(new Error("db down"));

    const response = await POST(tokenRequest("grant_type=refresh_token"));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "temporarily_unavailable" });
    expect(pluginPOST).not.toHaveBeenCalled();
  });

  it("answers a structured 500 without stack when the plugin throws", async () => {
    pluginPOST.mockRejectedValue(new Error("boom at /secret/path.ts:12"));

    const response = await POST(tokenRequest("grant_type=refresh_token"));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      error: "server_error",
      error_description: "Si è verificato un errore. Riprova.",
    });
    expect(JSON.stringify(body)).not.toContain("secret/path");
  });

  it("adds no CORS header to the OAuth endpoints", async () => {
    const response = await POST(tokenRequest("grant_type=refresh_token"));

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("auth catch-all: other paths", () => {
  it("passes non-OAuth paths through untouched, without limits", async () => {
    const request = new Request(`${BASE}/sign-in/email`, {
      method: "POST",
      body: "x".repeat(OAUTH_MAX_BODY_BYTES + 10),
    });

    const response = await POST(request);

    expect(await response.text()).toBe("plugin POST");
    expect(pluginPOST).toHaveBeenCalledWith(request);
    expect(checkRateLimit).not.toHaveBeenCalled();
  });
});

describe("account gate through the authorize and consent endpoints", () => {
  // Plugin stand-in: like the provider with the oauthRequestGuard hook, it
  // runs the account gate, then redirects with a code; a refused gate ends
  // as the OAuth error JSON the auth library returns
  const pluginWithGate = (user: Record<string, unknown> | null) =>
    vi.fn(async () => {
      try {
        assertAccountCanAuthorize(user as never);
      } catch (error) {
        const apiError = error as { statusCode: number; body: unknown };
        return Response.json(apiError.body, { status: apiError.statusCode });
      }
      return new Response(null, {
        status: 302,
        headers: { Location: "https://claude.ai/api/mcp/auth_callback?code=abc" },
      });
    });

  it.each([
    ["unverified", { id: "u1", emailVerified: false, banned: false }],
    ["banned", { id: "u1", emailVerified: true, banned: true }],
  ])("issues no code to an %s account", async (_label, user) => {
    getSession.mockResolvedValue({ user });
    const plugin = pluginWithGate(user);
    pluginGET.mockImplementation(plugin);
    pluginPOST.mockImplementation(plugin);

    const authorize = await GET(
      new Request(`${BASE}/oauth2/authorize?client_id=c&response_type=code`),
    );
    const consent = await POST(
      new Request(`${BASE}/oauth2/consent`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accept: true }),
      }),
    );

    for (const response of [authorize, consent]) {
      expect(response.status).toBe(403);
      expect(response.headers.get("Location")).toBeNull();
      expect(await response.json()).toMatchObject({ error: "access_denied" });
    }
  });

  it("issues a code to an enabled account", async () => {
    const user = { id: "u1", emailVerified: true, banned: false };
    getSession.mockResolvedValue({ user });
    pluginGET.mockImplementation(pluginWithGate(user));

    const response = await GET(
      new Request(`${BASE}/oauth2/authorize?client_id=c&response_type=code`),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("code=abc");
  });
});
