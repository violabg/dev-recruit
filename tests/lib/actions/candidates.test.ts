import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyAsCandidateAction,
  createCandidateAction,
  deleteCandidateAction,
  updateCandidateAction,
} from "../../../lib/actions/candidates";

// Mock dependencies
vi.mock("../../../lib/prisma", () => {
  const prismaMock: Record<string, unknown> = {
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
    application: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    assessment: {
      count: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    evaluation: {
      findFirst: vi.fn(),
    },
    interview: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
  };
  prismaMock.$transaction = vi.fn((fn: (tx: unknown) => unknown) =>
    fn(prismaMock),
  );
  return { default: prismaMock };
});

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
  invalidateAssessmentCache: vi.fn(),
  invalidateInterviewCache: vi.fn(),
}));

vi.mock("../../../lib/services/logger", () => ({
  storageLogger: {
    error: vi.fn(),
  },
  logger: {
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

  describe("applyAsCandidateAction (public form)", () => {
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
        applications: [{ positionId: "pos-123" }],
      });

      const result = await applyAsCandidateAction(application());

      expect(result).toEqual({ success: true });
      expect(requireUser).not.toHaveBeenCalled();
      expect(prisma.candidate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: "Anna",
            createdBy: null,
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
        applications: [],
      });

      const result = await applyAsCandidateAction(application());

      expect(JSON.stringify(result)).not.toContain("cand-9");
    });

    it("rejects a position that does not exist", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      (prisma.position.findMany as any).mockResolvedValueOnce([]);

      const result = await applyAsCandidateAction(application());

      expect(result).toEqual({
        success: false,
        error: "Una o più posizioni selezionate non sono valide",
      });
      expect(prisma.candidate.create).not.toHaveBeenCalled();
    });
  });

  describe("createCandidateAction", () => {
    it("creates candidate successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindMany = prisma.position.findMany as any;
      const mockCreate = prisma.candidate.create as any;

      mockFindMany.mockResolvedValueOnce([{ id: "pos-123" }]);
      mockCreate.mockResolvedValueOnce({
        id: "cand-123",
        applications: [{ positionId: "pos-123" }],
      });

      const formData = new FormData();
      formData.append("firstName", "Mario");
      formData.append("lastName", "Rossi");
      formData.append("email", "mario.rossi@example.com");
      formData.append("positionIds", JSON.stringify(["pos-123"]));

      const result = await createCandidateAction(formData);

      expect(result).toEqual({ success: true, candidateId: "cand-123" });
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: "Mario",
          lastName: "Rossi",
          email: "mario.rossi@example.com",
        }),
        select: { id: true },
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

      expect(await createCandidateAction(formData)).toMatchObject({ success: false });
    });

    it("creates candidate with date of birth", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindMany = prisma.position.findMany as any;
      const mockCreate = prisma.candidate.create as any;

      mockFindMany.mockResolvedValueOnce([{ id: "pos-123" }]);
      mockCreate.mockResolvedValueOnce({
        id: "cand-123",
        applications: [{ positionId: "pos-123" }],
      });

      const formData = new FormData();
      formData.append("firstName", "Mario");
      formData.append("lastName", "Rossi");
      formData.append("email", "mario@example.com");
      formData.append("positionIds", JSON.stringify(["pos-123"]));
      formData.append("dateOfBirth", "1990-01-15");

      await createCandidateAction(formData);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dateOfBirth: new Date("1990-01-15"),
        }),
        select: { id: true },
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
        applications: [{ positionId: "pos-123" }],
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

      await createCandidateAction(formData);

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
        applications: [{ positionId: "pos-123" }],
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

      expect(await createCandidateAction(formData)).toMatchObject({ success: false });
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
        applications: [{ positionId: "pos-123" }],
      });

      const formData = new FormData();
      formData.append("firstName", "Mario");
      formData.append("lastName", "Rossi");
      formData.append("email", "mario@example.com");
      formData.append("positionIds", JSON.stringify(["pos-123"]));

      await createCandidateAction(formData);

      expect(invalidateCandidateCache).toHaveBeenCalledWith({
        candidateId: "cand-123",
        positionIds: ["pos-123"],
      });
    });
  });

  describe("updateCandidateAction", () => {
    it("updates candidate successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.candidate.findUnique as any;
      const mockUpdate = prisma.candidate.update as any;

      mockFindUnique.mockResolvedValueOnce({
        resumeUrl: null,
        applications: [{ positionId: "pos-123" }],
      });
      mockUpdate.mockResolvedValueOnce({ id: "cand-123" });

      const formData = new FormData();
      formData.append("firstName", "Luigi");
      formData.append("lastName", "Verdi");

      const result = await updateCandidateAction("cand-123", formData);

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

      expect(await updateCandidateAction("invalid-id", formData)).toMatchObject({ success: false });
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
        applications: [{ positionId: "pos-old" }],
      });
      const mockFindMany = prisma.position.findMany as any;
      mockFindMany.mockResolvedValueOnce([{ id: "pos-new" }]);
      mockUpdate.mockResolvedValueOnce({ id: "cand-123" });
      // The old application holds no evidence: the diff deletes it
      (prisma.application.findMany as any).mockResolvedValueOnce([
        {
          id: "app-old",
          candidateId: "cand-123",
          positionId: "pos-old",
          stage: "applied",
        },
      ]);
      (prisma.application.create as any).mockResolvedValueOnce({
        id: "app-new",
      });
      (prisma.assessment.count as any).mockResolvedValueOnce(0);
      (prisma.evaluation.findFirst as any).mockResolvedValueOnce(null);

      const formData = new FormData();
      formData.append("positionIds", JSON.stringify(["pos-new"]));

      await updateCandidateAction("cand-123", formData);

      expect(invalidateCandidateCache).toHaveBeenCalledWith({
        candidateId: "cand-123",
        positionIds: ["pos-new", "pos-old"],
        applicationIds: ["app-new"],
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
        applications: [{ positionId: "pos-123" }],
      });
      mockUpdate.mockResolvedValueOnce({ id: "cand-123" });

      const mockFile = new File(["new resume"], "new-resume.pdf", {
        type: "application/pdf",
      });
      const formData = new FormData();
      formData.append("resumeFile", mockFile);

      await updateCandidateAction("cand-123", formData);

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
        applications: [{ positionId: "pos-123" }],
      });
      mockUpdate.mockResolvedValueOnce({ id: "cand-123" });

      const formData = new FormData();
      formData.append("removeResume", "true");

      await updateCandidateAction("cand-123", formData);

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
        applications: [{ positionId: "pos-123" }],
      });

      const formData = new FormData();

      const result = await updateCandidateAction("cand-123", formData);

      expect(result.success).toBe(false);
    });
  });

  describe("deleteCandidateAction", () => {
    it("deletes candidate successfully", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { redirect } = await import("next/navigation");
      const mockFindUnique = prisma.candidate.findUnique as any;
      const mockDelete = prisma.candidate.delete as any;

      mockFindUnique.mockResolvedValueOnce({
        resumeUrl: null,
        applications: [{ positionId: "pos-123" }],
      });
      mockDelete.mockResolvedValueOnce({ id: "cand-123" });

      await deleteCandidateAction("cand-123");

      expect(mockDelete).toHaveBeenCalledWith({ where: { id: "cand-123" } });
      expect(redirect).toHaveBeenCalledWith("/dashboard/candidates");
    });

    it("throws error when candidate not found", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const mockFindUnique = prisma.candidate.findUnique as any;

      mockFindUnique.mockResolvedValueOnce(null);

      expect(await deleteCandidateAction("invalid-id")).toMatchObject({ success: false });
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
        applications: [{ positionId: "pos-123" }],
      });
      mockDelete.mockResolvedValueOnce({ id: "cand-123" });

      await deleteCandidateAction("cand-123");

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
        applications: [{ positionId: "pos-123" }],
      });
      (deleteResumeFromR2 as any).mockRejectedValueOnce(new Error("S3 error"));
      mockDelete.mockResolvedValueOnce({ id: "cand-123" });

      await deleteCandidateAction("cand-123");

      expect(storageLogger.error).toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalled();
    });

    it("invalidates cache after deletion", async () => {
      const { default: prisma } = await import("../../../lib/prisma");
      const { invalidateCandidateCache } = await import(
        "../../../lib/utils/cache-utils"
      );
      const mockFindUnique = prisma.candidate.findUnique as any;
      const mockDelete = prisma.candidate.delete as any;

      mockFindUnique.mockResolvedValueOnce({
        resumeUrl: null,
        applications: [{ positionId: "pos-123" }],
      });
      mockDelete.mockResolvedValueOnce({ id: "cand-123" });

      await deleteCandidateAction("cand-123");

      // deleted: true cascades to assessments, evaluations and interviews
      expect(invalidateCandidateCache).toHaveBeenCalledWith({
        candidateId: "cand-123",
        positionIds: ["pos-123"],
        deleted: true,
      });
    });
  });
});

describe("candidates actions — applications, email and public form", () => {
  const form = (values: Record<string, string>, file?: File) => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      formData.append(key, value);
    }
    if (file) formData.append("resumeFile", file);
    return formData;
  };

  const applyForm = (file?: File) =>
    form(
      {
        firstName: "Anna",
        lastName: "Bianchi",
        email: "anna@example.com",
        positionIds: JSON.stringify(["pos-open"]),
      },
      file,
    );

  const resume = () =>
    new File(["cv"], "cv.pdf", { type: "application/pdf" });

  const getMocks = async () => {
    const { default: prisma } = await import("../../../lib/prisma");
    const cache = await import("../../../lib/utils/cache-utils");
    const storage = await import("../../../lib/services/r2-storage");
    return { prisma: prisma as any, cache, storage };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCandidateAction", () => {
    it("normalises the email", async () => {
      const { prisma } = await getMocks();
      prisma.position.findMany.mockResolvedValueOnce([{ id: "pos-1" }]);
      prisma.candidate.create.mockResolvedValueOnce({ id: "cand-1" });

      await createCandidateAction(
        form({
          firstName: "Mario",
          lastName: "Rossi",
          email: "  Mario@Example.COM ",
          positionIds: JSON.stringify(["pos-1"]),
        }),
      );

      expect(prisma.candidate.findUnique).toHaveBeenCalledWith({
        where: { email: "mario@example.com" },
        select: { id: true },
      });
      expect(prisma.candidate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: "mario@example.com" }),
        }),
      );
    });

    it("refuses an email that already exists", async () => {
      const { prisma } = await getMocks();
      prisma.candidate.findUnique.mockResolvedValueOnce({ id: "other" });

      const result = await createCandidateAction(
        form({
          firstName: "Mario",
          lastName: "Rossi",
          email: "mario@example.com",
          positionIds: JSON.stringify(["pos-1"]),
        }),
      );

      expect(result).toEqual({
        success: false,
        error: "Esiste già un candidato con questa email",
      });
      expect(prisma.candidate.create).not.toHaveBeenCalled();
    });

    it("creates the applications owned by the user, without status or primary", async () => {
      const { prisma } = await getMocks();
      prisma.position.findMany.mockResolvedValueOnce([
        { id: "pos-1" },
        { id: "pos-2" },
      ]);
      prisma.candidate.create.mockResolvedValueOnce({ id: "cand-1" });

      await createCandidateAction(
        form({
          firstName: "Mario",
          lastName: "Rossi",
          email: "mario@example.com",
          positionIds: JSON.stringify(["pos-1", "pos-2"]),
        }),
      );

      const { data } = prisma.candidate.create.mock.calls[0][0];
      expect(data.applications).toEqual({
        create: [
          { positionId: "pos-1", ownerId: "user-123" },
          { positionId: "pos-2", ownerId: "user-123" },
        ],
      });
      expect(data).not.toHaveProperty("status");
      expect(JSON.stringify(data)).not.toContain("isPrimary");
    });
  });

  describe("applyAsCandidateAction", () => {
    it("accepts only open positions", async () => {
      const { prisma } = await getMocks();
      prisma.position.findMany.mockResolvedValueOnce([{ id: "pos-open" }]);
      prisma.candidate.create.mockResolvedValueOnce({ id: "cand-new" });

      await applyAsCandidateAction(applyForm());

      expect(prisma.position.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["pos-open"] }, status: "open" },
        select: { id: true },
      });
    });

    it("creates a new candidate without creator for an unknown email", async () => {
      const { prisma, cache } = await getMocks();
      prisma.position.findMany.mockResolvedValueOnce([{ id: "pos-open" }]);
      prisma.candidate.findUnique.mockResolvedValueOnce(null);
      prisma.candidate.create.mockResolvedValueOnce({ id: "cand-new" });

      const result = await applyAsCandidateAction(applyForm());

      expect(result).toEqual({ success: true });
      expect(prisma.candidate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: "anna@example.com",
          createdBy: null,
          applications: { create: [{ positionId: "pos-open" }] },
        }),
        select: { id: true },
      });
      expect(cache.invalidateCandidateCache).toHaveBeenCalledWith({
        candidateId: "cand-new",
        positionIds: ["pos-open"],
      });
    });

    it("attaches a new position to a known email and replaces the CV", async () => {
      const { prisma, cache, storage } = await getMocks();
      prisma.position.findMany.mockResolvedValueOnce([{ id: "pos-open" }]);
      prisma.candidate.findUnique.mockResolvedValueOnce({
        id: "cand-known",
        resumeUrl: "https://r2.example.com/old.pdf",
        applications: [{ positionId: "pos-other" }],
      });
      const file = resume();

      const result = await applyAsCandidateAction(applyForm(file));

      expect(result).toEqual({ success: true });
      expect(prisma.candidate.create).not.toHaveBeenCalled();
      // The application is added, the name is never touched
      expect(prisma.candidate.update).toHaveBeenCalledWith({
        where: { id: "cand-known" },
        data: { applications: { create: [{ positionId: "pos-open" }] } },
      });
      for (const [args] of prisma.candidate.update.mock.calls) {
        expect(args.data).not.toHaveProperty("firstName");
        expect(args.data).not.toHaveProperty("lastName");
        expect(args.data).not.toHaveProperty("dateOfBirth");
      }
      expect(storage.uploadResumeToR2).toHaveBeenCalledWith(file, "cand-known");
      expect(prisma.candidate.update).toHaveBeenCalledWith({
        where: { id: "cand-known" },
        data: { resumeUrl: "https://r2.example.com/resume.pdf" },
      });
      expect(storage.deleteResumeFromR2).toHaveBeenCalledWith(
        "https://r2.example.com/old.pdf",
      );
      expect(cache.invalidateCandidateCache).toHaveBeenCalledWith({
        candidateId: "cand-known",
        positionIds: ["pos-open"],
      });
    });

    it("writes nothing when the known candidate already applied", async () => {
      const { prisma, cache, storage } = await getMocks();
      prisma.position.findMany.mockResolvedValueOnce([{ id: "pos-open" }]);
      prisma.candidate.findUnique.mockResolvedValueOnce({
        id: "cand-known",
        resumeUrl: null,
        applications: [{ positionId: "pos-open" }],
      });

      const result = await applyAsCandidateAction(applyForm(resume()));

      expect(result).toEqual({ success: true });
      expect(prisma.candidate.create).not.toHaveBeenCalled();
      expect(prisma.candidate.update).not.toHaveBeenCalled();
      expect(storage.uploadResumeToR2).not.toHaveBeenCalled();
      expect(cache.invalidateCandidateCache).not.toHaveBeenCalled();
    });

    it("answers exactly the same in the three cases", async () => {
      const { prisma } = await getMocks();
      const results = [];

      prisma.position.findMany.mockResolvedValueOnce([{ id: "pos-open" }]);
      prisma.candidate.findUnique.mockResolvedValueOnce(null);
      prisma.candidate.create.mockResolvedValueOnce({ id: "cand-new" });
      results.push(await applyAsCandidateAction(applyForm()));

      prisma.position.findMany.mockResolvedValueOnce([{ id: "pos-open" }]);
      prisma.candidate.findUnique.mockResolvedValueOnce({
        id: "cand-known",
        resumeUrl: null,
        applications: [],
      });
      results.push(await applyAsCandidateAction(applyForm()));

      prisma.position.findMany.mockResolvedValueOnce([{ id: "pos-open" }]);
      prisma.candidate.findUnique.mockResolvedValueOnce({
        id: "cand-known",
        resumeUrl: null,
        applications: [{ positionId: "pos-open" }],
      });
      results.push(await applyAsCandidateAction(applyForm()));

      for (const result of results) {
        expect(result).toEqual({ success: true });
      }
    });

    it.each([
      ["unknown", null],
      ["known", { id: "cand-known", resumeUrl: null, applications: [] }],
    ])(
      "refuses a draft or closed position for an %s email",
      async (_kind, existing) => {
        const { prisma } = await getMocks();
        // The position exists but is not open: the status filter excludes it
        prisma.position.findMany.mockResolvedValueOnce([]);
        prisma.candidate.findUnique.mockResolvedValueOnce(existing);

        const result = await applyAsCandidateAction(applyForm());

        expect(result).toEqual({
          success: false,
          error: "Una o più posizioni selezionate non sono valide",
        });
        expect(prisma.candidate.findUnique).not.toHaveBeenCalled();
        expect(prisma.candidate.create).not.toHaveBeenCalled();
        expect(prisma.candidate.update).not.toHaveBeenCalled();
      },
    );

    it("refuses an invalid CV with the same answer for known and unknown emails", async () => {
      const { prisma, storage } = await getMocks();
      vi.mocked(storage.validateResumeFile).mockReturnValue({
        valid: false,
        error: "File non valido",
      } as any);

      prisma.position.findMany.mockResolvedValueOnce([{ id: "pos-open" }]);
      const unknown = await applyAsCandidateAction(applyForm(resume()));
      prisma.position.findMany.mockResolvedValueOnce([{ id: "pos-open" }]);
      const known = await applyAsCandidateAction(applyForm(resume()));

      expect(unknown).toEqual({ success: false, error: "File non valido" });
      expect(known).toEqual(unknown);
      expect(prisma.candidate.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("updateCandidateAction", () => {
    const candidateRow = (applications: { positionId: string }[]) => ({
      email: "mario@example.com",
      resumeUrl: null,
      applications,
    });

    it("applies the positions as a diff in a transaction, owned by the user", async () => {
      const { prisma, cache } = await getMocks();
      prisma.candidate.findUnique.mockResolvedValueOnce(
        candidateRow([{ positionId: "pos-keep" }]),
      );
      prisma.position.findMany.mockResolvedValueOnce([
        { id: "pos-keep" },
        { id: "pos-new" },
      ]);
      prisma.application.findMany.mockResolvedValueOnce([
        {
          id: "app-keep",
          candidateId: "cand-1",
          positionId: "pos-keep",
          stage: "screening",
        },
      ]);
      prisma.application.create.mockResolvedValueOnce({ id: "app-new" });

      const result = await updateCandidateAction(
        "cand-1",
        form({ positionIds: JSON.stringify(["pos-keep", "pos-new"]) }),
      );

      expect(result).toEqual({ success: true });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.application.create).toHaveBeenCalledWith({
        data: { candidateId: "cand-1", positionId: "pos-new", ownerId: "user-123" },
        select: { id: true },
      });
      expect(prisma.assessment.delete).not.toHaveBeenCalled();
      expect(prisma.assessment.deleteMany).not.toHaveBeenCalled();
      expect(cache.invalidateCandidateCache).toHaveBeenCalledWith({
        candidateId: "cand-1",
        positionIds: ["pos-new", "pos-keep"],
        applicationIds: ["app-new"],
      });
      expect(cache.invalidateAssessmentCache).not.toHaveBeenCalled();
    });

    it("refreshes the tests when a withdrawn application cancels some", async () => {
      const { prisma, cache } = await getMocks();
      prisma.candidate.findUnique.mockResolvedValueOnce(
        candidateRow([{ positionId: "pos-keep" }, { positionId: "pos-gone" }]),
      );
      prisma.position.findMany.mockResolvedValueOnce([{ id: "pos-keep" }]);
      prisma.application.findMany.mockResolvedValueOnce([
        { id: "app-keep", candidateId: "cand-1", positionId: "pos-keep", stage: "applied" },
        { id: "app-gone", candidateId: "cand-1", positionId: "pos-gone", stage: "assessment" },
      ]);
      prisma.assessment.count.mockResolvedValueOnce(1);
      prisma.application.findUnique.mockResolvedValueOnce({
        id: "app-gone",
        candidateId: "cand-1",
        positionId: "pos-gone",
        stage: "assessment",
      });
      prisma.assessment.findMany.mockResolvedValueOnce([{ id: "t-open" }]);

      await updateCandidateAction(
        "cand-1",
        form({ positionIds: JSON.stringify(["pos-keep"]) }),
      );

      expect(prisma.assessment.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["t-open"] } },
        data: { status: "cancelled" },
      });
      expect(prisma.assessment.deleteMany).not.toHaveBeenCalled();
      expect(cache.invalidateCandidateCache).toHaveBeenCalledWith({
        candidateId: "cand-1",
        positionIds: ["pos-gone", "pos-keep"],
        applicationIds: ["app-gone"],
      });
      expect(cache.invalidateAssessmentCache).toHaveBeenCalled();
      expect(cache.invalidateInterviewCache).not.toHaveBeenCalled();
    });

    it("refreshes the interviews when a withdrawn application cancels some", async () => {
      const { prisma, cache } = await getMocks();
      prisma.candidate.findUnique.mockResolvedValueOnce(
        candidateRow([{ positionId: "pos-keep" }, { positionId: "pos-gone" }]),
      );
      prisma.position.findMany.mockResolvedValueOnce([{ id: "pos-keep" }]);
      prisma.application.findMany.mockResolvedValueOnce([
        { id: "app-keep", candidateId: "cand-1", positionId: "pos-keep", stage: "applied" },
        { id: "app-gone", candidateId: "cand-1", positionId: "pos-gone", stage: "interview" },
      ]);
      // Evidence: only an interview
      prisma.assessment.count.mockResolvedValueOnce(0);
      prisma.interview.count.mockResolvedValueOnce(1);
      prisma.application.findUnique.mockResolvedValueOnce({
        id: "app-gone",
        candidateId: "cand-1",
        positionId: "pos-gone",
        stage: "interview",
      });
      prisma.assessment.findMany.mockResolvedValueOnce([]);
      prisma.interview.findMany.mockResolvedValueOnce([{ id: "int-1" }]);

      await updateCandidateAction(
        "cand-1",
        form({ positionIds: JSON.stringify(["pos-keep"]) }),
      );

      expect(prisma.application.delete).not.toHaveBeenCalled();
      expect(prisma.interview.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["int-1"] } },
        data: { status: "cancelled" },
      });
      expect(cache.invalidateInterviewCache).toHaveBeenCalledWith({
        applicationId: "app-gone",
      });
    });

    it("refuses the email of another candidate", async () => {
      const { prisma } = await getMocks();
      prisma.candidate.findUnique
        .mockResolvedValueOnce(candidateRow([]))
        .mockResolvedValueOnce({ id: "cand-other" });

      const result = await updateCandidateAction(
        "cand-1",
        form({ email: "Taken@Example.com" }),
      );

      expect(result).toEqual({
        success: false,
        error: "Esiste già un candidato con questa email",
      });
      expect(prisma.candidate.findUnique).toHaveBeenLastCalledWith({
        where: { email: "taken@example.com" },
        select: { id: true },
      });
      expect(prisma.candidate.update).not.toHaveBeenCalled();
    });

    it("stores Non ricontattare with its note", async () => {
      const { prisma } = await getMocks();
      prisma.candidate.findUnique.mockResolvedValueOnce(candidateRow([]));

      await updateCandidateAction(
        "cand-1",
        form({ doNotContact: "true", doNotContactNote: "Ha rifiutato due volte" }),
      );

      expect(prisma.candidate.update).toHaveBeenCalledWith({
        where: { id: "cand-1" },
        data: { doNotContact: true, doNotContactNote: "Ha rifiutato due volte" },
      });
    });

    it("clears the note when Non ricontattare is switched off", async () => {
      const { prisma } = await getMocks();
      prisma.candidate.findUnique.mockResolvedValueOnce(candidateRow([]));

      await updateCandidateAction(
        "cand-1",
        form({ doNotContact: "false", doNotContactNote: "vecchia nota" }),
      );

      expect(prisma.candidate.update).toHaveBeenCalledWith({
        where: { id: "cand-1" },
        data: { doNotContact: false, doNotContactNote: null },
      });
    });

    it("ignores a status key", async () => {
      const { prisma } = await getMocks();
      prisma.candidate.findUnique.mockResolvedValueOnce(candidateRow([]));

      await updateCandidateAction(
        "cand-1",
        form({ firstName: "Luigi", status: "hired" }),
      );

      expect(prisma.candidate.update).toHaveBeenCalledWith({
        where: { id: "cand-1" },
        data: { firstName: "Luigi" },
      });
    });
  });
});
