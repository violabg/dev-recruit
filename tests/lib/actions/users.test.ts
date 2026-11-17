/**
 * Tests for the user-management server actions (lib/actions/users.ts).
 * Every action is admin-guarded and returns an ActionResult, never throws.
 */

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    session: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      createUser: vi.fn(),
      adminUpdateUser: vi.fn(),
      setRole: vi.fn(),
      banUser: vi.fn(),
      unbanUser: vi.fn(),
      setUserPassword: vi.fn(),
      revokeUserSession: vi.fn(),
      revokeUserSessions: vi.fn(),
    },
  },
}));

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidateUserCache: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
  unstable_rethrow: vi.fn(),
}));

vi.mock("@/lib/services/logger", () => ({
  logger: { error: vi.fn() },
  aiLogger: { warn: vi.fn(), error: vi.fn() },
  authLogger: { error: vi.fn() },
}));

import {
  banUserAction,
  createUserAction,
  revokeUserSessionAction,
  revokeUserSessionsAction,
  setUserEmailVerifiedAction,
  setUserPasswordAction,
  setUserRoleAction,
  unbanUserAction,
  updateUserAction,
} from "@/lib/actions/users";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { UserError } from "@/lib/services/user-error";
import { invalidateUserCache } from "@/lib/utils/cache-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ADMIN_ONLY_MESSAGE = "Operazione riservata agli amministratori";

const createValues = {
  firstName: "Anna",
  lastName: "Rossi",
  email: "anna@x.it",
  password: "password123",
  role: "admin",
  emailVerified: true,
};

const userData = {
  firstName: "Anna",
  lastName: "Rossi",
  email: "anna@x.it",
};

const passwordValues = {
  password: "password123",
  confirmPassword: "password123",
};

function target(overrides: Record<string, unknown> = {}): any {
  return {
    id: "u-2",
    role: "user",
    banned: false,
    email: "anna@x.it",
    ...overrides,
  };
}

function expectNoAdminApiCall() {
  for (const fn of Object.values(auth.api)) {
    expect(fn).not.toHaveBeenCalled();
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({
    id: "admin-1",
    role: "admin",
  } as any);
});

describe("admin guard on every action", () => {
  const actions: [string, () => Promise<unknown>][] = [
    ["createUserAction", () => createUserAction(createValues as any)],
    ["updateUserAction", () => updateUserAction("u-2", userData as any)],
    ["setUserRoleAction", () => setUserRoleAction("u-2", "user")],
    ["setUserEmailVerifiedAction", () => setUserEmailVerifiedAction("u-2", true)],
    ["setUserPasswordAction", () => setUserPasswordAction("u-2", passwordValues)],
    ["banUserAction", () => banUserAction("u-2", { reason: "abuso" })],
    ["unbanUserAction", () => unbanUserAction("u-2")],
    ["revokeUserSessionAction", () => revokeUserSessionAction("u-2", "s-1")],
    ["revokeUserSessionsAction", () => revokeUserSessionsAction("u-2")],
  ];

  for (const [name, action] of actions) {
    it(`refuses ${name} to a non-administrator`, async () => {
      vi.mocked(requireAdmin).mockRejectedValueOnce(
        new UserError(ADMIN_ONLY_MESSAGE)
      );

      const result = await action();

      expect(result).toEqual({ success: false, error: ADMIN_ONLY_MESSAGE });
      expectNoAdminApiCall();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.session.findFirst).not.toHaveBeenCalled();
    });
  }
});

describe("createUserAction", () => {
  it("refuses an email already in use", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: "existing",
    } as any);
    const result = await createUserAction(createValues as any);

    expect(result).toEqual({
      success: false,
      error: "Esiste già un utente con questa email",
    });
    expect(auth.api.createUser).not.toHaveBeenCalled();
  });

  it("creates the user, verifies the email and returns the id", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
    vi.mocked(auth.api.createUser).mockResolvedValueOnce({
      user: { id: "u-new" },
    } as any);

    const result = await createUserAction(createValues as any);

    expect(result).toEqual({ success: true, userId: "u-new" });
    expect(auth.api.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          email: "anna@x.it",
          password: "password123",
          name: "Anna Rossi",
          role: "admin",
          data: { firstName: "Anna", lastName: "Rossi" },
        },
      })
    );
    expect(auth.api.adminUpdateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { userId: "u-new", data: { emailVerified: true } },
      })
    );
    expect(invalidateUserCache).toHaveBeenCalledWith("u-new");
  });

  it("does not verify the email when the form does not ask it", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
    vi.mocked(auth.api.createUser).mockResolvedValueOnce({
      user: { id: "u-new" },
    } as any);

    const result = await createUserAction({
      ...createValues,
      emailVerified: false,
    } as any);

    expect(result).toEqual({ success: true, userId: "u-new" });
    expect(auth.api.adminUpdateUser).not.toHaveBeenCalled();
  });

  it("returns the validation message for a short password", async () => {
    const result = await createUserAction({
      ...createValues,
      password: "1234567",
    } as any);

    expect(result).toEqual({
      success: false,
      error: "La password deve avere almeno 8 caratteri",
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(auth.api.createUser).not.toHaveBeenCalled();
  });
});

describe("updateUserAction", () => {
  it("reports a missing user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    const result = await updateUserAction("missing", userData as any);

    expect(result).toEqual({ success: false, error: "Utente non trovato" });
    expect(auth.api.adminUpdateUser).not.toHaveBeenCalled();
  });

  it("omits the email when it did not change", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(target());

    const result = await updateUserAction("u-2", userData as any);

    expect(result).toEqual({ success: true });
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    const body = (vi.mocked(auth.api.adminUpdateUser) as any).mock.calls[0][0]
      .body;
    expect(body.userId).toBe("u-2");
    expect(body.data).toEqual({
      firstName: "Anna",
      lastName: "Rossi",
      name: "Anna Rossi",
    });
    expect(invalidateUserCache).toHaveBeenCalledWith("u-2");
  });

  it("refuses the email of another user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(target());
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: "u-3",
    } as any);
    const result = await updateUserAction("u-2", {
      ...userData,
      email: "other@x.it",
    } as any);

    expect(result).toEqual({
      success: false,
      error: "Esiste già un utente con questa email",
    });
    expect(auth.api.adminUpdateUser).not.toHaveBeenCalled();
  });

  it("passes a changed, free email to the plugin", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(target());
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);

    const result = await updateUserAction("u-2", {
      ...userData,
      email: "nuova@x.it",
    } as any);

    expect(result).toEqual({ success: true });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: "nuova@x.it", NOT: { id: "u-2" } },
      select: { id: true },
    });
    const body = (vi.mocked(auth.api.adminUpdateUser) as any).mock.calls[0][0]
      .body;
    expect(body.data.email).toBe("nuova@x.it");
  });
});

describe("setUserRoleAction", () => {
  it("refuses a change of your own role", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      target({ id: "admin-1", role: "admin" })
    );

    const result = await setUserRoleAction("admin-1", "user");

    expect(result).toEqual({
      success: false,
      error: "Non puoi cambiare il tuo ruolo",
    });
    expect(auth.api.setRole).not.toHaveBeenCalled();
  });

  it("refuses to demote the last active administrator", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      target({ role: "admin" })
    );
    vi.mocked(prisma.user.count).mockResolvedValueOnce(1);

    const result = await setUserRoleAction("u-2", "user");

    expect(result).toEqual({
      success: false,
      error: "Deve restare almeno un amministratore attivo",
    });
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { role: "admin", banned: false },
    });
    expect(auth.api.setRole).not.toHaveBeenCalled();
  });

  it("demotes an administrator when another one remains", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      target({ role: "admin" })
    );
    vi.mocked(prisma.user.count).mockResolvedValueOnce(2);

    const result = await setUserRoleAction("u-2", "user");

    expect(result).toEqual({ success: true });
    expect(auth.api.setRole).toHaveBeenCalledWith(
      expect.objectContaining({ body: { userId: "u-2", role: "user" } })
    );
    expect(invalidateUserCache).toHaveBeenCalledWith("u-2");
  });
});

describe("setUserEmailVerifiedAction", () => {
  it("refuses a change of your own verification", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      target({ id: "admin-1", role: "admin" })
    );

    const result = await setUserEmailVerifiedAction("admin-1", true);

    expect(result).toEqual({
      success: false,
      error: "Non puoi cambiare la verifica della tua email",
    });
    expect(auth.api.adminUpdateUser).not.toHaveBeenCalled();
  });

  it("sets the verification flag", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(target());

    const result = await setUserEmailVerifiedAction("u-2", true);

    expect(result).toEqual({ success: true });
    expect(auth.api.adminUpdateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { userId: "u-2", data: { emailVerified: true } },
      })
    );
    expect(invalidateUserCache).toHaveBeenCalledWith("u-2");
  });
});

describe("setUserPasswordAction", () => {
  it("refuses a mismatched confirmation", async () => {
    const result = await setUserPasswordAction("u-2", {
      password: "password123",
      confirmPassword: "password124",
    });

    expect(result).toEqual({
      success: false,
      error: "Le password non corrispondono",
    });
    expect(auth.api.setUserPassword).not.toHaveBeenCalled();
  });

  it("sets the new password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(target());

    const result = await setUserPasswordAction("u-2", passwordValues);

    expect(result).toEqual({ success: true });
    expect(auth.api.setUserPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { userId: "u-2", newPassword: "password123" },
      })
    );
    expect(invalidateUserCache).toHaveBeenCalledWith("u-2");
  });
});

describe("banUserAction", () => {
  it("refuses to block yourself", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      target({ id: "admin-1", role: "admin" })
    );

    const result = await banUserAction("admin-1", { reason: "abuso" });

    expect(result).toEqual({
      success: false,
      error: "Non puoi bloccare il tuo account",
    });
    expect(auth.api.banUser).not.toHaveBeenCalled();
  });

  it("refuses to block the last active administrator", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      target({ role: "admin" })
    );
    vi.mocked(prisma.user.count).mockResolvedValueOnce(1);

    const result = await banUserAction("u-2", { reason: "abuso" });

    expect(result).toEqual({
      success: false,
      error: "Deve restare almeno un amministratore attivo",
    });
    expect(auth.api.banUser).not.toHaveBeenCalled();
  });

  it("blocks the user with the reason", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(target());

    const result = await banUserAction("u-2", { reason: "abuso" });

    expect(result).toEqual({ success: true });
    expect(auth.api.banUser).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { userId: "u-2", banReason: "abuso" },
      })
    );
    expect(invalidateUserCache).toHaveBeenCalledWith("u-2");
  });

  it("surfaces a plugin error in Italian", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(target());
    vi.mocked(auth.api.banUser).mockRejectedValueOnce({
      body: { code: "YOU_CANNOT_BAN_YOURSELF" },
    });

    const result = await banUserAction("u-2", { reason: "abuso" });

    expect(result).toEqual({
      success: false,
      error: "Non puoi bloccare il tuo account",
    });
  });
});

describe("unbanUserAction", () => {
  it("lifts the block", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      target({ banned: true })
    );

    const result = await unbanUserAction("u-2");

    expect(result).toEqual({ success: true });
    expect(auth.api.unbanUser).toHaveBeenCalledWith(
      expect.objectContaining({ body: { userId: "u-2" } })
    );
    expect(invalidateUserCache).toHaveBeenCalledWith("u-2");
  });

  it("reports a missing user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    const result = await unbanUserAction("missing");

    expect(result).toEqual({ success: false, error: "Utente non trovato" });
    expect(auth.api.unbanUser).not.toHaveBeenCalled();
  });
});

describe("revokeUserSessionAction", () => {
  it("reads the token of a session that belongs to the user", async () => {
    vi.mocked(prisma.session.findFirst).mockResolvedValueOnce({
      token: "tok",
    } as any);

    const result = await revokeUserSessionAction("u-2", "s-1");

    expect(result).toEqual({ success: true });
    expect(prisma.session.findFirst).toHaveBeenCalledWith({
      where: { id: "s-1", userId: "u-2" },
      select: { token: true },
    });
    expect(auth.api.revokeUserSession).toHaveBeenCalledWith(
      expect.objectContaining({ body: { sessionToken: "tok" } })
    );
    expect(invalidateUserCache).toHaveBeenCalledWith("u-2");
  });

  it("reports a session that is not the user's", async () => {
    vi.mocked(prisma.session.findFirst).mockResolvedValueOnce(null);

    const result = await revokeUserSessionAction("u-2", "s-1");

    expect(result).toEqual({ success: false, error: "Sessione non trovata" });
    expect(auth.api.revokeUserSession).not.toHaveBeenCalled();
  });
});

describe("revokeUserSessionsAction", () => {
  it("closes every session of the user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(target());

    const result = await revokeUserSessionsAction("u-2");

    expect(result).toEqual({ success: true });
    expect(auth.api.revokeUserSessions).toHaveBeenCalledWith(
      expect.objectContaining({ body: { userId: "u-2" } })
    );
    expect(invalidateUserCache).toHaveBeenCalledWith("u-2");
  });
});
