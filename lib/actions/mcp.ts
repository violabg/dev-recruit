"use server";

import { requireAdmin } from "@/lib/auth-server";
import {
  revokeMcpTokenSchema,
  setMcpEnabledSchema,
  setUserMcpDisabledSchema,
} from "@/lib/schemas/mcp";
import { toActor } from "@/lib/services/actor";
import {
  revokeMcpToken,
  setMcpEnabledGlobally,
  setUserMcpDisabled,
} from "@/lib/services/mcp-access";
import type { ActionResult } from "@/lib/utils/action-result";
import { invalidateMcpAdminPage } from "@/lib/utils/cache-utils";
import { runAction } from "./run-action";

/** MCP on or off for the whole deployment. Administrators only. */
export async function setMcpEnabledAction(enabled: boolean): Promise<ActionResult> {
  return runAction("setMcpEnabledAction", async () => {
    const user = await requireAdmin();
    const value = setMcpEnabledSchema.parse(enabled);

    await setMcpEnabledGlobally(toActor(user), value);

    invalidateMcpAdminPage();
  });
}

/** MCP off or on for one user; switching off revokes their tokens. Administrators only. */
export async function setUserMcpDisabledAction(
  userId: string,
  disabled: boolean,
): Promise<ActionResult> {
  return runAction("setUserMcpDisabledAction", async () => {
    const user = await requireAdmin();
    const payload = setUserMcpDisabledSchema.parse({ userId, disabled });

    await setUserMcpDisabled(toActor(user), payload.userId, payload.disabled);

    invalidateMcpAdminPage();
  });
}

/** Revokes the grant of an MCP token: the client must authorize again. Administrators only. */
export async function revokeMcpTokenAction(tokenId: string): Promise<ActionResult> {
  return runAction("revokeMcpTokenAction", async () => {
    const user = await requireAdmin();
    const id = revokeMcpTokenSchema.parse(tokenId);

    await revokeMcpToken(toActor(user), id);

    invalidateMcpAdminPage();
  });
}
