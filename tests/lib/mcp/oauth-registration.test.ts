import { beforeEach, describe, expect, it, vi } from "vitest";

// The guard is a Better Auth middleware: unwrap it to its handler and mock
// the session read, keeping the real APIError
vi.mock("better-auth/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("better-auth/api")>()),
  createAuthMiddleware: (handler: unknown) => handler,
  getSessionFromCtx: vi.fn(),
}));

import { getSessionFromCtx } from "better-auth/api";
import {
  ACCOUNT_NOT_ENABLED_MESSAGE,
  assertAccountCanAuthorize,
  assertAllowedRegistration,
  oauthRequestGuard,
  validateAuthorizeRedirectUri,
} from "@/lib/mcp/oauth-registration";

const CLAUDE_CALLBACK = "https://claude.ai/api/mcp/auth_callback";

const guard = oauthRequestGuard as unknown as (ctx: {
  path: string;
  body?: unknown;
}) => Promise<void>;

describe("assertAllowedRegistration", () => {
  it("accepts a public client with allowlisted redirects", () => {
    expect(() =>
      assertAllowedRegistration({
        client_name: "Claude",
        redirect_uris: [CLAUDE_CALLBACK],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      }),
    ).not.toThrow();
  });

  it("accepts a registration that omits the auth method and the types", () => {
    expect(() =>
      assertAllowedRegistration({
        redirect_uris: ["http://127.0.0.1:33418", "https://vscode.dev/redirect"],
      }),
    ).not.toThrow();
  });

  it.each([
    [[CLAUDE_CALLBACK, "https://evil.example.com/callback"]],
    [["https://evil.example.com/callback"]],
    [[]],
  ])("refuses redirect URIs %j with invalid_redirect_uri", (redirectUris) => {
    expect(() =>
      assertAllowedRegistration({ redirect_uris: redirectUris }),
    ).toThrow(
      expect.objectContaining({
        statusCode: 400,
        body: expect.objectContaining({
          error: "invalid_redirect_uri",
          error_description: "URI di reindirizzamento non consentito",
        }),
      }),
    );
  });

  it("refuses a request without redirect_uris", () => {
    expect(() => assertAllowedRegistration({} as never)).toThrow(
      expect.objectContaining({
        body: expect.objectContaining({ error: "invalid_redirect_uri" }),
      }),
    );
  });

  it.each(["client_secret_basic", "client_secret_post", "private_key_jwt"])(
    "refuses the confidential method %s",
    (method) => {
      expect(() =>
        assertAllowedRegistration({
          redirect_uris: [CLAUDE_CALLBACK],
          token_endpoint_auth_method: method,
        }),
      ).toThrow(
        expect.objectContaining({
          body: expect.objectContaining({
            error: "invalid_client_metadata",
            error_description: "Sono ammessi solo client pubblici",
          }),
        }),
      );
    },
  );

  it("refuses grant types other than authorization code and refresh token", () => {
    expect(() =>
      assertAllowedRegistration({
        redirect_uris: [CLAUDE_CALLBACK],
        grant_types: ["authorization_code", "client_credentials"],
      }),
    ).toThrow(
      expect.objectContaining({
        body: expect.objectContaining({ error: "invalid_client_metadata" }),
      }),
    );
  });

  it("refuses response types other than code", () => {
    expect(() =>
      assertAllowedRegistration({
        redirect_uris: [CLAUDE_CALLBACK],
        response_types: ["token"],
      }),
    ).toThrow(
      expect.objectContaining({
        body: expect.objectContaining({ error: "invalid_client_metadata" }),
      }),
    );
  });
});

describe("validateAuthorizeRedirectUri", () => {
  it("accepts an allowlisted URI the plugin matched", () => {
    expect(validateAuthorizeRedirectUri(CLAUDE_CALLBACK, [CLAUDE_CALLBACK], true)).toBe(
      true,
    );
  });

  it("refuses a URI off the allowlist even when registered", () => {
    expect(
      validateAuthorizeRedirectUri(
        "https://evil.example.com/cb",
        ["https://evil.example.com/cb"],
        true,
      ),
    ).toBe(false);
  });

  it("refuses an allowlisted URI not registered for the client", () => {
    expect(
      validateAuthorizeRedirectUri(CLAUDE_CALLBACK, ["https://vscode.dev/redirect"], false),
    ).toBe(false);
  });

  it("accepts a registered loopback redirect on another port", () => {
    expect(
      validateAuthorizeRedirectUri("http://127.0.0.1:33418", ["http://127.0.0.1/"], false),
    ).toBe(true);
  });
});

describe("assertAccountCanAuthorize", () => {
  it("passes for a verified, not banned user and when nobody is signed in", () => {
    expect(() =>
      assertAccountCanAuthorize({ emailVerified: true, banned: false }),
    ).not.toThrow();
    expect(() => assertAccountCanAuthorize(null)).not.toThrow();
  });

  it.each([
    { emailVerified: false, banned: false },
    { emailVerified: true, banned: true },
  ])("refuses %j with access_denied", (user) => {
    expect(() => assertAccountCanAuthorize(user)).toThrow(
      expect.objectContaining({
        statusCode: 403,
        body: expect.objectContaining({
          error: "access_denied",
          error_description: ACCOUNT_NOT_ENABLED_MESSAGE,
        }),
      }),
    );
  });
});

describe("oauthRequestGuard", () => {
  beforeEach(() => {
    vi.mocked(getSessionFromCtx).mockResolvedValue(null as never);
  });

  it("checks the registration body on /oauth2/register", async () => {
    await expect(
      guard({
        path: "/oauth2/register",
        body: { redirect_uris: ["https://evil.example.com/cb"] },
      }),
    ).rejects.toMatchObject({ body: { error: "invalid_redirect_uri" } });
    expect(getSessionFromCtx).not.toHaveBeenCalled();
  });

  it.each(["/oauth2/authorize", "/oauth2/consent"])(
    "refuses an unverified account on %s",
    async (path) => {
      vi.mocked(getSessionFromCtx).mockResolvedValue({
        user: { id: "u1", emailVerified: false, banned: false },
      } as never);

      await expect(guard({ path })).rejects.toMatchObject({
        body: { error: "access_denied" },
      });
    },
  );

  it("refuses a banned account on /oauth2/authorize", async () => {
    vi.mocked(getSessionFromCtx).mockResolvedValue({
      user: { id: "u1", emailVerified: true, banned: true },
    } as never);

    await expect(guard({ path: "/oauth2/authorize" })).rejects.toMatchObject({
      body: { error: "access_denied" },
    });
  });

  it("lets an enabled account and other paths through", async () => {
    vi.mocked(getSessionFromCtx).mockResolvedValue({
      user: { id: "u1", emailVerified: true, banned: false },
    } as never);

    await expect(guard({ path: "/oauth2/authorize" })).resolves.toBeUndefined();
    await expect(guard({ path: "/sign-in/email" })).resolves.toBeUndefined();
  });
});
