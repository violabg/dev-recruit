import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { BANNED_USER_MESSAGE } from "@/lib/utils/auth-errors";
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
  plugins: [admin({ bannedUserMessage: BANNED_USER_MESSAGE })],
});
