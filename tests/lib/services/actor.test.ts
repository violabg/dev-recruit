import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import {
  assertActorEnabled,
  assertAdminActor,
  toActor,
} from "@/lib/services/actor";
import { UserError } from "@/lib/services/user-error";

const SESSION_EXPIRED = "Sessione scaduta. Accedi di nuovo per continuare.";

describe("toActor", () => {
  it("maps the admin role to admin", () => {
    expect(toActor({ id: "u1", role: "admin" })).toEqual({
      userId: "u1",
      role: "admin",
    });
  });

  it.each([["user"], [null], [undefined], ["superuser"]])(
    "maps the role %s to user",
    (role) => {
      expect(toActor({ id: "u1", role: role as string | null | undefined })).toEqual({
        userId: "u1",
        role: "user",
      });
    },
  );
});

describe("assertActorEnabled", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      emailVerified: true,
      banned: false,
    } as any);
  });

  it("accepts a verified, not banned user and reads only those fields", async () => {
    await expect(
      assertActorEnabled(prisma, { userId: "u1", role: "user" }),
    ).resolves.toBeUndefined();
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "u1" },
      select: { emailVerified: true, banned: true },
    });
  });

  it("accepts a plain user: no role check", async () => {
    await expect(
      assertActorEnabled(prisma, { userId: "u2", role: "user" }),
    ).resolves.toBeUndefined();
  });

  it("refuses a missing user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    await expect(
      assertActorEnabled(prisma, { userId: "ghost", role: "admin" }),
    ).rejects.toThrow(SESSION_EXPIRED);
  });

  it("refuses an unverified user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      emailVerified: false,
      banned: false,
    } as any);

    await expect(
      assertActorEnabled(prisma, { userId: "u1", role: "user" }),
    ).rejects.toThrow(SESSION_EXPIRED);
  });

  it("refuses a banned user with a UserError", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      emailVerified: true,
      banned: true,
    } as any);

    await expect(
      assertActorEnabled(prisma, { userId: "u1", role: "admin" }),
    ).rejects.toBeInstanceOf(UserError);
  });
});

describe("assertAdminActor", () => {
  it("accepts an admin", () => {
    expect(() =>
      assertAdminActor({ userId: "u1", role: "admin" }),
    ).not.toThrow();
  });

  it("refuses a non-admin", () => {
    expect(() => assertAdminActor({ userId: "u1", role: "user" })).toThrow(
      "Operazione riservata agli amministratori",
    );
  });
});
