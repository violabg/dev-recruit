/**
 * The dev-recruit MCP server: request guard (size, rate limits, bearer
 * actor), the mcp-handler with the enabled tools and their widget resources,
 * the tool wrapper and the protected-resource metadata. Stateless Streamable HTTP; no CORS header on
 * /api/mcp (no browser caller).
 */

import { createMcpHandler } from "mcp-handler";
import { z, ZodError } from "zod";
import packageJson from "@/package.json";
import { logger } from "@/lib/services/logger";
import { UserError } from "@/lib/services/user-error";
import {
  invalidateCandidateCacheInRouteHandler,
  invalidateInterviewCacheInRouteHandler,
  invalidateInterviewProposalCacheInRouteHandler,
  invalidatePositionCacheInRouteHandler,
  invalidateQuizCacheInRouteHandler,
} from "@/lib/utils/cache-utils";
import { recordMcpAudit, type McpAuditStatus } from "./audit";
import { McpAuthError, requireMcpActor, requireScope, type McpActor } from "./auth";
import {
  APP_URL,
  MCP_ENABLED_TOOL_GROUPS,
  MCP_MAX_BODY_BYTES,
  MCP_RATE_LIMITS,
  MCP_RESOURCE_URL,
  MCP_SCOPES,
} from "./config";
import { MCP_SERVER_INSTRUCTIONS } from "./instructions";
import { checkRateLimit, clientIp } from "./rate-limit";
import { enabledTools } from "./tools";
import { registerWidgetResources, widgetToolMeta } from "./widgets/resources";
import { renderWorkflow, WORKFLOWS } from "./workflows";
import type {
  InvalidationRequest,
  McpToolDefinition,
  McpToolResult,
} from "./tools/types";

export const GENERIC_ERROR = "Si è verificato un errore. Riprova.";
const RATE_LIMITED = "Troppe richieste, riprova tra poco";
const PROTECTED_RESOURCE_METADATA_URL = `${APP_URL}/.well-known/oauth-protected-resource/api/mcp`;

type ToolCallResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

// ====================
// TOOL WRAPPER
// ====================

function applyInvalidation(request: InvalidationRequest): void {
  switch (request.kind) {
    case "position":
      invalidatePositionCacheInRouteHandler(request.positionId);
      break;
    case "quiz":
      invalidateQuizCacheInRouteHandler({
        quizId: request.quizId,
        positionId: request.positionId,
      });
      break;
    case "interview":
      invalidateInterviewCacheInRouteHandler({
        interviewId: request.interviewId,
        applicationId: request.applicationId,
      });
      break;
    case "candidate":
      invalidateCandidateCacheInRouteHandler({
        candidateId: request.candidateId,
        positionId: request.positionId,
        applicationId: request.applicationId,
      });
      break;
    case "interview_proposal":
      invalidateInterviewProposalCacheInRouteHandler({
        applicationId: request.applicationId,
      });
      break;
  }
}

const textResult = (text: string, isError = false): ToolCallResult => ({
  content: [{ type: "text", text }],
  ...(isError ? { isError: true } : {}),
});

/** Plain JSON: dates become ISO strings, undefined values disappear */
const toJson = (value: Record<string, unknown>): Record<string, unknown> =>
  JSON.parse(JSON.stringify(value)) as Record<string, unknown>;

/**
 * Runs one tool call for the actor, in the order: scope, per-user tool rate
 * limit, input parse, handler, cache invalidation, audit (always), error
 * mapping (never a stack).
 */
export async function runTool(
  tool: McpToolDefinition,
  actor: McpActor,
  rawInput: unknown,
): Promise<ToolCallResult> {
  let status: McpAuditStatus = "ok";
  let summary = "";
  let result: ToolCallResult;

  try {
    requireScope(actor, tool.scope);

    const limit = await checkRateLimit(
      `mcp:tool:${actor.userId}`,
      MCP_RATE_LIMITS.mcpPerUserPerMinute,
    );
    if (!limit.allowed) {
      status = "denied";
      summary = "rate_limited";
      return (result = textResult(RATE_LIMITED, true));
    }

    const input = (tool.inputSchema as z.ZodTypeAny).parse(rawInput ?? {});
    const output: McpToolResult = await tool.handler(actor, input);

    for (const request of output.invalidate ?? []) applyInvalidation(request);

    summary = output.auditSummary;
    result = {
      ...textResult(output.text),
      ...(output.structured ? { structuredContent: toJson(output.structured) } : {}),
    };
  } catch (error) {
    if (error instanceof McpAuthError) {
      status = "denied";
      summary = error.code;
      result = textResult(error.message, true);
    } else if (error instanceof UserError) {
      status = "error";
      summary = error.message;
      result = textResult(error.message, true);
    } else if (error instanceof ZodError) {
      const message = error.issues[0]?.message ?? "Dati non validi";
      status = "error";
      summary = `invalid_input: ${message}`;
      result = textResult(message, true);
    } else {
      logger.error("MCP tool failed", {
        tool: tool.name,
        userId: actor.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      status = "error";
      summary = "internal_error";
      result = textResult(GENERIC_ERROR, true);
    }
  } finally {
    await recordMcpAudit({
      userId: actor.userId,
      clientId: actor.clientId,
      scopes: [...actor.scopes],
      tool: tool.name,
      arguments: rawInput,
      status,
      summary,
    });
  }

  return result;
}

/**
 * The tool schema advertised in tools/list, with validation left to the
 * wrapper: the SDK would refuse invalid input with an English message and
 * without an audit row.
 */
function advertisedSchema(schema: z.ZodTypeAny) {
  const standard = schema["~standard"];
  return {
    "~standard": {
      ...standard,
      validate: (value: unknown) => ({ value: value ?? {} }),
    },
  } as unknown as typeof schema;
}

// ====================
// PROMPTS
// ====================

const workflowPromptArgs = z.object({
  richiesta: z
    .string()
    .max(2000)
    .optional()
    .describe("Cosa vuoi fare, con i dettagli che conosci (facoltativo)"),
});

/** The user message of a workflow prompt: the steps, then the request if given */
export function workflowPromptText(
  workflow: (typeof WORKFLOWS)[number],
  request?: string,
): string {
  const steps = `Segui questa procedura di dev-recruit.\n\n${renderWorkflow(workflow)}`;
  return request?.trim() ? `${steps}\n\nRichiesta: ${request.trim()}` : steps;
}

/** The MCP handler of one request, with the actor of that request. */
export function createDevRecruitMcpHandler(
  actor: McpActor,
  tools: readonly McpToolDefinition[] = enabledTools(MCP_ENABLED_TOOL_GROUPS),
): (request: Request) => Promise<Response> {
  return createMcpHandler(
    (server) => {
      registerWidgetResources(server);

      for (const workflow of WORKFLOWS) {
        server.registerPrompt(
          workflow.name,
          {
            title: workflow.title,
            description: workflow.description,
            argsSchema: workflowPromptArgs,
          },
          ({ richiesta }) => ({
            description: workflow.description,
            messages: [
              {
                role: "user" as const,
                content: { type: "text" as const, text: workflowPromptText(workflow, richiesta) },
              },
            ],
          }),
        );
      }

      for (const tool of tools) {
        const meta = widgetToolMeta(tool.widget, { appOnly: tool.appOnly });
        server.registerTool(
          tool.name,
          {
            title: tool.title,
            description: tool.description,
            inputSchema: advertisedSchema(tool.inputSchema),
            annotations: {
              title: tool.title,
              readOnlyHint: tool.readOnly,
              destructiveHint: false,
              openWorldHint: false,
            },
            ...(meta ? { _meta: meta } : {}),
          },
          async (args: unknown) => runTool(tool, actor, args),
        );
      }
    },
    {
      serverInfo: { name: "dev-recruit", version: packageJson.version },
      instructions: MCP_SERVER_INSTRUCTIONS,
    },
  );
}

// ====================
// REQUEST GUARD
// ====================

function jsonError(
  status: number,
  error: string,
  description: string,
  headers?: HeadersInit,
): Response {
  return Response.json({ error, error_description: description }, { status, headers });
}

const tooLarge = () =>
  jsonError(413, "request_too_large", "Richiesta troppo grande");

const rateLimited = (retryAfterSeconds: number) =>
  jsonError(429, "rate_limited", RATE_LIMITED, {
    "Retry-After": String(retryAfterSeconds),
  });

function authErrorResponse(error: McpAuthError): Response {
  if (error.code === "invalid_token") {
    return jsonError(401, "invalid_token", error.message, {
      "WWW-Authenticate": `Bearer resource_metadata="${PROTECTED_RESOURCE_METADATA_URL}", error="invalid_token"`,
    });
  }
  if (error.code === "insufficient_scope") {
    return jsonError(403, "insufficient_scope", error.message, {
      "WWW-Authenticate": `Bearer error="insufficient_scope", scope="${error.requiredScope ?? ""}"`,
    });
  }
  return jsonError(403, "access_disabled", error.message);
}

const internalError = () =>
  Response.json(
    { jsonrpc: "2.0", id: null, error: { code: -32603, message: GENERIC_ERROR } },
    { status: 500 },
  );

async function bodyTooLarge(request: Request): Promise<boolean> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MCP_MAX_BODY_BYTES) return true;
  const body = await request.clone().arrayBuffer();
  return body.byteLength > MCP_MAX_BODY_BYTES;
}

/**
 * Checks an MCP request before the server sees it: body size, per-IP rate
 * limit, bearer actor, per-user rate limit. Returns the actor or the refusal.
 */
export async function guardMcpRequest(
  request: Request,
): Promise<{ actor: McpActor } | { response: Response }> {
  try {
    if (await bodyTooLarge(request)) return { response: tooLarge() };

    const ipLimit = await checkRateLimit(
      `mcp:ip:${clientIp(request)}`,
      MCP_RATE_LIMITS.mcpPerIpPerMinute,
    );
    if (!ipLimit.allowed) return { response: rateLimited(ipLimit.retryAfterSeconds) };

    const actor = await requireMcpActor(request);

    const userLimit = await checkRateLimit(
      `mcp:user:${actor.userId}`,
      MCP_RATE_LIMITS.mcpPerUserPerMinute,
    );
    if (!userLimit.allowed) {
      return { response: rateLimited(userLimit.retryAfterSeconds) };
    }

    return { actor };
  } catch (error) {
    if (error instanceof McpAuthError) return { response: authErrorResponse(error) };
    logger.error("MCP request guard failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { response: internalError() };
  }
}

/** RFC 9728 protected resource metadata of /api/mcp */
export function protectedResourceMetadata(): Response {
  return Response.json(
    {
      resource: MCP_RESOURCE_URL,
      authorization_servers: [`${APP_URL}/api/auth`],
      scopes_supported: [...MCP_SCOPES],
      bearer_methods_supported: ["header"],
      resource_name: "dev-recruit",
    },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
