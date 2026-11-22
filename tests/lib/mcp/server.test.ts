import { beforeEach, describe, expect, it, vi } from "vitest";
import { REACT_WIDGET_HTML } from "@/lib/mcp/widgets/react-html.generated";
import { z } from "zod";

vi.mock("@/lib/auth", () => ({ auth: { api: {} } }));

vi.mock("@/lib/mcp/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mcp/auth")>()),
  requireMcpActor: vi.fn(),
}));

vi.mock("@/lib/mcp/audit", () => ({ recordMcpAudit: vi.fn() }));

vi.mock("@/lib/mcp/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mcp/rate-limit")>()),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/utils/cache-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/utils/cache-utils")>()),
  invalidatePositionCacheInRouteHandler: vi.fn(),
  invalidateQuizCacheInRouteHandler: vi.fn(),
  invalidateInterviewCacheInRouteHandler: vi.fn(),
  invalidateCandidateCacheInRouteHandler: vi.fn(),
  invalidateInterviewProposalCacheInRouteHandler: vi.fn(),
}));

vi.mock("@/lib/services/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  authLogger: { error: vi.fn() },
  aiLogger: { error: vi.fn(), warn: vi.fn() },
}));

import { recordMcpAudit } from "@/lib/mcp/audit";
import { McpAuthError, requireMcpActor, type McpActor } from "@/lib/mcp/auth";
import {
  APP_URL,
  MCP_MAX_BODY_BYTES,
  MCP_RESOURCE_URL,
} from "@/lib/mcp/config";
import { MCP_SERVER_INSTRUCTIONS } from "@/lib/mcp/instructions";
import { checkRateLimit } from "@/lib/mcp/rate-limit";
import {
  GENERIC_ERROR,
  createDevRecruitMcpHandler,
  guardMcpRequest,
  protectedResourceMetadata,
  runTool,
} from "@/lib/mcp/server";
import { defineTool } from "@/lib/mcp/tools/types";
import { logger } from "@/lib/services/logger";
import { UserError } from "@/lib/services/user-error";
import {
  invalidateInterviewCacheInRouteHandler,
  invalidatePositionCacheInRouteHandler,
} from "@/lib/utils/cache-utils";

const actor: McpActor = {
  userId: "u1",
  role: "user",
  clientId: "client-1",
  scopes: ["recruit:read"],
  tokenId: "jti-1",
};

const allowed = { allowed: true, remaining: 10, retryAfterSeconds: 30 };

const handler = vi.fn();
const echoTool = defineTool({
  name: "echo",
  title: "Eco",
  description: "Ripete il testo",
  scope: "recruit:read",
  group: "read",
  inputSchema: z.object({ positionId: z.string().min(1, "Posizione obbligatoria") }),
  readOnly: true,
  handler,
});

const draftTool = defineTool({ ...echoTool, name: "draft_echo", scope: "recruit:draft", group: "draft" });

beforeEach(() => {
  vi.mocked(checkRateLimit).mockResolvedValue(allowed);
  handler.mockResolvedValue({
    text: "fatto",
    structured: { when: new Date("2026-11-21T10:00:00Z"), skipped: undefined },
    invalidate: [
      { kind: "position", positionId: "pos-1" },
      { kind: "interview", interviewId: "int-1", applicationId: "app-1" },
    ],
    auditSummary: "position=pos-1",
  });
});

describe("runTool", () => {
  it("runs the handler, applies the invalidations and audits ok", async () => {
    const result = await runTool(echoTool, actor, { positionId: "pos-1" });

    expect(handler).toHaveBeenCalledWith(actor, { positionId: "pos-1" });
    expect(result).toEqual({
      content: [{ type: "text", text: "fatto" }],
      structuredContent: { when: "2026-11-21T10:00:00.000Z" },
    });
    expect(invalidatePositionCacheInRouteHandler).toHaveBeenCalledWith("pos-1");
    expect(invalidateInterviewCacheInRouteHandler).toHaveBeenCalledWith({
      interviewId: "int-1",
      applicationId: "app-1",
    });
    expect(recordMcpAudit).toHaveBeenCalledWith({
      userId: "u1",
      clientId: "client-1",
      scopes: ["recruit:read"],
      tool: "echo",
      arguments: { positionId: "pos-1" },
      status: "ok",
      summary: "position=pos-1",
    });
  });

  it("refuses a missing scope as denied, without running the handler", async () => {
    const result = await runTool(draftTool, actor, { positionId: "pos-1" });

    expect(result).toEqual({
      content: [{ type: "text", text: "Permesso non concesso: recruit:draft" }],
      isError: true,
    });
    expect(handler).not.toHaveBeenCalled();
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(recordMcpAudit).toHaveBeenCalledWith(
      expect.objectContaining({ tool: "draft_echo", status: "denied", summary: "insufficient_scope" }),
    );
  });

  it("refuses over the per-user tool limit as denied", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, remaining: 0, retryAfterSeconds: 9 });

    const result = await runTool(echoTool, actor, { positionId: "pos-1" });

    expect(result).toMatchObject({ isError: true, content: [{ text: "Troppe richieste, riprova tra poco" }] });
    expect(handler).not.toHaveBeenCalled();
    expect(recordMcpAudit).toHaveBeenCalledWith(expect.objectContaining({ status: "denied" }));
  });

  it("maps invalid input to the first Italian schema message", async () => {
    const result = await runTool(echoTool, actor, { positionId: "" });

    expect(result).toMatchObject({ isError: true, content: [{ text: "Posizione obbligatoria" }] });
    expect(handler).not.toHaveBeenCalled();
    expect(recordMcpAudit).toHaveBeenCalledWith(expect.objectContaining({ status: "error" }));
  });

  it("maps a UserError to its message", async () => {
    handler.mockRejectedValue(new UserError("Posizione non trovata"));

    const result = await runTool(echoTool, actor, { positionId: "nope" });

    expect(result).toMatchObject({ isError: true, content: [{ text: "Posizione non trovata" }] });
    expect(recordMcpAudit).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", summary: "Posizione non trovata" }),
    );
  });

  it("logs any other error and answers the generic text, never a stack", async () => {
    handler.mockRejectedValue(new Error("boom at /lib/secret.ts:3"));

    const result = await runTool(echoTool, actor, { positionId: "pos-1" });

    expect(result).toEqual({ content: [{ type: "text", text: GENERIC_ERROR }], isError: true });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(logger.error).toHaveBeenCalled();
    expect(recordMcpAudit).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", summary: "internal_error" }),
    );
  });
});

describe("guardMcpRequest", () => {
  const mcpRequest = (headers: Record<string, string> = {}, body = "{}") =>
    new Request(`${APP_URL}/api/mcp`, {
      method: "POST",
      headers: { "x-forwarded-for": "1.2.3.4", authorization: "Bearer t", ...headers },
      body,
    });

  beforeEach(() => {
    vi.mocked(requireMcpActor).mockResolvedValue(actor);
  });

  it("returns the actor of an allowed request, limited per IP and per user", async () => {
    await expect(guardMcpRequest(mcpRequest())).resolves.toEqual({ actor });
    expect(checkRateLimit).toHaveBeenNthCalledWith(1, "mcp:ip:1.2.3.4", 120);
    expect(checkRateLimit).toHaveBeenNthCalledWith(2, "mcp:user:u1", 60);
  });

  it("answers 413 for a body over the limit, before the token", async () => {
    const result = await guardMcpRequest(mcpRequest({}, "x".repeat(MCP_MAX_BODY_BYTES + 1)));

    expect("response" in result && result.response.status).toBe(413);
    if ("response" in result) {
      expect(await result.response.json()).toEqual({
        error: "request_too_large",
        error_description: "Richiesta troppo grande",
      });
    }
    expect(requireMcpActor).not.toHaveBeenCalled();
  });

  it("answers 429 with Retry-After over the per-IP limit", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterSeconds: 12 });

    const result = await guardMcpRequest(mcpRequest());

    if (!("response" in result)) throw new Error("expected a refusal");
    expect(result.response.status).toBe(429);
    expect(result.response.headers.get("Retry-After")).toBe("12");
    expect(requireMcpActor).not.toHaveBeenCalled();
  });

  it("answers 429 over the per-user limit", async () => {
    vi.mocked(checkRateLimit)
      .mockResolvedValueOnce(allowed)
      .mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterSeconds: 3 });

    const result = await guardMcpRequest(mcpRequest());

    expect("response" in result && result.response.status).toBe(429);
  });

  it("answers 401 with WWW-Authenticate pointing at the protected-resource metadata", async () => {
    vi.mocked(requireMcpActor).mockRejectedValue(
      new McpAuthError("invalid_token", "Token non valido o scaduto"),
    );

    const result = await guardMcpRequest(mcpRequest());

    if (!("response" in result)) throw new Error("expected a refusal");
    expect(result.response.status).toBe(401);
    expect(result.response.headers.get("WWW-Authenticate")).toBe(
      `Bearer resource_metadata="${APP_URL}/.well-known/oauth-protected-resource/api/mcp", error="invalid_token"`,
    );
    expect(await result.response.json()).toEqual({
      error: "invalid_token",
      error_description: "Token non valido o scaduto",
    });
  });

  it("answers 403 access_disabled for a disabled user", async () => {
    vi.mocked(requireMcpActor).mockRejectedValue(
      new McpAuthError("access_disabled", "Accesso MCP disattivato"),
    );

    const result = await guardMcpRequest(mcpRequest());

    if (!("response" in result)) throw new Error("expected a refusal");
    expect(result.response.status).toBe(403);
    expect(await result.response.json()).toEqual({
      error: "access_disabled",
      error_description: "Accesso MCP disattivato",
    });
  });

  it("answers a JSON-RPC 500 without stack on an unexpected failure", async () => {
    vi.mocked(requireMcpActor).mockRejectedValue(new Error("db down at /x.ts"));

    const result = await guardMcpRequest(mcpRequest());

    if (!("response" in result)) throw new Error("expected a refusal");
    expect(result.response.status).toBe(500);
    const body = await result.response.json();
    expect(body).toEqual({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32603, message: GENERIC_ERROR },
    });
  });
});

describe("protectedResourceMetadata", () => {
  it("names the resource and the authorization server, readable from any origin", async () => {
    const response = protectedResourceMetadata();

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

describe("createDevRecruitMcpHandler (Streamable HTTP)", () => {
  async function rpc(tools: Parameters<typeof createDevRecruitMcpHandler>[1], body: unknown) {
    const response = await createDevRecruitMcpHandler(actor, tools)(
      new Request(`${APP_URL}/api/mcp`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "mcp-protocol-version": "2025-06-18",
        },
        body: JSON.stringify(body),
      }),
    );
    const text = await response.text();
    const json = text.trim().startsWith("{")
      ? text
      : text
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("");
    return { status: response.status, body: JSON.parse(json) };
  }

  it("returns the server instructions on initialize", async () => {
    const { body } = await rpc([echoTool], {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test", version: "1" },
      },
    });

    expect(body.result.serverInfo.name).toBe("dev-recruit");
    expect(body.result.instructions).toBe(MCP_SERVER_INSTRUCTIONS);
  });

  it("lists only the given tools with their JSON schema", async () => {
    const { body } = await rpc([echoTool], { jsonrpc: "2.0", id: 2, method: "tools/list" });

    expect(body.result.tools).toHaveLength(1);
    expect(body.result.tools[0]).toMatchObject({
      name: "echo",
      title: "Eco",
      annotations: { readOnlyHint: true },
      inputSchema: {
        type: "object",
        properties: { positionId: { type: "string" } },
        required: ["positionId"],
      },
    });
  });

  it("routes tools/call through the wrapper: Italian error for invalid input, audited", async () => {
    const { body } = await rpc([echoTool], {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "echo", arguments: { positionId: "" } },
    });

    expect(body.result).toMatchObject({
      isError: true,
      content: [{ type: "text", text: "Posizione obbligatoria" }],
    });
    expect(recordMcpAudit).toHaveBeenCalledWith(expect.objectContaining({ tool: "echo", status: "error" }));
  });

  it("returns the text result of a successful call", async () => {
    const { body } = await rpc([echoTool], {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "echo", arguments: { positionId: "pos-1" } },
    });

    expect(body.result.content).toEqual([{ type: "text", text: "fatto" }]);
    expect(body.result.isError).toBeFalsy();
  });

  const widgetTool = defineTool({ ...echoTool, name: "center", widget: "action-center" });
  it("links a tool to its widget; a tool without widget has no _meta", async () => {
    const { body } = await rpc([widgetTool, echoTool], {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/list",
    });

    const byName = Object.fromEntries(
      body.result.tools.map((tool: { name: string }) => [tool.name, tool]),
    );
    expect(byName.center._meta).toEqual({
      ui: { resourceUri: "ui://dev-recruit/action-center.html" },
      "ui/resourceUri": "ui://dev-recruit/action-center.html",
    });
    expect(byName.echo._meta).toBeUndefined();
  });

  it("hides an app-only tool from the model with the MCP Apps visibility", async () => {
    const confirmTool = defineTool({
      ...echoTool,
      name: "confirm",
      widget: "draft-preview",
      appOnly: true,
    });
    const { body } = await rpc([confirmTool], { jsonrpc: "2.0", id: 8, method: "tools/list" });

    expect(body.result.tools[0]._meta).toEqual({
      ui: { resourceUri: "ui://dev-recruit/draft-preview.html", visibility: ["app"] },
      "ui/resourceUri": "ui://dev-recruit/draft-preview.html",
    });
  });

  it("lists the shipped widget resources", async () => {
    const { body } = await rpc([echoTool], { jsonrpc: "2.0", id: 6, method: "resources/list" });

    expect(body.result.resources.map((resource: { uri: string }) => resource.uri)).toEqual([
      "ui://dev-recruit/action-center.html",
      "ui://dev-recruit/position.html",
      "ui://dev-recruit/application-flow.html",
      "ui://dev-recruit/draft-preview.html",
      "ui://dev-recruit/interview-prep.html",
      "ui://dev-recruit/position-form.html",
      "ui://dev-recruit/quiz-form.html",
      "ui://dev-recruit/schedule-form.html",
    ]);
  });

  it("serves the self-contained widget bundle with an empty CSP", async () => {
    const { body } = await rpc([echoTool], {
      jsonrpc: "2.0",
      id: 7,
      method: "resources/read",
      params: { uri: "ui://dev-recruit/position.html" },
    });

    const [content] = body.result.contents;
    expect(content.mimeType).toBe("text/html;profile=mcp-app");
    expect(content._meta.ui).toEqual({ csp: {}, prefersBorder: true });
    expect(content.text).toMatch(/^<!doctype html>/i);
    // Inlined: no external script or stylesheet
    expect(content.text).not.toMatch(/<script[^>]+src=|<link[^>]+href=/i);
  });

  it.each(["position-form", "quiz-form", "schedule-form"])(
    "serves the React bundle for %s, self-contained too",
    async (id) => {
    const { body } = await rpc([echoTool], {
      jsonrpc: "2.0",
      id: 8,
      method: "resources/read",
      params: { uri: `ui://dev-recruit/${id}.html` },
    });

    const [content] = body.result.contents;
    expect(content._meta.ui).toEqual({ csp: {}, prefersBorder: true });
    expect(content.text).toMatch(/^<!doctype html>/i);
    expect(content.text).not.toMatch(/<script[^>]+src=|<link[^>]+href=|url\(["']?https?:/i);
    expect(content.text).toBe(REACT_WIDGET_HTML);
    },
  );
});
