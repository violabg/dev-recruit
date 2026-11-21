import { beforeEach, describe, expect, it, vi } from "vitest";

const { serveMetadata } = vi.hoisted(() => ({ serveMetadata: vi.fn() }));

vi.mock("@better-auth/oauth-provider", () => ({
  oauthProviderAuthServerMetadata: vi.fn(() => serveMetadata),
}));

vi.mock("@/lib/auth", () => ({ auth: { marker: "auth" } }));

import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { GET, OPTIONS } from "@/app/.well-known/oauth-authorization-server/route";
import {
  GET as GET_WITH_ISSUER_PATH,
  OPTIONS as OPTIONS_WITH_ISSUER_PATH,
} from "@/app/.well-known/oauth-authorization-server/api/auth/route";

// Captured at import: the setup file clears mock calls before each test
const helperCalls = [...vi.mocked(oauthProviderAuthServerMetadata).mock.calls];

const pluginMetadata = {
  issuer: "http://localhost:3000/api/auth",
  authorization_endpoint: "http://localhost:3000/api/auth/oauth2/authorize",
  token_endpoint: "http://localhost:3000/api/auth/oauth2/token",
  registration_endpoint: "http://localhost:3000/api/auth/oauth2/register",
  revocation_endpoint: "http://localhost:3000/api/auth/oauth2/revoke",
  code_challenge_methods_supported: ["S256"],
  token_endpoint_auth_methods_supported: ["none", "client_secret_basic"],
};

beforeEach(() => {
  serveMetadata.mockResolvedValue(Response.json(pluginMetadata));
});

describe("GET /.well-known/oauth-authorization-server", () => {
  it("is built on the plugin metadata helper over auth", () => {
    expect(helperCalls).toEqual([[{ marker: "auth" }]]);
  });

  it("returns the plugin metadata, public clients only, readable from any origin", async () => {
    const request = new Request(
      "http://localhost:3000/.well-known/oauth-authorization-server",
    );

    const response = await GET(request);

    expect(serveMetadata).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(await response.json()).toEqual({
      ...pluginMetadata,
      token_endpoint_auth_methods_supported: ["none"],
    });
  });

  it("passes a plugin error through unchanged", async () => {
    serveMetadata.mockResolvedValue(new Response("nope", { status: 500 }));

    const response = await GET(
      new Request("http://localhost:3000/.well-known/oauth-authorization-server"),
    );

    expect(response.status).toBe(500);
  });

  it("serves the same document at the path-inserted issuer location", async () => {
    const response = await GET_WITH_ISSUER_PATH(
      new Request(
        "http://localhost:3000/.well-known/oauth-authorization-server/api/auth",
      ),
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(await response.json()).toMatchObject({ issuer: pluginMetadata.issuer });
  });
});

describe("OPTIONS /.well-known/oauth-authorization-server", () => {
  it.each([
    ["root", OPTIONS],
    ["issuer path", OPTIONS_WITH_ISSUER_PATH],
  ])("answers 204 with Allow and CORS headers (%s)", (_label, handler) => {
    const response = handler();

    expect(response.status).toBe(204);
    expect(response.headers.get("Allow")).toBe("GET, OPTIONS");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
