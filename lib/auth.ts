import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, jwt } from "better-auth/plugins";
import { BANNED_USER_MESSAGE } from "@/lib/utils/auth-errors";
import {
  MCP_ACCESS_TOKEN_TTL_SECONDS,
  MCP_REFRESH_TOKEN_TTL_SECONDS,
  MCP_RESOURCE_URL,
  MCP_SCOPES,
} from "./mcp/config";
import {
  oauthRequestGuard,
  validateAuthorizeRedirectUri,
} from "./mcp/oauth-registration";
import prisma from "./prisma";
import { recordLastLogin } from "./services/users";

/**
 * HTTP paths of the auth router that answer 404. User management runs only
 * through server actions (auth.api calls are not affected by this list), and
 * the app sends no email, so password reset and verification emails are off.
 * Sign-up, sign-in, sign-out, get-session, update-user, change-password and
 * verify-email stay enabled.
 */
export const USER_MANAGEMENT_DISABLED_PATHS: readonly string[] = [
  "/request-password-reset",
  "/reset-password",
  "/send-verification-email",
  "/admin/create-user",
  "/admin/list-users",
  "/admin/get-user",
  "/admin/set-role",
  "/admin/update-user",
  "/admin/ban-user",
  "/admin/unban-user",
  "/admin/set-user-password",
  "/admin/list-user-sessions",
  "/admin/revoke-user-session",
  "/admin/revoke-user-sessions",
  "/admin/remove-user",
  "/admin/impersonate-user",
  "/admin/stop-impersonating",
  "/admin/has-permission",
];

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  disabledPaths: [...USER_MANAGEMENT_DISABLED_PATHS],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  user: {
    additionalFields: {
      firstName: { type: "string", required: false, input: false },
      lastName: { type: "string", required: false, input: false },
    },
  },
  session: {
    // Session token expires in 7 days
    expiresIn: 7 * 24 * 60 * 60,
    // Refresh token if session is older than 1 day
    // This ensures tokens are fresh without forcing re-login frequently
    updateAge: 24 * 60 * 60,
    // Hard limit: sessions cannot be refreshed beyond 30 days
    // Forces re-login after 30 days regardless of refresh activity
    absoluteTimeout: 30 * 24 * 60 * 60,
  },
  databaseHooks: {
    session: {
      create: {
        // Every new session is a login: store it as the user's last access.
        // recordLastLogin never throws, so sign-in is never blocked.
        after: async (session) => {
          await recordLastLogin(prisma, session);
        },
      },
    },
  },
  // OAuth guards: restricted client registration, account gate on authorize
  // and consent (lib/mcp/oauth-registration.ts)
  hooks: {
    before: oauthRequestGuard,
  },
  plugins: [
    admin({ bannedUserMessage: BANNED_USER_MESSAGE }),
    // Signs the MCP access tokens. Session payloads are never signed into a
    // header, and the session JWT keeps the default audience, never the MCP
    // resource.
    jwt({ disableSettingJwtHeader: true }),
    // OAuth 2.1 authorization server of /api/mcp: public clients with PKCE
    // (S256, enforced by the plugin for public clients), audience-bound
    // short-lived access tokens, rotating refresh tokens (offline_access),
    // restricted dynamic registration. Options: docs/mcp.md §1.2.
    oauthProvider({
      loginPage: "/auth/login",
      consentPage: "/auth/consent",
      scopes: [...MCP_SCOPES, "offline_access"],
      grantTypes: ["authorization_code", "refresh_token"],
      // Object form: an explicit scope list (Prisma list columns cannot be
      // null, and the string form seeds allowedScopes as null)
      resources: [
        {
          identifier: MCP_RESOURCE_URL,
          name: "dev-recruit MCP",
          accessTokenTtl: MCP_ACCESS_TOKEN_TTL_SECONDS,
          allowedScopes: [...MCP_SCOPES, "offline_access"],
        },
      ],
      enforcePerClientResources: true,
      clientRegistrationDefaultResources: [MCP_RESOURCE_URL],
      accessTokenExpiresIn: MCP_ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenExpiresIn: MCP_REFRESH_TOKEN_TTL_SECONDS,
      refreshTokenReuseInterval: 0,
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      clientRegistrationDefaultApplicationType: "infer",
      validateRedirectUri: validateAuthorizeRedirectUri,
    }),
  ],
});
