import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getProfile,
  updatePassword,
  updateProfile,
} from "../../../lib/actions/profile";

// Mock dependencies
vi.mock("../../../lib/prisma", () => ({
  default: {
    profile: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("../../../lib/auth-server", () => ({
  requireUser: vi.fn(() =>
    Promise.resolve({ id: "user-123", name: "Test User" })
  ),
}));

vi.mock("../../../lib/auth", () => ({
  auth: {
    api: {
      updateUser: vi.fn(),
      changePassword: vi.fn(),
    },
  },
}));

vi.mock("../../../lib/utils/cache-utils", () => ({
  invalidateProfileCache: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => {
    const headersList = new Headers();
    headersList.set("host", "localhost:3000");
    return headersList;
  }),
}));

describe("profile actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProfile", () => {
    it("returns existing profile", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.profile.findUnique as any;

      const profile = {
        id: "profile-123",
        userId: "user-123",
        fullName: "Test User",
        userName: "testuser",
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFindUnique.mockResolvedValueOnce(profile);

      const result = await getProfile();

      expect(result.profile).toBeTruthy();
      expect(result.profile?.id).toBe("profile-123");
      expect(result.user).toBeTruthy();
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { userId: "user-123" },
      });
    });

    it("returns null profile when not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.profile.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      const result = await getProfile();

      expect(result.profile).toBeNull();
      expect(result.user).toBeTruthy();
    });

    it("returns error when authentication fails", async () => {
      const { requireUser } = await import("../../../lib/auth-server");
      const mockRequireUser = requireUser as any;

      mockRequireUser.mockRejectedValueOnce(new Error("Unauthorized"));

      const result = await getProfile();

      expect(result.profile).toBeNull();
      expect(result.user).toBeNull();
      expect(result.error).toBe("Unauthorized");
    });
  });

  describe("updateProfile", () => {
    it("updates profile successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { auth } = await import("../../../lib/auth");
      const mockUpsert = prisma.profile.upsert as any;
      const mockUpdateUser = auth.api.updateUser as any;

      const formData = new FormData();
      formData.append("full_name", "Updated Name");
      formData.append("user_name", "updateduser");

      mockUpsert.mockResolvedValueOnce({});
      mockUpdateUser.mockResolvedValueOnce({});

      const result = await updateProfile(formData);

      expect(result.success).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        create: {
          userId: "user-123",
          fullName: "Updated Name",
          userName: "updateduser",
        },
        update: {
          fullName: "Updated Name",
          userName: "updateduser",
        },
      });
      expect(mockUpdateUser).toHaveBeenCalled();
    });

    it("creates profile if not exists (upsert)", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { auth } = await import("../../../lib/auth");
      const mockUpsert = prisma.profile.upsert as any;
      const mockUpdateUser = auth.api.updateUser as any;

      const formData = new FormData();
      formData.append("full_name", "New User");
      formData.append("user_name", "newuser");

      mockUpsert.mockResolvedValueOnce({});
      mockUpdateUser.mockResolvedValueOnce({});

      const result = await updateProfile(formData);

      expect(result.success).toBe(true);
      expect(mockUpsert).toHaveBeenCalled();
    });

    it("throws error when required fields missing", async () => {
      const formData = new FormData();

      await expect(updateProfile(formData)).rejects.toThrow(
        "Nome completo e nome utente sono obbligatori"
      );
    });

    it("throws error when userName missing", async () => {
      const formData = new FormData();
      formData.append("full_name", "Only Name");

      await expect(updateProfile(formData)).rejects.toThrow(
        "Nome completo e nome utente sono obbligatori"
      );
    });

    it("throws error when fullName missing", async () => {
      const formData = new FormData();
      formData.append("user_name", "onlyusername");

      await expect(updateProfile(formData)).rejects.toThrow(
        "Nome completo e nome utente sono obbligatori"
      );
    });

    it("requires authentication", async () => {
      const { requireUser } = await import("../../../lib/auth-server");
      const mockRequireUser = requireUser as any;

      mockRequireUser.mockRejectedValueOnce(new Error("Unauthorized"));

      const formData = new FormData();
      await expect(updateProfile(formData)).rejects.toThrow("Unauthorized");
    });
  });

  describe("updatePassword", () => {
    it("updates password successfully", async () => {
      const { auth } = await import("../../../lib/auth");
      const mockChangePassword = auth.api.changePassword as any;

      const formData = new FormData();
      formData.append("current_password", "oldPassword123");
      formData.append("new_password", "newPassword456");

      mockChangePassword.mockResolvedValueOnce({});

      const result = await updatePassword(formData);

      expect(result.success).toBe(true);
      expect(mockChangePassword).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            currentPassword: "oldPassword123",
            newPassword: "newPassword456",
          },
          headers: expect.any(Headers),
        })
      );
    });

    it("throws error when current password missing", async () => {
      const formData = new FormData();
      formData.append("new_password", "newPassword456");

      await expect(updatePassword(formData)).rejects.toThrow(
        "Password non valida"
      );
    });

    it("throws error when new password missing", async () => {
      const formData = new FormData();
      formData.append("current_password", "oldPassword123");

      await expect(updatePassword(formData)).rejects.toThrow(
        "Password non valida"
      );
    });

    it("throws error when both passwords missing", async () => {
      const formData = new FormData();

      await expect(updatePassword(formData)).rejects.toThrow(
        "Password non valida"
      );
    });

    it("handles API error", async () => {
      const { auth } = await import("../../../lib/auth");
      const mockChangePassword = auth.api.changePassword as any;

      const formData = new FormData();
      formData.append("current_password", "wrongPassword");
      formData.append("new_password", "newPassword456");

      mockChangePassword.mockRejectedValueOnce(
        new Error("Current password is incorrect")
      );

      await expect(updatePassword(formData)).rejects.toThrow(
        "Current password is incorrect"
      );
    });

    it("includes host header in request", async () => {
      const { auth } = await import("../../../lib/auth");
      const mockChangePassword = auth.api.changePassword as any;

      const formData = new FormData();
      formData.append("current_password", "oldPassword123");
      formData.append("new_password", "newPassword456");

      mockChangePassword.mockResolvedValueOnce({});

      await updatePassword(formData);

      const callArgs = mockChangePassword.mock.calls[0][0];
      expect(callArgs.headers).toBeInstanceOf(Headers);
      expect(callArgs.headers.get("host")).toBe("localhost:3000");
    });

    it("requires authentication", async () => {
      const { requireUser } = await import("../../../lib/auth-server");
      const mockRequireUser = requireUser as any;

      mockRequireUser.mockRejectedValueOnce(new Error("Unauthorized"));

      const formData = new FormData();
      formData.append("current_password", "old");
      formData.append("new_password", "new");

      await expect(updatePassword(formData)).rejects.toThrow("Unauthorized");
    });
  });
});
