import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: { api: {} } }));

import { GET, OPTIONS } from "@/app/.well-known/oauth-protected-resource/route";
import { APP_URL, MCP_RESOURCE_URL } from "@/lib/mcp/config";

describe("GET /.well-known/oauth-protected-resource", () => {
  it("returns the RFC 9728 metadata of /api/mcp, readable from any origin", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(await response.json()).toEqual({
      resource: MCP_RESOURCE_URL,
      authorization_servers: [`${APP_URL}/api/auth`],
      scopes_supported: ["recruit:read", "recruit:draft", "recruit:write"],
      bearer_methods_supported: ["header"],
      resource_name: "dev-recruit",
    });
  });
});

describe("OPTIONS /.well-known/oauth-protected-resource", () => {
  it("answers 204 with Allow and CORS headers", () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Allow")).toBe("GET, OPTIONS");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
