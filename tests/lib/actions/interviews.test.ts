import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteInterview,
  startInterview,
} from "../../../lib/actions/interviews";

// Mock dependencies
vi.mock("../../../lib/prisma", () => ({
  default: {
    interview: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../../lib/utils/cache-utils", () => ({
  invalidateInterviewCache: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`Redirect to: ${url}`);
  }),
}));

describe("Interview Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("startInterview", () => {
    it("finds interview by token", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.interview.findUnique as any;

      const mockInterview = {
        id: "interview-123",
        status: "pending",
        startedAt: null,
      };

      mockFindUnique.mockResolvedValueOnce(mockInterview);

      await startInterview("test-token");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { token: "test-token" },
        select: {
          id: true,
          status: true,
          startedAt: true,
        },
      });
    });

    it("returns success response with startedAt", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.interview.findUnique as any;
      const mockUpdate = prisma.interview.update as any;

      const mockInterview = {
        id: "interview-123",
        status: "pending",
        startedAt: null,
      };

      mockFindUnique.mockResolvedValueOnce(mockInterview);
      mockUpdate.mockResolvedValueOnce({
        id: "interview-123",
        status: "in_progress",
        startedAt: new Date(),
      });

      const result = await startInterview("test-token");

      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("startedAt");
    });

    it("throws error when interview not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.interview.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      await expect(startInterview("invalid-token")).rejects.toThrow(
        "Interview not found"
      );
    });

    it("handles database errors", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.interview.findUnique as any;

      const dbError = new Error("Database connection failed");
      mockFindUnique.mockRejectedValueOnce(dbError);

      await expect(startInterview("test-token")).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("accepts valid token format", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.interview.findUnique as any;
      const mockUpdate = prisma.interview.update as any;

      mockFindUnique.mockResolvedValueOnce({
        id: "interview-123",
        status: "pending",
        startedAt: null,
      });
      mockUpdate.mockResolvedValueOnce({
        id: "interview-123",
        status: "in_progress",
      });

      await startInterview("long-token-value-here");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { token: "long-token-value-here" },
        select: {
          id: true,
          status: true,
          startedAt: true,
        },
      });
    });

    it("returns existing startedAt when already started", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.interview.findUnique as any;

      const existingDate = new Date("2025-01-01T10:00:00Z");
      mockFindUnique.mockResolvedValueOnce({
        id: "interview-123",
        status: "in_progress",
        startedAt: existingDate,
      });

      const result = await startInterview("test-token");

      expect(result.success).toBe(true);
      expect(result.startedAt).toBe(existingDate.toISOString());
    });

    it("uses correct select clause", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.interview.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      try {
        await startInterview("token123");
      } catch (error) {
        // Error expected
      }

      const callArg = mockFindUnique.mock.calls[0][0];
      expect(callArg.select).toEqual({
        id: true,
        status: true,
        startedAt: true,
      });
    });
  });

  describe("deleteInterview", () => {
    it("deletes interview by id", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockDelete = prisma.interview.delete as any;
      const mockFindUnique = prisma.interview.findUnique as any;

      mockFindUnique.mockResolvedValueOnce({
        quizId: "quiz-123",
        quiz: { createdBy: "user-123" },
      });

      mockDelete.mockResolvedValueOnce({ id: "interview-123" });

      const result = await deleteInterview("interview-123");

      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: "interview-123" },
      });
      expect(result.success).toBe(true);
    });

    it("throws error when interview not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.interview.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      await expect(deleteInterview("invalid-id")).rejects.toThrow(
        "Interview not found or you don't have permission"
      );
    });

    it("handles database errors during deletion", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockDelete = prisma.interview.delete as any;
      const mockFindUnique = prisma.interview.findUnique as any;

      mockFindUnique.mockResolvedValueOnce({
        quizId: "quiz-123",
        quiz: { createdBy: "user-123" },
      });

      const dbError = new Error("Database constraint violation");
      mockDelete.mockRejectedValueOnce(dbError);

      await expect(deleteInterview("interview-123")).rejects.toThrow(
        "Database constraint violation"
      );
    });

    it("accepts various id formats", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockDelete = prisma.interview.delete as any;
      const mockFindUnique = prisma.interview.findUnique as any;

      mockFindUnique.mockResolvedValueOnce({
        quizId: "quiz-123",
        quiz: { createdBy: "user-123" },
      });

      mockDelete.mockResolvedValueOnce({ id: "uuid-style-id-here" });

      await deleteInterview("uuid-style-id-here");

      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: "uuid-style-id-here" },
      });
    });

    it("returns success response", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockDelete = prisma.interview.delete as any;
      const mockFindUnique = prisma.interview.findUnique as any;

      mockFindUnique.mockResolvedValueOnce({
        quizId: "quiz-123",
        quiz: { createdBy: "user-123" },
      });

      mockDelete.mockResolvedValueOnce({ id: "interview-123" });

      const result = await deleteInterview("interview-123");

      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
    });

    it("uses correct where clause structure for delete", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockDelete = prisma.interview.delete as any;
      const mockFindUnique = prisma.interview.findUnique as any;

      mockFindUnique.mockResolvedValueOnce({
        quizId: "quiz-123",
        quiz: { createdBy: "user-123" },
      });

      mockDelete.mockResolvedValueOnce({ id: "test-123" });

      await deleteInterview("test-123");

      const callArg = mockDelete.mock.calls[0][0];
      expect(callArg).toHaveProperty("where");
      expect(callArg.where).toHaveProperty("id");
      expect(callArg.where.id).toBe("test-123");
    });

    it("calls prisma delete method exactly once", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockDelete = prisma.interview.delete as any;
      const mockFindUnique = prisma.interview.findUnique as any;

      mockFindUnique.mockResolvedValueOnce({
        quizId: "quiz-123",
        quiz: { createdBy: "user-123" },
      });

      mockDelete.mockResolvedValueOnce({ id: "test" });

      await deleteInterview("test-123");

      expect(mockDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe("Integration", () => {
    it("startInterview and deleteInterview work with same id formats", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.interview.findUnique as any;
      const mockDelete = prisma.interview.delete as any;
      const mockUpdate = prisma.interview.update as any;

      mockFindUnique.mockResolvedValueOnce({
        id: "interview-123",
        status: "pending",
        startedAt: null,
      });

      mockUpdate.mockResolvedValueOnce({
        id: "interview-123",
        status: "in_progress",
        startedAt: new Date(),
      });

      // Start interview
      const result = await startInterview("test-token");
      expect(result.success).toBe(true);

      // Delete interview
      mockFindUnique.mockResolvedValueOnce({
        quizId: "quiz-123",
        quiz: { createdBy: "user-123" },
      });
      mockDelete.mockResolvedValueOnce({ id: "interview-123" });

      const deleteResult = await deleteInterview("interview-123");
      expect(deleteResult.success).toBe(true);

      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: "interview-123" },
      });
    });
  });
});
