import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPosition,
  deletePosition,
  updatePosition,
} from "../../../lib/actions/positions";

// Mock dependencies
vi.mock("../../../lib/prisma", () => ({
  default: {
    position: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../../../lib/auth-server", () => ({
  requireUser: vi.fn(() =>
    Promise.resolve({ id: "user-123", name: "Test User" })
  ),
}));

vi.mock("../../../lib/utils/cache-utils", () => ({
  invalidatePositionCache: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("positions actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPosition", () => {
    it("creates position successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { redirect } = await import("next/navigation");
      const mockCreate = prisma.position.create as any;

      mockCreate.mockResolvedValueOnce({ id: "pos-123" });

      const data = {
        title: "Senior Developer",
        description: "We are looking for a senior developer",
        experienceLevel: "senior" as const,
        skills: ["TypeScript", "React", "Next.js"],
        softSkills: ["communication", "teamwork"],
        contractType: "full-time" as const,
      };

      await createPosition(data);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "Senior Developer",
          description: "We are looking for a senior developer",
          experienceLevel: "senior",
          skills: ["TypeScript", "React", "Next.js"],
          softSkills: ["communication", "teamwork"],
          contractType: "full-time",
          createdBy: "user-123",
        }),
        select: { id: true },
      });
      expect(redirect).toHaveBeenCalledWith("/dashboard/positions/pos-123");
    });

    it("creates position with optional fields omitted", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockCreate = prisma.position.create as any;

      mockCreate.mockResolvedValueOnce({ id: "pos-456" });

      const data = {
        title: "Junior Developer",
        experienceLevel: "junior" as const,
        skills: ["JavaScript"],
        softSkills: [],
      };

      await createPosition(data);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "Junior Developer",
          description: null,
          experienceLevel: "junior",
          skills: ["JavaScript"],
          softSkills: [],
          contractType: null,
        }),
        select: { id: true },
      });
    });

    it("validates required fields", async () => {
      const invalidData = {
        title: "",
        experienceLevel: "junior" as const,
        skills: [],
      } as any;

      await expect(createPosition(invalidData)).rejects.toThrow();
    });

    it("validates experience level enum", async () => {
      const invalidData = {
        title: "Developer",
        experienceLevel: "invalid" as const,
        skills: ["JS"],
      } as any;

      await expect(createPosition(invalidData)).rejects.toThrow();
    });

    it("invalidates cache after creation", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidatePositionCache } = await import(
        "../../../lib/utils/cache-utils"
      );
      const mockCreate = prisma.position.create as any;

      mockCreate.mockResolvedValueOnce({ id: "pos-123" });

      const data = {
        title: "Developer",
        experienceLevel: "mid" as const,
        skills: ["JS"],
        softSkills: [],
      };

      await createPosition(data);

      expect(invalidatePositionCache).toHaveBeenCalledWith("pos-123");
    });
  });

  describe("deletePosition", () => {
    it("deletes position successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { redirect } = await import("next/navigation");
      const mockFindUnique = prisma.position.findUnique as any;
      const mockDelete = prisma.position.delete as any;

      mockFindUnique.mockResolvedValueOnce({ id: "pos-123" });
      mockDelete.mockResolvedValueOnce({ id: "pos-123" });

      await deletePosition("pos-123");

      expect(mockDelete).toHaveBeenCalledWith({ where: { id: "pos-123" } });
      expect(redirect).toHaveBeenCalledWith("/dashboard/positions");
    });

    it("throws error when position not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.position.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      await expect(deletePosition("invalid-id")).rejects.toThrow(
        "Position not found"
      );
    });

    it("invalidates cache after deletion", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidatePositionCache } = await import(
        "../../../lib/utils/cache-utils"
      );
      const mockFindUnique = prisma.position.findUnique as any;
      const mockDelete = prisma.position.delete as any;

      mockFindUnique.mockResolvedValueOnce({ id: "pos-123" });
      mockDelete.mockResolvedValueOnce({ id: "pos-123" });

      await deletePosition("pos-123");

      expect(invalidatePositionCache).toHaveBeenCalledWith();
    });
  });

  describe("updatePosition", () => {
    it("updates position successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { redirect } = await import("next/navigation");
      const mockUpdate = prisma.position.update as any;

      mockUpdate.mockResolvedValueOnce({ id: "pos-123" });

      const formData = new FormData();
      formData.append("title", "Updated Title");
      formData.append("description", "Updated description");
      formData.append("experienceLevel", "senior");
      formData.append("skills", JSON.stringify(["TypeScript", "React"]));
      formData.append("softSkills", JSON.stringify(["leadership"]));
      formData.append("contractType", "full-time");

      await updatePosition("pos-123", formData);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "pos-123" },
        data: expect.objectContaining({
          title: "Updated Title",
          description: "Updated description",
          experienceLevel: "senior",
          skills: ["TypeScript", "React"],
          softSkills: ["leadership"],
          contractType: "full-time",
        }),
      });
      expect(redirect).toHaveBeenCalledWith("/dashboard/positions/pos-123");
    });

    it("parses JSON arrays correctly", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockUpdate = prisma.position.update as any;

      mockUpdate.mockResolvedValueOnce({ id: "pos-123" });

      const formData = new FormData();
      formData.append("title", "Developer");
      formData.append("experienceLevel", "mid");
      formData.append("skills", JSON.stringify(["JavaScript", "Node.js"]));
      formData.append(
        "softSkills",
        JSON.stringify(["teamwork", "communication"])
      );

      await updatePosition("pos-123", formData);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "pos-123" },
        data: expect.objectContaining({
          skills: ["JavaScript", "Node.js"],
          softSkills: ["teamwork", "communication"],
        }),
      });
    });

    it("handles empty softSkills array", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockUpdate = prisma.position.update as any;

      mockUpdate.mockResolvedValueOnce({ id: "pos-123" });

      const formData = new FormData();
      formData.append("title", "Developer");
      formData.append("experienceLevel", "junior");
      formData.append("skills", JSON.stringify(["JavaScript"]));
      formData.append("softSkills", JSON.stringify([]));

      await updatePosition("pos-123", formData);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "pos-123" },
        data: expect.objectContaining({
          skills: ["JavaScript"],
          softSkills: [],
        }),
      });
    });

    it("validates required skills field", async () => {
      const formData = new FormData();
      formData.append("title", "Developer");
      formData.append("experienceLevel", "mid");
      formData.append("skills", JSON.stringify([]));

      await expect(updatePosition("pos-123", formData)).rejects.toThrow();
    });

    it("throws error for malformed skills JSON", async () => {
      const formData = new FormData();
      formData.append("title", "Developer");
      formData.append("experienceLevel", "mid");
      formData.append("skills", "not-valid-json");

      await expect(updatePosition("pos-123", formData)).rejects.toThrow(
        "Invalid skills format"
      );
    });

    it("throws error for non-array skills JSON", async () => {
      const formData = new FormData();
      formData.append("title", "Developer");
      formData.append("experienceLevel", "mid");
      formData.append("skills", JSON.stringify({ not: "array" }));

      await expect(updatePosition("pos-123", formData)).rejects.toThrow(
        "Invalid skills format"
      );
    });

    it("handles empty description", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockUpdate = prisma.position.update as any;

      mockUpdate.mockResolvedValueOnce({ id: "pos-123" });

      const formData = new FormData();
      formData.append("title", "Developer");
      formData.append("description", "");
      formData.append("experienceLevel", "mid");
      formData.append("skills", JSON.stringify(["JS"]));

      await updatePosition("pos-123", formData);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "pos-123" },
        data: expect.objectContaining({
          description: null,
        }),
      });
    });

    it("handles empty contract type", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockUpdate = prisma.position.update as any;

      mockUpdate.mockResolvedValueOnce({ id: "pos-123" });

      const formData = new FormData();
      formData.append("title", "Developer");
      formData.append("experienceLevel", "mid");
      formData.append("skills", JSON.stringify(["JS"]));
      formData.append("contractType", "   ");

      await updatePosition("pos-123", formData);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "pos-123" },
        data: expect.objectContaining({
          contractType: null,
        }),
      });
    });

    it("invalidates cache after update", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidatePositionCache } = await import(
        "../../../lib/utils/cache-utils"
      );
      const mockUpdate = prisma.position.update as any;

      mockUpdate.mockResolvedValueOnce({ id: "pos-123" });

      const formData = new FormData();
      formData.append("title", "Updated");
      formData.append("experienceLevel", "mid");
      formData.append("skills", JSON.stringify(["JS"]));

      await updatePosition("pos-123", formData);

      expect(invalidatePositionCache).toHaveBeenCalledWith("pos-123");
    });
  });
});
