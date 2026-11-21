import { createDevRecruitMcpHandler, guardMcpRequest } from "@/lib/mcp/server";

/**
 * MCP endpoint (Streamable HTTP, stateless). Authenticated by the OAuth
 * bearer token, never by the session cookie: guardMcpRequest resolves the
 * actor before the MCP server sees the request.
 */
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const guard = await guardMcpRequest(request);
  if ("response" in guard) return guard.response;
  return createDevRecruitMcpHandler(guard.actor)(request);
}

/** Stateless server: no SSE stream and no session to terminate */
function methodNotAllowed(): Response {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
