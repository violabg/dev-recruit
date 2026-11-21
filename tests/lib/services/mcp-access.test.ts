import { beforeEach, describe, expect, it, vi } from "vitest";

// Hand-built transaction: token and consent deletions plus the user flag
const tx = {
  user: { update: vi.fn() },
  oauthAccessToken: { deleteMany: vi.fn() },
  oauthRefreshToken: { deleteMany: vi.fn() },
  oauthConsent: { deleteMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({
  default: {
    appSetting: { findUnique: vi.fn(), upsert: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    oauthAccessToken: { findUnique: vi.fn(), deleteMany: vi.fn() },
    oauthRefreshToken: { findUnique: vi.fn(), deleteMany: vi.fn() },
    oauthConsent: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import prisma from "@/lib/prisma";
import type { Actor } from "@/lib/services/actor";
import {
  isMcpEnabledGlobally,
  revokeAllMcpTokensForUser,
  revokeMcpToken,
  setMcpEnabledGlobally,
  setUserMcpDisabled,
} from "@/lib/services/mcp-access";

const db = prisma as any;
const admin: Actor = { userId: "admin-1", role: "admin" };
const user: Actor = { userId: "user-1", role: "user" };
const ADMIN_ONLY = "Operazione riservata agli amministratori";

beforeEach(() => {
  db.$transaction.mockImplementation(async (fn: any) => fn(tx));
  for (const delegate of [tx.oauthAccessToken, tx.oauthRefreshToken, tx.oauthConsent]) {
    delegate.deleteMany.mockResolvedValue({ count: 1 });
  }
});

describe("isMcpEnabledGlobally", () => {
  it("is on when the setting is missing", async () => {
    db.appSetting.findUnique.mockResolvedValue(null);
    await expect(isMcpEnabledGlobally()).resolves.toBe(true);
    expect(db.appSetting.findUnique).toHaveBeenCalledWith({
      where: { key: "mcp.enabled" },
      select: { value: true },
    });
  });

  it("is off only when the setting is false", async () => {
    db.appSetting.findUnique.mockResolvedValue({ value: false });
    await expect(isMcpEnabledGlobally()).resolves.toBe(false);

    db.appSetting.findUnique.mockResolvedValue({ value: true });
    await expect(isMcpEnabledGlobally()).resolves.toBe(true);
  });
});

describe("setMcpEnabledGlobally", () => {
  it("stores the switch with the admin who changed it", async () => {
    await setMcpEnabledGlobally(admin, false);

    expect(db.appSetting.upsert).toHaveBeenCalledWith({
      where: { key: "mcp.enabled" },
      create: { key: "mcp.enabled", value: false, updatedBy: "admin-1" },
      update: { value: false, updatedBy: "admin-1" },
    });
  });

  it("refuses a non-admin", async () => {
    await expect(setMcpEnabledGlobally(user, false)).rejects.toThrow(ADMIN_ONLY);
    expect(db.appSetting.upsert).not.toHaveBeenCalled();
  });
});

describe("setUserMcpDisabled", () => {
  it("disables a user and revokes their tokens in one transaction", async () => {
    db.user.findUnique.mockResolvedValue({ id: "u-2" });

    await setUserMcpDisabled(admin, "u-2", true);

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "u-2" },
      data: { mcpDisabled: true },
    });
    expect(tx.oauthAccessToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "u-2" } });
    expect(tx.oauthRefreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "u-2" } });
    expect(tx.oauthConsent.deleteMany).toHaveBeenCalledWith({ where: { userId: "u-2" } });
  });

  it("re-enables a user without touching tokens", async () => {
    db.user.findUnique.mockResolvedValue({ id: "u-2" });

    await setUserMcpDisabled(admin, "u-2", false);

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "u-2" },
      data: { mcpDisabled: false },
    });
    expect(tx.oauthRefreshToken.deleteMany).not.toHaveBeenCalled();
  });

  it("refuses a missing user", async () => {
    db.user.findUnique.mockResolvedValue(null);

    await expect(setUserMcpDisabled(admin, "nope", true)).rejects.toThrow(
      "Utente non trovato",
    );
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("refuses a non-admin before reading the user", async () => {
    await expect(setUserMcpDisabled(user, "u-2", true)).rejects.toThrow(ADMIN_ONLY);
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("revokeMcpToken", () => {
  it("revokes the whole grant (client and user) of a refresh token", async () => {
    db.oauthRefreshToken.findUnique.mockResolvedValue({
      clientId: "client-1",
      userId: "u-2",
    });

    await revokeMcpToken(admin, "rt-1");

    const where = { clientId: "client-1", userId: "u-2" };
    expect(tx.oauthAccessToken.deleteMany).toHaveBeenCalledWith({ where });
    expect(tx.oauthRefreshToken.deleteMany).toHaveBeenCalledWith({ where });
    expect(tx.oauthConsent.deleteMany).toHaveBeenCalledWith({ where });
  });

  it("accepts the id of an opaque access token", async () => {
    db.oauthRefreshToken.findUnique.mockResolvedValue(null);
    db.oauthAccessToken.findUnique.mockResolvedValue({
      clientId: "client-1",
      userId: "u-2",
    });

    await revokeMcpToken(admin, "at-1");

    expect(tx.oauthConsent.deleteMany).toHaveBeenCalledWith({
      where: { clientId: "client-1", userId: "u-2" },
    });
  });

  it("refuses an unknown token", async () => {
    db.oauthRefreshToken.findUnique.mockResolvedValue(null);
    db.oauthAccessToken.findUnique.mockResolvedValue(null);

    await expect(revokeMcpToken(admin, "nope")).rejects.toThrow("Token non trovato");
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("refuses a non-admin", async () => {
    await expect(revokeMcpToken(user, "rt-1")).rejects.toThrow(ADMIN_ONLY);
    expect(db.oauthRefreshToken.findUnique).not.toHaveBeenCalled();
  });
});

describe("revokeAllMcpTokensForUser", () => {
  it("deletes access tokens, refresh tokens and consents of the user and counts them", async () => {
    tx.oauthAccessToken.deleteMany.mockResolvedValue({ count: 2 });
    tx.oauthRefreshToken.deleteMany.mockResolvedValue({ count: 3 });
    tx.oauthConsent.deleteMany.mockResolvedValue({ count: 1 });

    await expect(revokeAllMcpTokensForUser(tx as any, "u-2")).resolves.toBe(6);
    expect(tx.oauthAccessToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "u-2" } });
    expect(tx.oauthRefreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "u-2" } });
    expect(tx.oauthConsent.deleteMany).toHaveBeenCalledWith({ where: { userId: "u-2" } });
  });
});
