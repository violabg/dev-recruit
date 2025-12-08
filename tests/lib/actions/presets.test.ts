import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bulkCreatePresetsAction,
  createPresetAction,
  deletePresetAction,
  getPresetAction,
  getPresetsAction,
  updatePresetAction,
} from "../../../lib/actions/presets";

// Mock dependencies
vi.mock("../../../lib/prisma", () => ({
  default: {
    preset: {
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

vi.mock("../../../lib/data/presets", () => ({
  getPresetsData: vi.fn(),
  getPresetData: vi.fn(),
}));

vi.mock("../../../lib/utils/cache-utils", () => ({
  invalidatePresetCache: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("presets actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPresetsAction", () => {
    it("returns presets successfully", async () => {
      const { getPresetsData } = await import("../../../lib/data/presets");

      (getPresetsData as any).mockResolvedValueOnce({
        presets: [
          { id: "preset-1", name: "Test Preset 1" },
          { id: "preset-2", name: "Test Preset 2" },
        ],
        totalCount: 2,
        currentPage: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });

      const result = await getPresetsAction();

      expect(result.success).toBe(true);
      expect(result.presets).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });

    it("handles pagination parameters", async () => {
      const { getPresetsData } = await import("../../../lib/data/presets");

      await getPresetsAction({ page: 2, pageSize: 5 });

      expect(getPresetsData).toHaveBeenCalledWith({ page: 2, pageSize: 5 });
    });

    it("handles search parameter", async () => {
      const { getPresetsData } = await import("../../../lib/data/presets");

      await getPresetsAction({ search: "javascript" });

      expect(getPresetsData).toHaveBeenCalledWith({ search: "javascript" });
    });

    it("handles errors gracefully", async () => {
      const { getPresetsData } = await import("../../../lib/data/presets");

      (getPresetsData as any).mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await getPresetsAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
      expect(result.presets).toEqual([]);
    });
  });

  describe("getPresetAction", () => {
    it("returns preset successfully", async () => {
      const { getPresetData } = await import("../../../lib/data/presets");

      (getPresetData as any).mockResolvedValueOnce({
        id: "preset-1",
        name: "Test Preset",
      });

      const result = await getPresetAction("preset-1");

      expect(result.success).toBe(true);
      expect(result.preset).toEqual({ id: "preset-1", name: "Test Preset" });
    });

    it("returns error when preset not found", async () => {
      const { getPresetData } = await import("../../../lib/data/presets");

      (getPresetData as any).mockResolvedValueOnce(null);

      const result = await getPresetAction("invalid-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Preset not found");
    });

    it("handles errors gracefully", async () => {
      const { getPresetData } = await import("../../../lib/data/presets");

      (getPresetData as any).mockRejectedValueOnce(new Error("Database error"));

      const result = await getPresetAction("preset-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });

  describe("createPresetAction", () => {
    it("creates preset successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockCreate = prisma.preset.create as any;

      mockCreate.mockResolvedValueOnce({ id: "preset-new" });

      const data = {
        name: "Test Preset",
        label: "Test Label",
        description: "Test description",
        icon: "test-icon",
        questionType: "multiple_choice" as const,
        instructions: "Test instructions",
        focusAreas: ["JavaScript"],
        distractorComplexity: "moderate" as const,
        expectedResponseLength: "medium" as const,
        evaluationCriteria: ["Correctness"],
        language: "JavaScript",
        bugType: "logic" as const,
        codeComplexity: "intermediate" as const,
        includeComments: true,
        tags: ["test"],
        difficulty: 3,
        isDefault: false,
      };

      const result = await createPresetAction(data);

      expect(result.success).toBe(true);
      expect(result.presetId).toBe("preset-new");
      expect(mockCreate).toHaveBeenCalled();
    });

    it("validates required fields", async () => {
      const invalidData = {
        name: "",
        questionType: "multiple_choice" as const,
      } as any;

      const result = await createPresetAction(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid input");
      expect(result.issues).toBeDefined();
    });

    it("invalidates cache after creation", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidatePresetCache } = await import(
        "../../../lib/utils/cache-utils"
      );
      const mockCreate = prisma.preset.create as any;

      mockCreate.mockResolvedValueOnce({ id: "preset-new" });

      const data = {
        name: "Test",
        label: "Test",
        icon: "test-icon",
        questionType: "multiple_choice" as const,
        instructions: "Test",
        focusAreas: undefined,
        distractorComplexity: undefined,
        expectedResponseLength: undefined,
        evaluationCriteria: undefined,
        language: undefined,
        bugType: undefined,
        codeComplexity: undefined,
        includeComments: undefined,
        tags: ["test"],
        difficulty: 3,
      };

      await createPresetAction(data);

      expect(invalidatePresetCache).toHaveBeenCalled();
      // The function is called with the preset id that was created
      expect(invalidatePresetCache).toHaveBeenCalledWith("preset-new");
    });

    it("handles database errors", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockCreate = prisma.preset.create as any;

      mockCreate.mockRejectedValueOnce(new Error("Database error"));

      const data = {
        name: "Test",
        label: "Test",
        icon: "test-icon",
        questionType: "multiple_choice" as const,
        instructions: "Test",
        focusAreas: undefined,
        distractorComplexity: undefined,
        expectedResponseLength: undefined,
        evaluationCriteria: undefined,
        language: undefined,
        bugType: undefined,
        codeComplexity: undefined,
        includeComments: undefined,
        tags: ["test"],
        difficulty: 3,
      };

      const result = await createPresetAction(data);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });

  describe("updatePresetAction", () => {
    it("updates preset successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.preset.findUnique as any;
      const mockUpdate = prisma.preset.update as any;

      mockFindUnique.mockResolvedValueOnce({ id: "preset-1" });
      mockUpdate.mockResolvedValueOnce({ id: "preset-1" });

      const data = {
        name: "Updated Name",
        label: "Updated Label",
      };

      const result = await updatePresetAction("preset-1", data);

      expect(result.success).toBe(true);
      expect(result.presetId).toBe("preset-1");
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("returns error when preset not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.preset.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      const data = {
        name: "Updated Name",
      };

      const result = await updatePresetAction("invalid-id", data);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Preset not found");
    });

    it("validates input data", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.preset.findUnique as any;

      mockFindUnique.mockResolvedValueOnce({ id: "preset-1" });

      const invalidData = {
        difficulty: 10, // exceeds max of 5
      };

      const result = await updatePresetAction("preset-1", invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid input");
    });

    it("invalidates cache after update", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidatePresetCache } = await import(
        "../../../lib/utils/cache-utils"
      );
      const mockFindUnique = prisma.preset.findUnique as any;
      const mockUpdate = prisma.preset.update as any;

      mockFindUnique.mockResolvedValueOnce({ id: "preset-1" });
      mockUpdate.mockResolvedValueOnce({ id: "preset-1" });

      const data = { name: "Updated" };

      await updatePresetAction("preset-1", data);

      expect(invalidatePresetCache).toHaveBeenCalledWith("preset-1");
    });
  });

  describe("deletePresetAction", () => {
    it("deletes preset successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { redirect } = await import("next/navigation");
      const mockFindUnique = prisma.preset.findUnique as any;
      const mockDelete = prisma.preset.delete as any;

      mockFindUnique.mockResolvedValueOnce({ id: "preset-1" });
      mockDelete.mockResolvedValueOnce({ id: "preset-1" });

      await deletePresetAction("preset-1");

      expect(mockDelete).toHaveBeenCalledWith({ where: { id: "preset-1" } });
      expect(redirect).toHaveBeenCalledWith("/dashboard/presets");
    });

    it("returns error when preset not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.preset.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      const result = await deletePresetAction("invalid-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Preset not found");
    });

    it("invalidates cache after deletion", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidatePresetCache } = await import(
        "../../../lib/utils/cache-utils"
      );
      const mockFindUnique = prisma.preset.findUnique as any;
      const mockDelete = prisma.preset.delete as any;

      mockFindUnique.mockResolvedValueOnce({ id: "preset-1" });
      mockDelete.mockResolvedValueOnce({ id: "preset-1" });

      await deletePresetAction("preset-1");

      expect(invalidatePresetCache).toHaveBeenCalledWith();
    });

    it("handles database errors", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.preset.findUnique as any;
      const mockDelete = prisma.preset.delete as any;

      mockFindUnique.mockResolvedValueOnce({ id: "preset-1" });
      mockDelete.mockRejectedValueOnce(new Error("Database error"));

      const result = await deletePresetAction("preset-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });

  describe("bulkCreatePresetsAction", () => {
    it("creates multiple presets successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockCreate = prisma.preset.create as any;

      mockCreate
        .mockResolvedValueOnce({ id: "preset-1" })
        .mockResolvedValueOnce({ id: "preset-2" })
        .mockResolvedValueOnce({ id: "preset-3" });

      const presets = [
        {
          name: "Preset 1",
          label: "Label 1",
          icon: "beaker",
          questionType: "multiple_choice" as const,
          instructions: "Test 1",
          focusAreas: undefined,
          distractorComplexity: undefined,
          expectedResponseLength: undefined,
          evaluationCriteria: undefined,
          language: undefined,
          bugType: undefined,
          codeComplexity: undefined,
          includeComments: undefined,
          tags: ["test"],
          difficulty: 3,
        },
        {
          name: "Preset 2",
          label: "Label 2",
          icon: "document",
          questionType: "open_question" as const,
          instructions: "Test 2",
          focusAreas: undefined,
          distractorComplexity: undefined,
          expectedResponseLength: undefined,
          evaluationCriteria: undefined,
          language: undefined,
          bugType: undefined,
          codeComplexity: undefined,
          includeComments: undefined,
          tags: ["test"],
          difficulty: 3,
        },
        {
          name: "Preset 3",
          label: "Label 3",
          icon: "code",
          questionType: "code_snippet" as const,
          instructions: "Test 3",
          focusAreas: undefined,
          distractorComplexity: undefined,
          expectedResponseLength: undefined,
          evaluationCriteria: undefined,
          language: undefined,
          bugType: undefined,
          codeComplexity: undefined,
          includeComments: undefined,
          tags: ["test"],
          difficulty: 3,
        },
      ];

      const result = await bulkCreatePresetsAction(presets);

      expect(result.success).toBe(true);
      expect(result.created).toHaveLength(3);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it("invalidates cache after bulk creation", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidatePresetCache } = await import(
        "../../../lib/utils/cache-utils"
      );
      const mockCreate = prisma.preset.create as any;

      mockCreate.mockResolvedValue({ id: "preset-1" });

      const presets = [
        {
          name: "Preset 1",
          label: "Label 1",
          icon: "beaker",
          questionType: "multiple_choice" as const,
          instructions: "Test",
          focusAreas: undefined,
          distractorComplexity: undefined,
          expectedResponseLength: undefined,
          evaluationCriteria: undefined,
          language: undefined,
          bugType: undefined,
          codeComplexity: undefined,
          includeComments: undefined,
          tags: ["test"],
          difficulty: 3,
        },
      ];

      await bulkCreatePresetsAction(presets);

      expect(invalidatePresetCache).toHaveBeenCalledWith();
    });

    it("handles empty array", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockCreate = prisma.preset.create as any;

      const result = await bulkCreatePresetsAction([]);

      expect(result.success).toBe(true);
      expect(result.created).toEqual([]);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("handles database errors", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockCreate = prisma.preset.create as any;

      mockCreate.mockRejectedValueOnce(new Error("Database error"));

      const presets = [
        {
          name: "Preset 1",
          label: "Label 1",
          icon: "beaker",
          questionType: "multiple_choice" as const,
          instructions: "Test",
          focusAreas: undefined,
          distractorComplexity: undefined,
          expectedResponseLength: undefined,
          evaluationCriteria: undefined,
          language: undefined,
          bugType: undefined,
          codeComplexity: undefined,
          includeComments: undefined,
          tags: ["test"],
          difficulty: 3,
        },
      ];

      const result = await bulkCreatePresetsAction(presets);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });
});
