import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/mcp-access", () => ({
  setMcpEnabledGlobally: vi.fn(),
  setUserMcpDisabled: vi.fn(),
  revokeMcpToken: vi.fn(),
}));

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidateMcpAdminPage: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
  unstable_rethrow: vi.fn(),
}));

import {
  revokeMcpTokenAction,
  setMcpEnabledAction,
  setUserMcpDisabledAction,
} from "@/lib/actions/mcp";
import { requireAdmin } from "@/lib/auth-server";
import {
  revokeMcpToken,
  setMcpEnabledGlobally,
  setUserMcpDisabled,
} from "@/lib/services/mcp-access";
import { UserError } from "@/lib/services/user-error";
import { invalidateMcpAdminPage } from "@/lib/utils/cache-utils";

const ADMIN_ONLY = "Operazione riservata agli amministratori";
const adminActor = { userId: "admin-1", role: "admin" };

beforeEach(() => {
  vi.mocked(requireAdmin).mockResolvedValue({ id: "admin-1", role: "admin" } as any);
});

const actions = [
  ["setMcpEnabledAction", () => setMcpEnabledAction(false), setMcpEnabledGlobally],
  ["setUserMcpDisabledAction", () => setUserMcpDisabledAction("u-2", true), setUserMcpDisabled],
  ["revokeMcpTokenAction", () => revokeMcpTokenAction("rt-1"), revokeMcpToken],
] as const;

describe("MCP admin actions", () => {
  it.each(actions)("%s refuses a non-admin before calling the service", async (_name, run, service) => {
    vi.mocked(requireAdmin).mockRejectedValue(new UserError(ADMIN_ONLY));

    expect(await run()).toEqual({ success: false, error: ADMIN_ONLY });
    expect(service).not.toHaveBeenCalled();
    expect(invalidateMcpAdminPage).not.toHaveBeenCalled();
  });

  it.each(actions)("%s requires a session", async (_name, run, service) => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("UNAUTHENTICATED"));

    expect(await run()).toEqual({
      success: false,
      error: "Sessione scaduta. Accedi di nuovo per continuare.",
    });
    expect(service).not.toHaveBeenCalled();
  });

  it("setMcpEnabledAction switches MCP with the admin actor and refreshes the page", async () => {
    expect(await setMcpEnabledAction(false)).toEqual({ success: true });
    expect(setMcpEnabledGlobally).toHaveBeenCalledWith(adminActor, false);
    expect(invalidateMcpAdminPage).toHaveBeenCalled();
  });

  it("setUserMcpDisabledAction passes user and flag", async () => {
    expect(await setUserMcpDisabledAction("u-2", true)).toEqual({ success: true });
    expect(setUserMcpDisabled).toHaveBeenCalledWith(adminActor, "u-2", true);
    expect(invalidateMcpAdminPage).toHaveBeenCalled();
  });

  it("revokeMcpTokenAction revokes the token", async () => {
    expect(await revokeMcpTokenAction("rt-1")).toEqual({ success: true });
    expect(revokeMcpToken).toHaveBeenCalledWith(adminActor, "rt-1");
    expect(invalidateMcpAdminPage).toHaveBeenCalled();
  });

  it("refuses invalid input with the schema message", async () => {
    expect(await revokeMcpTokenAction("")).toEqual({
      success: false,
      error: "L'ID è obbligatorio",
    });
    expect(await setMcpEnabledAction("yes" as never)).toEqual({
      success: false,
      error: "Valore dell'interruttore non valido",
    });
    expect(revokeMcpToken).not.toHaveBeenCalled();
    expect(setMcpEnabledGlobally).not.toHaveBeenCalled();
  });

  it("returns the service refusal without refreshing the page", async () => {
    vi.mocked(revokeMcpToken).mockRejectedValue(new UserError("Token non trovato"));

    expect(await revokeMcpTokenAction("nope")).toEqual({
      success: false,
      error: "Token non trovato",
    });
    expect(invalidateMcpAdminPage).not.toHaveBeenCalled();
  });
});
