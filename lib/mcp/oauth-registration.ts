/**
 * OAuth guards of the authorization server: the dynamic client registration
 * check, the redirect URI check at authorization time and the account gate.
 * They run inside Better Auth (lib/auth.ts) and throw the OAuth error JSON the
 * auth library returns as is.
 */

import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { isAllowedRedirectUri } from "./config";

export interface ClientRegistrationRequest {
  client_name?: string;
  redirect_uris: string[];
  token_endpoint_auth_method?: string;
  grant_types?: string[];
  response_types?: string[];
}

const ALLOWED_GRANT_TYPES = new Set(["authorization_code", "refresh_token"]);
const ALLOWED_RESPONSE_TYPES = new Set(["code"]);

export const ACCOUNT_NOT_ENABLED_MESSAGE =
  "Account non abilitato: chiedi a un amministratore di attivarlo.";

function oauthError(error: string, description: string): APIError {
  return new APIError("BAD_REQUEST", { error, error_description: description });
}

/**
 * Restricted dynamic client registration: every redirect URI on the
 * allowlist, public clients only, authorization code and refresh token only.
 */
export function assertAllowedRegistration(
  request: ClientRegistrationRequest,
): void {
  const redirectUris: unknown = request?.redirect_uris;
  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length === 0 ||
    !redirectUris.every(
      (uri) => typeof uri === "string" && isAllowedRedirectUri(uri),
    )
  ) {
    throw oauthError(
      "invalid_redirect_uri",
      "URI di reindirizzamento non consentito",
    );
  }

  const authMethod = request.token_endpoint_auth_method;
  if (authMethod !== undefined && authMethod !== "none") {
    throw oauthError(
      "invalid_client_metadata",
      "Sono ammessi solo client pubblici",
    );
  }

  if (
    request.grant_types !== undefined &&
    (!Array.isArray(request.grant_types) ||
      !request.grant_types.every((type) => ALLOWED_GRANT_TYPES.has(type)))
  ) {
    throw oauthError(
      "invalid_client_metadata",
      "Tipo di autorizzazione non consentito",
    );
  }

  if (
    request.response_types !== undefined &&
    (!Array.isArray(request.response_types) ||
      !request.response_types.every((type) => ALLOWED_RESPONSE_TYPES.has(type)))
  ) {
    throw oauthError(
      "invalid_client_metadata",
      "Tipo di risposta non consentito",
    );
  }
}

/** Same loopback redirect (http, same host and path) on any port */
function isSameLoopbackRedirect(registered: string, requested: string): boolean {
  try {
    const a = new URL(registered);
    const b = new URL(requested);
    return (
      a.protocol === "http:" &&
      b.protocol === "http:" &&
      a.hostname === b.hostname &&
      (a.hostname === "127.0.0.1" || a.hostname === "localhost") &&
      a.pathname === b.pathname &&
      b.search === "" &&
      b.hash === ""
    );
  } catch {
    return false;
  }
}

/**
 * Redirect URI check of /oauth2/authorize: the URI must be on the allowlist
 * and registered for the client (a registered loopback URI matches any port
 * and a missing trailing slash).
 */
export function validateAuthorizeRedirectUri(
  redirectUri: string,
  registeredUris: readonly string[],
  defaultResult: boolean,
): boolean {
  if (!isAllowedRedirectUri(redirectUri)) return false;
  if (defaultResult) return true;
  return registeredUris.some((registered) =>
    isSameLoopbackRedirect(registered, redirectUri),
  );
}

/**
 * Account gate: a code or token is issued only to an account that can sign
 * in (email verification on, not banned).
 */
export function assertAccountCanAuthorize(
  user: { emailVerified?: boolean | null; banned?: boolean | null } | null | undefined,
): void {
  if (user && (!user.emailVerified || user.banned)) {
    throw new APIError("FORBIDDEN", {
      error: "access_denied",
      error_description: ACCOUNT_NOT_ENABLED_MESSAGE,
    });
  }
}

/** Paths of the OAuth provider guarded before the plugin runs */
const AUTHORIZE_PATHS = new Set(["/oauth2/authorize", "/oauth2/consent"]);

/**
 * Better Auth `hooks.before`: the registration check on /oauth2/register and
 * the account gate on /oauth2/authorize and /oauth2/consent.
 */
export const oauthRequestGuard = createAuthMiddleware(async (ctx) => {
  if (ctx.path === "/oauth2/register") {
    assertAllowedRegistration((ctx.body ?? {}) as ClientRegistrationRequest);
    return;
  }

  if (AUTHORIZE_PATHS.has(ctx.path)) {
    const session = await getSessionFromCtx(ctx);
    assertAccountCanAuthorize(
      session?.user as
        | { emailVerified?: boolean | null; banned?: boolean | null }
        | undefined,
    );
  }
});
