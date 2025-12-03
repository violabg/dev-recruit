import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import prisma from "./prisma";

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
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
  plugins: [admin()],
});
