"use client";

import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  // oauthProviderClient forwards the signed OAuth query of the current page
  // (sign-in and consent during an MCP authorization)
  plugins: [adminClient(), oauthProviderClient()],
});
