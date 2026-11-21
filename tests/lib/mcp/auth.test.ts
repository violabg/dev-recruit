import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("better-auth/oauth2", () => ({ verifyJwsAccessToken: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getJwks: vi.fn(async () => ({ keys: [] })) } },
}));

vi.mock("@/lib/services/mcp-access", () => ({
  isMcpEnabledGlobally: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    oauthConsent: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

import { verifyJwsAccessToken } from "better-auth/oauth2";
import {
  MCP_TOKEN_ISSUER,
  McpAuthError,
  requireMcpActor,
  requireScope,
  type McpActor,
} from "@/lib/mcp/auth";
import { APP_URL, MCP_RESOURCE_URL } from "@/lib/mcp/config";
import prisma from "@/lib/prisma";
import { isMcpEnabledGlobally } from "@/lib/services/mcp-access";

const db = prisma as any;

const request = (authorization?: string) =>
  new Request(`${APP_URL}/api/mcp`, {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });

const claims = (overrides: Record<string, unknown> = {}) => ({
  sub: "user-1",
  aud: MCP_RESOURCE_URL,
  client_id: "client-1",
  azp: "client-1",
  scope: "recruit:read recruit:draft offline_access",
  jti: "jti-1",
  ...overrides,
});

const enabledUser = {
  id: "user-1",
  role: "user",
  emailVerified: true,
  banned: false,
  mcpDisabled: false,
};

beforeEach(() => {
  vi.mocked(verifyJwsAccessToken).mockResolvedValue(claims() as never);
  db.oauthConsent.findFirst.mockResolvedValue({ id: "consent-1" });
  db.user.findUnique.mockResolvedValue(enabledUser);
  vi.mocked(isMcpEnabledGlobally).mockResolvedValue(true);
});

async function expectAuthError(promise: Promise<unknown>, code: string, message?: string) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(McpAuthError);
  expect((error as McpAuthError).code).toBe(code);
  if (message) expect((error as McpAuthError).message).toBe(message);
}

describe("requireMcpActor", () => {
  it("returns the actor of a valid token with the role read from the database", async () => {
    db.user.findUnique.mockResolvedValue({ ...enabledUser, role: "admin" });

    const actor = await requireMcpActor(request("Bearer token-abc"));

    expect(actor).toEqual({
      userId: "user-1",
      role: "admin",
      clientId: "client-1",
      // offline_access is not an MCP scope
      scopes: ["recruit:read", "recruit:draft"],
      tokenId: "jti-1",
    });
    expect(verifyJwsAccessToken).toHaveBeenCalledWith(
      "token-abc",
      expect.objectContaining({
        verifyOptions: {
          issuer: MCP_TOKEN_ISSUER,
          audience: MCP_RESOURCE_URL,
          typ: "at+jwt",
        },
      }),
    );
    expect(MCP_TOKEN_ISSUER).toBe(`${APP_URL}/api/auth`);
    expect(db.oauthConsent.findFirst).toHaveBeenCalledWith({
      where: { clientId: "client-1", userId: "user-1" },
      select: { id: true },
    });
  });

  it.each([undefined, "Basic abc", "Bearer", "Bearer a b"])(
    "refuses a missing or malformed header %j",
    async (header) => {
      await expectAuthError(requireMcpActor(request(header)), "invalid_token", "Token mancante");
      expect(verifyJwsAccessToken).not.toHaveBeenCalled();
    },
  );

  it("refuses an expired or badly signed token", async () => {
    vi.mocked(verifyJwsAccessToken).mockRejectedValue(new Error('"exp" claim timestamp check failed'));

    await expectAuthError(
      requireMcpActor(request("Bearer t")),
      "invalid_token",
      "Token non valido o scaduto",
    );
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ["another audience", { aud: "https://other.example.com/api" }],
    ["several audiences", { aud: [MCP_RESOURCE_URL, "https://other.example.com"] }],
    ["no client", { client_id: undefined, azp: undefined }],
    ["no subject", { sub: undefined }],
    ["no token id", { jti: undefined }],
  ])("refuses a token with %s", async (_label, override) => {
    vi.mocked(verifyJwsAccessToken).mockResolvedValue(claims(override) as never);

    await expectAuthError(requireMcpActor(request("Bearer t")), "invalid_token");
  });

  it("refuses a token whose grant was revoked (no consent left)", async () => {
    db.oauthConsent.findFirst.mockResolvedValue(null);

    await expectAuthError(requireMcpActor(request("Bearer t")), "invalid_token");
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", null],
    ["unverified", { ...enabledUser, emailVerified: false }],
    ["banned", { ...enabledUser, banned: true }],
    ["MCP-disabled", { ...enabledUser, mcpDisabled: true }],
  ])("refuses a %s user with access_disabled", async (_label, row) => {
    db.user.findUnique.mockResolvedValue(row);

    await expectAuthError(
      requireMcpActor(request("Bearer t")),
      "access_disabled",
      "Accesso MCP disattivato",
    );
  });

  it("refuses everyone while the global switch is off", async () => {
    vi.mocked(isMcpEnabledGlobally).mockResolvedValue(false);

    await expectAuthError(requireMcpActor(request("Bearer t")), "access_disabled");
  });
});

describe("requireScope", () => {
  const actor: McpActor = {
    userId: "u1",
    role: "user",
    clientId: "c1",
    scopes: ["recruit:read"],
    tokenId: "t1",
  };

  it("passes for a granted scope", () => {
    expect(() => requireScope(actor, "recruit:read")).not.toThrow();
  });

  it.each(["recruit:draft", "recruit:write"] as const)(
    "refuses %s: no scope implies another",
    (scope) => {
      try {
        requireScope(actor, scope);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(McpAuthError);
        expect(error).toMatchObject({
          code: "insufficient_scope",
          message: `Permesso non concesso: ${scope}`,
          requiredScope: scope,
        });
      }
    },
  );
});
