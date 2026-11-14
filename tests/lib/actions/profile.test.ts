import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: { profile: { findUnique: vi.fn(), upsert: vi.fn() } },
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { updateUser: vi.fn(), changePassword: vi.fn() } },
}));

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidateProfileCache: vi.fn(),
}));

import { updatePassword, updateProfile } from "@/lib/actions/profile";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/auth-server";
import { getProfile } from "@/lib/data/profile";
import prisma from "@/lib/prisma";
import { invalidateProfileCache } from "@/lib/utils/cache-utils";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ id: "user-123" } as any);
});

describe("getProfile", () => {
  it("returns the signed-in user's profile", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValueOnce({
      id: "p1",
      fullName: "Mario Rossi",
      userName: "mario",
      avatarUrl: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: null,
    } as any);

    const result = await getProfile();

    expect(prisma.profile.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-123" },
    });
    expect(result.user).toEqual({ id: "user-123" });
    expect(result.profile).toEqual({
      id: "p1",
      fullName: "Mario Rossi",
      userName: "mario",
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: null,
    });
  });

  it("returns a null profile when none exists yet", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValueOnce(null);

    const result = await getProfile();

    expect(result.profile).toBeNull();
    expect(result.error).toBeUndefined();
  });

  it("returns an error instead of throwing when not signed in", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    const result = await getProfile();

    expect(result).toEqual({
      profile: null,
      user: null,
      error: "UNAUTHENTICATED",
    });
  });
});

describe("updateProfile", () => {
  it("saves the profile and the account name", async () => {
    const result = await updateProfile({
      full_name: " Mario Rossi ",
      user_name: "mario_rossi",
    });

    expect(result).toEqual({ success: true });
    expect(prisma.profile.upsert).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      create: {
        userId: "user-123",
        fullName: "Mario Rossi",
        userName: "mario_rossi",
      },
      update: { fullName: "Mario Rossi", userName: "mario_rossi" },
    });
    expect(auth.api.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ body: { name: "Mario Rossi" } }),
    );
    expect(invalidateProfileCache).toHaveBeenCalled();
  });

  it("returns the validation message for an invalid user name", async () => {
    const result = await updateProfile({
      full_name: "Mario Rossi",
      user_name: "mario rossi!",
    });

    expect(result).toEqual({
      success: false,
      error:
        "Nome utente può contenere solo lettere, numeri, trattini e underscore",
    });
    expect(prisma.profile.upsert).not.toHaveBeenCalled();
  });

  it("requires a signed-in user", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    const result = await updateProfile({
      full_name: "Mario Rossi",
      user_name: "mario",
    });

    expect(result).toMatchObject({ success: false });
    expect(prisma.profile.upsert).not.toHaveBeenCalled();
  });
});

describe("updatePassword", () => {
  const values = {
    current_password: "vecchia-password",
    new_password: "nuova-password",
    confirm_password: "nuova-password",
  };

  it("changes the password", async () => {
    const result = await updatePassword(values);

    expect(result).toEqual({ success: true });
    expect(auth.api.changePassword).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          currentPassword: "vecchia-password",
          newPassword: "nuova-password",
        },
      }),
    );
  });

  it("rejects a mismatched confirmation", async () => {
    const result = await updatePassword({
      ...values,
      confirm_password: "altra-password",
    });

    expect(result).toMatchObject({ success: false });
    expect(auth.api.changePassword).not.toHaveBeenCalled();
  });

  it("explains a refused password change", async () => {
    vi.mocked(auth.api.changePassword).mockRejectedValueOnce(
      new Error("Invalid password"),
    );

    const result = await updatePassword(values);

    expect(result).toMatchObject({
      success: false,
      error: expect.stringContaining("Verifica la password attuale"),
    });
  });
});
