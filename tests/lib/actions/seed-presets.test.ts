import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedDefaultPresetsAction } from "../../../lib/actions/seed-presets";

// Mock dependencies
vi.mock("../../../lib/prisma", () => ({
  default: {
    preset: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("../../../lib/auth-server", () => ({
  requireUser: vi.fn(() =>
    Promise.resolve({ id: "user-123", name: "Test User" })
  ),
}));

vi.mock("../../../lib/services/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("seed-presets actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("seedDefaultPresetsAction", () => {
    it("seeds default presets successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockDeleteMany = prisma.preset.deleteMany as any;
      const mockCreate = prisma.preset.create as any;

      mockDeleteMany.mockResolvedValueOnce({ count: 0 });
      mockCreate.mockResolvedValue({ id: "preset-123" });

      const result = await seedDefaultPresetsAction();

      expect(result.success).toBe(true);
      expect(result.count).toBe(9); // 9 default presets
      expect(mockDeleteMany).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledTimes(9);
    });

    it("deletes existing presets before seeding", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockDeleteMany = prisma.preset.deleteMany as any;
      const mockCreate = prisma.preset.create as any;

      mockDeleteMany.mockResolvedValueOnce({ count: 5 });
      mockCreate.mockResolvedValue({ id: "preset-123" });

      await seedDefaultPresetsAction();

      expect(mockDeleteMany).toHaveBeenCalledBefore(mockCreate as any);
      expect(mockDeleteMany).toHaveBeenCalledWith({});
    });

    it("creates presets with correct structure", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockDeleteMany = prisma.preset.deleteMany as any;
      const mockCreate = prisma.preset.create as any;

      mockDeleteMany.mockResolvedValueOnce({ count: 0 });
      mockCreate.mockResolvedValue({ id: "preset-123" });

      await seedDefaultPresetsAction();

      // Check first preset (react-hooks)
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "react-hooks",
          questionType: "multiple_choice",
          focusAreas: expect.arrayContaining([
            "React Hooks",
            "useEffect",
            "Custom Hooks",
          ]),
          distractorComplexity: "complex",
        }),
      });
    });

    it("creates presets for all question types", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockDeleteMany = prisma.preset.deleteMany as any;
      const mockCreate = prisma.preset.create as any;

      mockDeleteMany.mockResolvedValueOnce({ count: 0 });
      mockCreate.mockResolvedValue({ id: "preset-123" });

      await seedDefaultPresetsAction();

      const createCalls = mockCreate.mock.calls;
      const types = createCalls.map((call: any) => call[0].data.questionType);

      expect(types).toContain("multiple_choice");
      expect(types).toContain("code_snippet");
      expect(types).toContain("open_question");
    });

    it("includes code_snippet preset with bugType", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockDeleteMany = prisma.preset.deleteMany as any;
      const mockCreate = prisma.preset.create as any;

      mockDeleteMany.mockResolvedValueOnce({ count: 0 });
      mockCreate.mockResolvedValue({ id: "preset-123" });

      await seedDefaultPresetsAction();

      const codeSnippetCall = mockCreate.mock.calls.find(
        (call: any) => call[0].data.questionType === "code_snippet"
      );

      expect(codeSnippetCall).toBeDefined();
      expect(codeSnippetCall[0].data.bugType).toBeDefined();
    });

    it("returns success message", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockDeleteMany = prisma.preset.deleteMany as any;
      const mockCreate = prisma.preset.create as any;

      mockDeleteMany.mockResolvedValueOnce({ count: 0 });
      mockCreate.mockResolvedValue({ id: "preset-123" });

      const result = await seedDefaultPresetsAction();

      expect(result.success).toBe(true);
      expect(result.message).toContain("Successfully seeded");
      expect(result.count).toBe(9);
    });

    it("returns error on database failure", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { logger } = await import("../../../lib/services/logger");
      const mockDeleteMany = prisma.preset.deleteMany as any;

      mockDeleteMany.mockRejectedValueOnce(
        new Error("Database connection failed")
      );

      const result = await seedDefaultPresetsAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database connection failed");
      expect(logger.error).toHaveBeenCalled();
    });

    it("returns error on partial seeding failure", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { logger } = await import("../../../lib/services/logger");
      const mockDeleteMany = prisma.preset.deleteMany as any;
      const mockCreate = prisma.preset.create as any;

      mockDeleteMany.mockResolvedValueOnce({ count: 0 });
      mockCreate
        .mockResolvedValueOnce({ id: "preset-1" })
        .mockResolvedValueOnce({ id: "preset-2" })
        .mockRejectedValueOnce(new Error("Create failed"));

      const result = await seedDefaultPresetsAction();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Create failed");
      expect(logger.error).toHaveBeenCalled();
    });

    it("verifies all preset names are present", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockDeleteMany = prisma.preset.deleteMany as any;
      const mockCreate = prisma.preset.create as any;

      mockDeleteMany.mockResolvedValueOnce({ count: 0 });
      mockCreate.mockResolvedValue({ id: "preset-123" });

      await seedDefaultPresetsAction();

      const createCalls = mockCreate.mock.calls;
      const names = createCalls.map((call: any) => call[0].data.name);

      const expectedNames = [
        "react-hooks",
        "typescript-mastery",
        "frontend-performance",
        "api-design",
        "database-optimization",
        "security-awareness",
        "problem-solving",
        "system-design",
        "best-practices",
      ];

      expectedNames.forEach((name) => {
        expect(names).toContain(name);
      });
    });

    it("verifies all presets have tags", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockDeleteMany = prisma.preset.deleteMany as any;
      const mockCreate = prisma.preset.create as any;

      mockDeleteMany.mockResolvedValueOnce({ count: 0 });
      mockCreate.mockResolvedValue({ id: "preset-123" });

      await seedDefaultPresetsAction();

      const createCalls = mockCreate.mock.calls;

      createCalls.forEach((call: any) => {
        // All presets have tags
        expect(call[0].data.tags).toBeDefined();
        expect(Array.isArray(call[0].data.tags)).toBe(true);
        expect(call[0].data.tags.length).toBeGreaterThan(0);

        // Different question types have different required fields
        const questionType = call[0].data.questionType;
        if (questionType === "multiple_choice") {
          expect(call[0].data.focusAreas).toBeDefined();
          expect(Array.isArray(call[0].data.focusAreas)).toBe(true);
        } else if (questionType === "open_question") {
          expect(call[0].data.evaluationCriteria).toBeDefined();
          expect(Array.isArray(call[0].data.evaluationCriteria)).toBe(true);
        } else if (questionType === "code_snippet") {
          expect(call[0].data.bugType).toBeDefined();
          expect(call[0].data.codeComplexity).toBeDefined();
        }
      });
    });
  });
});
