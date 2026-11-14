import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyAsCandidate,
  createCandidate,
  deleteCandidate,
  updateCandidate,
} from "../../../lib/actions/candidates";

// Mock dependencies
vi.mock("../../../lib/prisma", () => ({
  default: {
    position: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    candidate: {
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

vi.mock("../../../lib/services/r2-storage", () => ({
  uploadResumeToR2: vi.fn(() =>
    Promise.resolve("https://r2.example.com/resume.pdf")
  ),
  deleteResumeFromR2: vi.fn(() => Promise.resolve()),
  validateResumeFile: vi.fn(() => ({ valid: true })),
}));

vi.mock("../../../lib/utils/cache-utils", () => ({
  invalidateCandidateCache: vi.fn(),
  invalidateInterviewCache: vi.fn(),
}));

vi.mock("../../../lib/services/logger", () => ({
  storageLogger: {
    error: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  unstable_rethrow: vi.fn(),
}));

describe("candidates actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("applyAsCandidate (public form)", () => {
    const application = () => {
      const formData = new FormData();
      formData.append("firstName", "Anna");
      formData.append("lastName", "Bianchi");
      formData.append("email", "anna@example.com");
      formData.append("positionIds", JSON.stringify(["pos-123"]));
      return formData;
    };

    it("creates the candidate without a signed-in user", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { requireUser } = await import("../../../lib/auth-server");
      (prisma.position.findMany as any).mockResolvedValueOnce([
        { id: "pos-123" },
      ]);
      (prisma.candidate.create as any).mockResolvedValueOnce({
        id: "cand-9",
        positions: [{ positionId: "pos-123" }],
      });

      const result = await applyAsCandidate(application());

      expect(result).toEqual({ success: true });
      expect(requireUser).not.toHaveBeenCalled();
      expect(prisma.candidate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: "Anna",
            createdBy: null,
            status: "pending",
          }),
        }),
      );
    });

    it("does not reveal the new candidate id to the applicant", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      (prisma.position.findMany as any).mockResolvedValueOnce([
        { id: "pos-123" },
      ]);
      (prisma.candidate.create as any).mockResolvedValueOnce({
        id: "cand-9",
        positions: [],
      });

      const result = await applyAsCandidate(application());

      expect(JSON.stringify(result)).not.toContain("cand-9");
    });

    it("rejects a position that does not exist", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      (prisma.position.findMany as any).mockResolvedValueOnce([]);

      const result = await applyAsCandidate(application());

      expect(result).toEqual({
        success: false,
        error: "Una o più posizioni selezionate non sono valide",
      });
      expect(prisma.candidate.create).not.toHaveBeenCalled();
    });
  });

  describe("createCandidate", () => {
    it("creates candidate successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindMany = prisma.position.findMany as any;
      const mockCreate = prisma.candidate.create as any;

      mockFindMany.mockResolvedValueOnce([{ id: "pos-123" }]);
      mockCreate.mockResolvedValueOnce({
        id: "cand-123",
        positions: [{ positionId: "pos-123" }],
      });

      const formData = new FormData();
      formData.append("firstName", "Mario");
      formData.append("lastName", "Rossi");
      formData.append("email", "mario.rossi@example.com");
      formData.append("positionIds", JSON.stringify(["pos-123"]));

      const result = await createCandidate(formData);

      expect(result).toEqual({ success: true, candidateId: "cand-123" });
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: "Mario",
          lastName: "Rossi",
          email: "mario.rossi@example.com",
          status: "pending",
        }),
        select: { id: true, positions: { select: { positionId: true } } },
      });
    });

    it("throws error when position not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindMany = prisma.position.findMany as any;

      mockFindMany.mockResolvedValueOnce([]);

      const formData = new FormData();
      formData.append("firstName", "Mario");
      formData.append("lastName", "Rossi");
      formData.append("email", "mario@example.com");
      formData.append("positionIds", JSON.stringify(["invalid-id"]));

      expect(await createCandidate(formData)).toMatchObject({ success: false });
    });

    it("creates candidate with date of birth", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindMany = prisma.position.findMany as any;
      const mockCreate = prisma.candidate.create as any;

      mockFindMany.mockResolvedValueOnce([{ id: "pos-123" }]);
      mockCreate.mockResolvedValueOnce({
        id: "cand-123",
        positions: [{ positionId: "pos-123" }],
      });

      const formData = new FormData();
      formData.append("firstName", "Mario");
      formData.append("lastName", "Rossi");
      formData.append("email", "mario@example.com");
      formData.append("positionIds", JSON.stringify(["pos-123"]));
      formData.append("dateOfBirth", "1990-01-15");

      await createCandidate(formData);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dateOfBirth: new Date("1990-01-15"),
        }),
        select: { id: true, positions: { select: { positionId: true } } },
      });
    });

    it("handles resume file upload", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { uploadResumeToR2, validateResumeFile } = await import(
        "../../../lib/services/r2-storage"
      );
      const mockFindMany = prisma.position.findMany as any;
      const mockCreate = prisma.candidate.create as any;
      const mockUpdate = prisma.candidate.update as any;

      mockFindMany.mockResolvedValueOnce([{ id: "pos-123" }]);
      mockCreate.mockResolvedValueOnce({
        id: "cand-123",
        positions: [{ positionId: "pos-123" }],
      });
      mockUpdate.mockResolvedValueOnce({ id: "cand-123" });

      const mockFile = new File(["resume content"], "resume.pdf", {
        type: "application/pdf",
      });
      const formData = new FormData();
      formData.append("firstName", "Mario");
      formData.append("lastName", "Rossi");
      formData.append("email", "mario@example.com");
      formData.append("positionIds", JSON.stringify(["pos-123"]));
      formData.append("resumeFile", mockFile);

      await createCandidate(formData);

      expect(validateResumeFile).toHaveBeenCalledWith(mockFile);
      expect(uploadResumeToR2).toHaveBeenCalledWith(mockFile, "cand-123");
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "cand-123" },
        data: { resumeUrl: "https://r2.example.com/resume.pdf" },
      });
    });

    it("deletes candidate if file validation fails", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { validateResumeFile } = await import(
        "../../../lib/services/r2-storage"
      );
      const mockFindMany = prisma.position.findMany as any;
      const mockCreate = prisma.candidate.create as any;
      const mockDelete = prisma.candidate.delete as any;

      mockFindMany.mockResolvedValueOnce([{ id: "pos-123" }]);
      mockCreate.mockResolvedValueOnce({
        id: "cand-123",
        positions: [{ positionId: "pos-123" }],
      });

      (validateResumeFile as any).mockReturnValueOnce({
        valid: false,
        error: "File too large",
      });

      const mockFile = new File(["x".repeat(11 * 1024 * 1024)], "resume.pdf", {
        type: "application/pdf",
      });
      const formData = new FormData();
      formData.append("firstName", "Mario");
      formData.append("lastName", "Rossi");
      formData.append("email", "mario@example.com");
      formData.append("positionIds", JSON.stringify(["pos-123"]));
      formData.append("resumeFile", mockFile);

      expect(await createCandidate(formData)).toMatchObject({ success: false });
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: "cand-123" } });
    });

    it("invalidates cache after creation", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidateCandidateCache } = await import(
        "../../../lib/utils/cache-utils"
      );
      const mockFindMany = prisma.position.findMany as any;
      const mockCreate = prisma.candidate.create as any;

      mockFindMany.mockResolvedValueOnce([{ id: "pos-123" }]);
      mockCreate.mockResolvedValueOnce({
        id: "cand-123",
        positions: [{ positionId: "pos-123" }],
      });

      const formData = new FormData();
      formData.append("firstName", "Mario");
      formData.append("lastName", "Rossi");
      formData.append("email", "mario@example.com");
      formData.append("positionIds", JSON.stringify(["pos-123"]));

      await createCandidate(formData);

      expect(invalidateCandidateCache).toHaveBeenCalledWith({
        candidateId: "cand-123",
        positionIds: ["pos-123"],
      });
    });
  });

  describe("updateCandidate", () => {
    it("updates candidate successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.candidate.findUnique as any;
      const mockUpdate = prisma.candidate.update as any;

      mockFindUnique.mockResolvedValueOnce({
        resumeUrl: null,
        positions: [{ positionId: "pos-123" }],
      });
      mockUpdate.mockResolvedValueOnce({ id: "cand-123" });

      const formData = new FormData();
      formData.append("firstName", "Luigi");
      formData.append("lastName", "Verdi");

      const result = await updateCandidate("cand-123", formData);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "cand-123" },
        data: expect.objectContaining({
          firstName: "Luigi",
          lastName: "Verdi",
        }),
      });
    });

    it("throws error when candidate not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.candidate.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      const formData = new FormData();
      formData.append("firstName", "Luigi");

      expect(await updateCandidate("invalid-id", formData)).toMatchObject({ success: false });
    });

    it("updates position and invalidates both caches", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidateCandidateCache } = await import(
        "../../../lib/utils/cache-utils"
      );
      const mockCandidateFindUnique = prisma.candidate.findUnique as any;
      const mockUpdate = prisma.candidate.update as any;

      mockCandidateFindUnique.mockResolvedValueOnce({
        resumeUrl: null,
        positions: [{ positionId: "pos-old" }],
      });
      const mockFindMany = prisma.position.findMany as any;
      mockFindMany.mockResolvedValueOnce([{ id: "pos-new" }]);
      mockUpdate.mockResolvedValueOnce({ id: "cand-123" });

      const formData = new FormData();
      formData.append("positionIds", JSON.stringify(["pos-new"]));

      await updateCandidate("cand-123", formData);

      expect(invalidateCandidateCache).toHaveBeenCalledWith({
        candidateId: "cand-123",
        positionIds: ["pos-old", "pos-new"],
      });
    });

    it("handles resume file replacement", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { uploadResumeToR2, deleteResumeFromR2 } = await import(
        "../../../lib/services/r2-storage"
      );
      const mockFindUnique = prisma.candidate.findUnique as any;
      const mockUpdate = prisma.candidate.update as any;

      mockFindUnique.mockResolvedValueOnce({
        resumeUrl: "https://r2.example.com/old-resume.pdf",
        positions: [{ positionId: "pos-123" }],
      });
      mockUpdate.mockResolvedValueOnce({ id: "cand-123" });

      const mockFile = new File(["new resume"], "new-resume.pdf", {
        type: "application/pdf",
      });
      const formData = new FormData();
      formData.append("resumeFile", mockFile);

      await updateCandidate("cand-123", formData);

      expect(deleteResumeFromR2).toHaveBeenCalledWith(
        "https://r2.example.com/old-resume.pdf"
      );
      expect(uploadResumeToR2).toHaveBeenCalledWith(mockFile, "cand-123");
    });

    it("handles resume removal", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { deleteResumeFromR2 } = await import(
        "../../../lib/services/r2-storage"
      );
      const mockFindUnique = prisma.candidate.findUnique as any;
      const mockUpdate = prisma.candidate.update as any;

      mockFindUnique.mockResolvedValueOnce({
        resumeUrl: "https://r2.example.com/resume.pdf",
        positions: [{ positionId: "pos-123" }],
      });
      mockUpdate.mockResolvedValueOnce({ id: "cand-123" });

      const formData = new FormData();
      formData.append("removeResume", "true");

      await updateCandidate("cand-123", formData);

      expect(deleteResumeFromR2).toHaveBeenCalledWith(
        "https://r2.example.com/resume.pdf"
      );
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "cand-123" },
        data: expect.objectContaining({
          resumeUrl: null,
        }),
      });
    });

    it("returns false when no changes", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.candidate.findUnique as any;

      mockFindUnique.mockResolvedValueOnce({
        resumeUrl: null,
        positions: [{ positionId: "pos-123" }],
      });

      const formData = new FormData();

      const result = await updateCandidate("cand-123", formData);

      expect(result.success).toBe(false);
    });
  });

  describe("deleteCandidate", () => {
    it("deletes candidate successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { redirect } = await import("next/navigation");
      const mockFindUnique = prisma.candidate.findUnique as any;
      const mockDelete = prisma.candidate.delete as any;

      mockFindUnique.mockResolvedValueOnce({
        resumeUrl: null,
        positions: [{ positionId: "pos-123" }],
      });
      mockDelete.mockResolvedValueOnce({ id: "cand-123" });

      await deleteCandidate("cand-123");

      expect(mockDelete).toHaveBeenCalledWith({ where: { id: "cand-123" } });
      expect(redirect).toHaveBeenCalledWith("/dashboard/candidates");
    });

    it("throws error when candidate not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.candidate.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      expect(await deleteCandidate("invalid-id")).toMatchObject({ success: false });
    });

    it("deletes resume file before deleting candidate", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { deleteResumeFromR2 } = await import(
        "../../../lib/services/r2-storage"
      );
      const mockFindUnique = prisma.candidate.findUnique as any;
      const mockDelete = prisma.candidate.delete as any;

      mockFindUnique.mockResolvedValueOnce({
        resumeUrl: "https://r2.example.com/resume.pdf",
        positions: [{ positionId: "pos-123" }],
      });
      mockDelete.mockResolvedValueOnce({ id: "cand-123" });

      await deleteCandidate("cand-123");

      expect(deleteResumeFromR2).toHaveBeenCalledWith(
        "https://r2.example.com/resume.pdf"
      );
      expect(mockDelete).toHaveBeenCalled();
    });

    it("continues deletion even if resume deletion fails", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { deleteResumeFromR2 } = await import(
        "../../../lib/services/r2-storage"
      );
      const { storageLogger } = await import("../../../lib/services/logger");
      const mockFindUnique = prisma.candidate.findUnique as any;
      const mockDelete = prisma.candidate.delete as any;

      mockFindUnique.mockResolvedValueOnce({
        resumeUrl: "https://r2.example.com/resume.pdf",
        positions: [{ positionId: "pos-123" }],
      });
      (deleteResumeFromR2 as any).mockRejectedValueOnce(new Error("S3 error"));
      mockDelete.mockResolvedValueOnce({ id: "cand-123" });

      await deleteCandidate("cand-123");

      expect(storageLogger.error).toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalled();
    });

    it("invalidates cache after deletion", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidateCandidateCache, invalidateInterviewCache } =
        await import("../../../lib/utils/cache-utils");
      const mockFindUnique = prisma.candidate.findUnique as any;
      const mockDelete = prisma.candidate.delete as any;

      mockFindUnique.mockResolvedValueOnce({
        resumeUrl: null,
        positions: [{ positionId: "pos-123" }],
      });
      mockDelete.mockResolvedValueOnce({ id: "cand-123" });

      await deleteCandidate("cand-123");

      // deleted: true cascades to interviews/evaluations/rubrics
      expect(invalidateCandidateCache).toHaveBeenCalledWith({
        candidateId: "cand-123",
        positionIds: ["pos-123"],
        deleted: true,
      });
    });
  });
});
