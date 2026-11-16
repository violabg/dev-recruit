import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteEvaluationAction,
  updateEvaluationNotesAction,
} from "../../../lib/actions/evaluation-entity";

// Mock dependencies
vi.mock("../../../lib/prisma", () => ({
  default: {
    assessment: {
      findUnique: vi.fn(),
    },
    candidate: {
      findUnique: vi.fn(),
    },
    position: {
      findUnique: vi.fn(),
    },
    evaluation: {
      findFirst: vi.fn(),
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
  invalidateEvaluationCache: vi.fn(),
}));

describe("evaluation-entity actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      })
    ) as any;
  });

  describe("updateEvaluationNotesAction", () => {
    it("updates evaluation notes successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.evaluation.findUnique as any;
      const mockUpdate = prisma.evaluation.update as any;

      const evaluation = {
        id: "eval-123",
        assessmentId: "assessment-123",
        candidateId: null,
      };

      mockFindUnique.mockResolvedValueOnce(evaluation);
      mockUpdate.mockResolvedValueOnce({
        id: "eval-123",
        notes: "Updated notes",
      });

      const result = await updateEvaluationNotesAction("eval-123", "Updated notes");

      expect(result).toEqual({ success: true });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "eval-123" },
        data: { notes: "Updated notes" },
      });
    });

    it("throws error when evaluation not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.evaluation.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      expect(await updateEvaluationNotesAction("invalid-id", "Notes")).toMatchObject({ success: false });
    });

    it("invalidates cache after update", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidateEvaluationCache } = await import(
        "../../../lib/utils/cache-utils"
      );

      const mockFindUnique = prisma.evaluation.findUnique as any;
      const mockUpdate = prisma.evaluation.update as any;

      const evaluation = {
        id: "eval-123",
        assessmentId: "assessment-123",
        candidateId: "candidate-123",
      };

      mockFindUnique.mockResolvedValueOnce(evaluation);
      mockUpdate.mockResolvedValueOnce({ id: "eval-123" });

      await updateEvaluationNotesAction("eval-123", "Notes");

      expect(invalidateEvaluationCache).toHaveBeenCalledWith({
        evaluationId: "eval-123",
        assessmentId: "assessment-123",
        candidateId: "candidate-123",
      });
    });
  });

  describe("deleteEvaluationAction", () => {
    it("deletes evaluation successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.evaluation.findUnique as any;
      const mockDelete = prisma.evaluation.delete as any;

      const evaluation = {
        id: "eval-123",
        assessmentId: "assessment-123",
        candidateId: null,
      };

      mockFindUnique.mockResolvedValueOnce(evaluation);
      mockDelete.mockResolvedValueOnce({});

      const result = await deleteEvaluationAction("eval-123");

      expect(result.success).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: "eval-123" } });
    });

    it("throws error when evaluation not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.evaluation.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      expect(await deleteEvaluationAction("invalid-id")).toMatchObject({ success: false });
    });

    it("invalidates cache after deletion", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidateEvaluationCache } = await import(
        "../../../lib/utils/cache-utils"
      );

      const mockFindUnique = prisma.evaluation.findUnique as any;
      const mockDelete = prisma.evaluation.delete as any;

      const evaluation = {
        id: "eval-123",
        assessmentId: null,
        candidateId: "candidate-123",
      };

      mockFindUnique.mockResolvedValueOnce(evaluation);
      mockDelete.mockResolvedValueOnce({});

      await deleteEvaluationAction("eval-123");

      expect(invalidateEvaluationCache).toHaveBeenCalledWith({
        evaluationId: "eval-123",
        assessmentId: undefined,
        candidateId: "candidate-123",
      });
    });
  });
});
