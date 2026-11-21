import { protectedResourceMetadata } from "@/lib/mcp/server";

/** RFC 9728 protected resource metadata of /api/mcp, readable from any origin. */
export function GET(): Response {
  return protectedResourceMetadata();
}

export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
