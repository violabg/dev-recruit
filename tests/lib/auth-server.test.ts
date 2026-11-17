/**
 * Tests for lib/auth-server.ts: the admin guard beside the session check.
 * The real module is imported; only better-auth and next/navigation are faked.
 */

vi.unmock("@/lib/auth-server");

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import { isAdmin, requireAdmin, requireAdminPage } from "@/lib/auth-server";
import { auth } from "@/lib/auth";
import { UserError } from "@/lib/services/user-error";
import { notFound } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.mocked(auth.api.getSession);

function sessionFor(user: unknown) {
  getSession.mockResolvedValue({ user } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireAdmin", () => {
  it("refuses a request with no session", async () => {
    getSession.mockResolvedValue(null as any);

    await expect(requireAdmin()).rejects.toThrow("UNAUTHENTICATED");
  });

  it("refuses a signed-in user who is not an administrator", async () => {
    sessionFor({ id: "u-1", role: "user" });

    await expect(requireAdmin()).rejects.toBeInstanceOf(UserError);
    await expect(requireAdmin()).rejects.toThrow(
      "Operazione riservata agli amministratori"
    );
  });

  it("returns the administrator", async () => {
    const admin = { id: "a-1", role: "admin" };
    sessionFor(admin);

    await expect(requireAdmin()).resolves.toBe(admin);
  });
});

describe("requireAdminPage", () => {
  it("shows the not-found page to a non-administrator", async () => {
    sessionFor({ id: "u-1", role: "user" });

    await expect(requireAdminPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("returns the administrator", async () => {
    const admin = { id: "a-1", role: "admin" };
    sessionFor(admin);

    await expect(requireAdminPage()).resolves.toBe(admin);
    expect(notFound).not.toHaveBeenCalled();
  });
});

describe("isAdmin", () => {
  it("is true only for the admin role", () => {
    expect(isAdmin({ role: "admin" })).toBe(true);
    expect(isAdmin({ role: "user" })).toBe(false);
    expect(isAdmin({ role: null })).toBe(false);
    expect(isAdmin({})).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});
