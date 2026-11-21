import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";

import { auth } from "@/lib/auth";

/**
 * RFC 8414 authorization server metadata of the OAuth provider (issuer
 * <APP_URL>/api/auth). Public and readable from any origin. Only public
 * clients exist, so the token endpoint advertises `none` alone.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
} as const;

const serveMetadata = oauthProviderAuthServerMetadata(auth);

export async function GET(request: Request): Promise<Response> {
  const response = await serveMetadata(request);
  if (!response.ok) return response;

  const metadata = (await response.json()) as Record<string, unknown>;
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS_HEADERS)) {
    headers.set(name, value);
  }
  headers.delete("content-length");

  return Response.json(
    { ...metadata, token_endpoint_auth_methods_supported: ["none"] },
    { status: response.status, headers },
  );
}

export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: { ...CORS_HEADERS, Allow: "GET, OPTIONS" },
  });
}
