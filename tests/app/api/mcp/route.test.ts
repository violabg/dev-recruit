import { beforeEach, describe, expect, it, vi } from "vitest";

const { mcpHandler } = vi.hoisted(() => ({ mcpHandler: vi.fn() }));

vi.mock("@/lib/mcp/server", () => ({
  guardMcpRequest: vi.fn(),
  createDevRecruitMcpHandler: vi.fn(() => mcpHandler),
}));

import { DELETE, GET, POST, maxDuration } from "@/app/api/mcp/route";
import type { McpActor } from "@/lib/mcp/auth";
import { createDevRecruitMcpHandler, guardMcpRequest } from "@/lib/mcp/server";

const actor: McpActor = {
  userId: "u1",
  role: "user",
  clientId: "c1",
  scopes: ["recruit:read"],
  tokenId: "t1",
};

const request = () =>
  new Request("http://localhost:3000/api/mcp", {
    method: "POST",
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });

beforeEach(() => {
  mcpHandler.mockResolvedValue(Response.json({ jsonrpc: "2.0", id: 1, result: {} }));
});

describe("POST /api/mcp", () => {
  it("hands an allowed request to the MCP handler of its actor", async () => {
    vi.mocked(guardMcpRequest).mockResolvedValue({ actor });
    const incoming = request();

    const response = await POST(incoming);

    expect(guardMcpRequest).toHaveBeenCalledWith(incoming);
    expect(createDevRecruitMcpHandler).toHaveBeenCalledWith(actor);
    expect(mcpHandler).toHaveBeenCalledWith(incoming);
    expect(response.status).toBe(200);
  });

  it("returns the guard refusal without reaching the MCP handler", async () => {
    vi.mocked(guardMcpRequest).mockResolvedValue({
      response: new Response(null, { status: 401 }),
    });

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(createDevRecruitMcpHandler).not.toHaveBeenCalled();
  });

  it("adds no CORS header", async () => {
    vi.mocked(guardMcpRequest).mockResolvedValue({ actor });

    const response = await POST(request());

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("allows up to 60 seconds", () => {
    expect(maxDuration).toBe(60);
  });
});

describe("GET and DELETE /api/mcp", () => {
  it.each([
    ["GET", GET],
    ["DELETE", DELETE],
  ])("%s answers 405 with Allow: POST (stateless server)", (_method, handler) => {
    const response = handler();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(guardMcpRequest).not.toHaveBeenCalled();
  });
});
