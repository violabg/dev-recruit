"use client";

import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ENV } from "varlock/env";

export const authClient = createAuthClient({
  baseURL: ENV.NEXT_PUBLIC_APP_URL,
  plugins: [adminClient()],
});
