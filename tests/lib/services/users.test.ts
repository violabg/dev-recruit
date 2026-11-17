/**
 * Tests for the pure domain rules of user management (lib/services/users.ts).
 * Hand-built clients: no Prisma, no database, no network.
 */

import {
  assertKeepsActiveAdmin,
  assertNotSelf,
  callAdminApi,
  makeAdmin,
  recordLastLogin,
} from "@/lib/services/users";
import { UserError } from "@/lib/services/user-error";
import { describe, expect, it, vi } from "vitest";

function countClient(count = vi.fn()) {
  return { user: { count } };
}

function makeAdminClient(
  findUnique = vi.fn(),
  update = vi.fn()
) {
  return { user: { findUnique, update } };
}

describe("assertNotSelf", () => {
  it("accepts an operation on someone else", () => {
    expect(() =>
      assertNotSelf("admin-1", "user-2", "Non puoi farlo")
    ).not.toThrow();
  });

  it("refuses an operation on your own record", () => {
    expect(() =>
      assertNotSelf("admin-1", "admin-1", "Non puoi farlo")
    ).toThrow(new UserError("Non puoi farlo"));
  });
});

describe("assertKeepsActiveAdmin", () => {
  it("does not count anything for a non-admin target", async () => {
    const client = countClient();

    await expect(
      assertKeepsActiveAdmin(client, { id: "u-1", role: "user", banned: false })
    ).resolves.toBeUndefined();

    expect(client.user.count).not.toHaveBeenCalled();
  });

  it("does not count anything for a banned admin", async () => {
    const client = countClient();

    await expect(
      assertKeepsActiveAdmin(client, { id: "u-1", role: "admin", banned: true })
    ).resolves.toBeUndefined();

    expect(client.user.count).not.toHaveBeenCalled();
  });

  it("refuses when the target is the last active administrator", async () => {
    const client = countClient(vi.fn().mockResolvedValue(1));

    await expect(
      assertKeepsActiveAdmin(client, { id: "u-1", role: "admin", banned: false })
    ).rejects.toThrow("Deve restare almeno un amministratore attivo");

    expect(client.user.count).toHaveBeenCalledWith({
      where: { role: "admin", banned: false },
    });
  });

  it("allows the change when another active administrator remains", async () => {
    const client = countClient(vi.fn().mockResolvedValue(2));

    await expect(
      assertKeepsActiveAdmin(client, {
        id: "u-1",
        role: "admin",
        banned: null,
      })
    ).resolves.toBeUndefined();

    expect(client.user.count).toHaveBeenCalledWith({
      where: { role: "admin", banned: false },
    });
  });
});

describe("callAdminApi", () => {
  it("resolves with the value of the call", async () => {
    await expect(callAdminApi(() => Promise.resolve("ok"))).resolves.toBe("ok");
  });

  it("maps a code carried on the error body", async () => {
    const error = Object.assign(new Error("refused"), {
      body: { code: "YOU_CANNOT_BAN_YOURSELF" },
    });

    await expect(callAdminApi(() => Promise.reject(error))).rejects.toThrow(
      "Non puoi bloccare il tuo account"
    );
  });

  it("maps a code carried on the error itself", async () => {
    const error = Object.assign(new Error("refused"), {
      code: "USER_NOT_FOUND",
    });

    await expect(callAdminApi(() => Promise.reject(error))).rejects.toBeInstanceOf(
      UserError
    );
    await expect(callAdminApi(() => Promise.reject(error))).rejects.toThrow(
      "Utente non trovato"
    );
  });

  it("maps a duplicate email", async () => {
    const error = { body: { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" } };

    await expect(callAdminApi(() => Promise.reject(error))).rejects.toThrow(
      "Esiste già un utente con questa email"
    );
  });

  it("maps a short password", async () => {
    const error = { code: "PASSWORD_TOO_SHORT" };

    await expect(callAdminApi(() => Promise.reject(error))).rejects.toThrow(
      "La password deve avere almeno 8 caratteri"
    );
  });

  it("maps a forbidden status to the admin-only message", async () => {
    const error = { status: "FORBIDDEN" };

    await expect(callAdminApi(() => Promise.reject(error))).rejects.toThrow(
      "Operazione riservata agli amministratori"
    );
  });

  it("rethrows an unknown error unchanged", async () => {
    const boom = new Error("boom");

    await expect(callAdminApi(() => Promise.reject(boom))).rejects.toBe(boom);
  });
});

describe("recordLastLogin", () => {
  const createdAt = new Date("2026-11-17T09:00:00.000Z");

  function loginClient(update = vi.fn()) {
    return { user: { update } };
  }

  it("writes the session creation time", async () => {
    const client = loginClient();

    await recordLastLogin(client, { userId: "u-1", createdAt });

    expect(client.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { lastLoginAt: createdAt },
    });
  });

  it("falls back to the passed now when the session has no creation time", async () => {
    const client = loginClient();
    const now = new Date("2026-11-17T10:00:00.000Z");

    await recordLastLogin(client, { userId: "u-1", createdAt: null }, now);

    expect(client.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { lastLoginAt: now },
    });
  });

  it("swallows a failure instead of breaking sign-in", async () => {
    const client = loginClient(vi.fn().mockRejectedValue(new Error("db down")));

    await expect(
      recordLastLogin(client, { userId: "u-1", createdAt })
    ).resolves.toBeUndefined();
  });
});

describe("makeAdmin", () => {
  it("promotes an existing plain user", async () => {
    const client = makeAdminClient(
      vi.fn().mockResolvedValue({
        id: "u-1",
        role: "user",
        banned: false,
        emailVerified: false,
      })
    );

    await expect(makeAdmin(client, "anna@x.it")).resolves.toEqual({
      status: "promoted",
      userId: "u-1",
      email: "anna@x.it",
    });

    expect(client.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: {
        role: "admin",
        emailVerified: true,
        banned: false,
        banReason: null,
        banExpires: null,
      },
    });
  });

  it("reports an already active verified administrator and still writes", async () => {
    const client = makeAdminClient(
      vi.fn().mockResolvedValue({
        id: "u-1",
        role: "admin",
        banned: false,
        emailVerified: true,
      })
    );

    await expect(makeAdmin(client, "anna@x.it")).resolves.toMatchObject({
      status: "already-admin",
    });

    expect(client.user.update).toHaveBeenCalled();
  });

  it("trims and lower-cases the email before looking the user up", async () => {
    const client = makeAdminClient(
      vi.fn().mockResolvedValue({
        id: "u-1",
        role: "user",
        banned: false,
        emailVerified: false,
      })
    );

    await makeAdmin(client, " Anna@X.it ");

    expect(client.user.findUnique).toHaveBeenCalledWith({
      where: { email: "anna@x.it" },
      select: { id: true, role: true, banned: true, emailVerified: true },
    });
    await expect(makeAdmin(client, " Anna@X.it ")).resolves.toMatchObject({
      email: "anna@x.it",
    });
  });

  it("refuses an email with no account and never creates one", async () => {
    const client = makeAdminClient(vi.fn().mockResolvedValue(null));

    await expect(makeAdmin(client, "anna@x.it")).rejects.toThrow(
      "Nessun utente con email anna@x.it"
    );

    expect(client.user.update).not.toHaveBeenCalled();
  });

  it("refuses an empty email", async () => {
    const client = makeAdminClient();

    await expect(makeAdmin(client, "   ")).rejects.toThrow(
      "Indica l'email dell'utente"
    );

    expect(client.user.findUnique).not.toHaveBeenCalled();
  });
});
