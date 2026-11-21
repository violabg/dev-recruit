import { describe, expect, it } from "vitest";

import {
  MCP_REDIRECT_ALLOWLIST,
  MCP_RESOURCE_URL,
  MCP_SCOPES,
  APP_URL,
  isAllowedRedirectUri,
} from "@/lib/mcp/config";

describe("MCP config", () => {
  it("derives the resource URL from the app URL without a trailing slash", () => {
    expect(APP_URL.endsWith("/")).toBe(false);
    expect(MCP_RESOURCE_URL).toBe(`${APP_URL}/api/mcp`);
  });

  it("lists exactly the three recruit scopes", () => {
    expect(MCP_SCOPES).toEqual(["recruit:read", "recruit:draft", "recruit:write"]);
  });

  it("contains no secret-looking value", () => {
    for (const entry of MCP_REDIRECT_ALLOWLIST) {
      expect(entry).not.toMatch(/secret|token|key=/i);
    }
  });
});

describe("isAllowedRedirectUri", () => {
  it.each([
    "https://claude.ai/api/mcp/auth_callback",
    "https://vscode.dev/redirect",
    "http://127.0.0.1/",
  ])("allows the exact entry %s", (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(true);
  });

  it.each([
    "http://127.0.0.1:33418",
    "http://127.0.0.1:33418/",
    "http://127.0.0.1:5000/",
  ])("allows the loopback entry on any port (%s)", (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(true);
  });

  it.each([
    // other host, path or scheme
    "https://claude.ai/api/mcp/other",
    "https://evil.example.com/api/mcp/auth_callback",
    "https://claude.ai.evil.example.com/api/mcp/auth_callback",
    "http://claude.ai/api/mcp/auth_callback",
    "https://vscode.dev/redirect/extra",
    "http://127.0.0.1:33418/callback",
    "https://127.0.0.1:33418/",
    "http://192.168.1.10:33418/",
    // loopback with query, credentials or fragment
    "http://127.0.0.1:33418/?next=https://evil.example.com",
    "http://user:pass@127.0.0.1:33418/",
    "http://127.0.0.1:33418/#frag",
    // not documented by the Claude docs: not on the allowlist
    "https://claude.com/api/mcp/auth_callback",
  ])("refuses %s", (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(false);
  });

  it.each(["", "not a url", "claude.ai/api/mcp/auth_callback"])(
    "refuses the invalid URL %j",
    (uri) => {
      expect(isAllowedRedirectUri(uri)).toBe(false);
    },
  );
});
