/**
 * Tests for R2 Storage Service
 *
 * Note: Tests for upload/delete functions are limited because they use
 * dynamic require('../env') which is difficult to mock in Vitest.
 * The validateResumeFile function is fully tested as it has no env dependency.
 */

import { validateResumeFile } from "@/lib/services/r2-storage";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  extractKeyFromResumeUrl,
  resumePublicUrl,
} from "@/lib/services/r2-storage";

// Mock AWS SDK
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/services/logger", () => ({
  storageLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe("r2-storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateResumeFile", () => {
    it("should accept valid PDF file", () => {
      const file = new File(["content"], "resume.pdf", {
        type: "application/pdf",
      });

      const result = validateResumeFile(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept valid DOC file", () => {
      const file = new File(["content"], "resume.doc", {
        type: "application/msword",
      });

      const result = validateResumeFile(file);

      expect(result.valid).toBe(true);
    });

    it("should accept valid DOCX file", () => {
      const file = new File(["content"], "resume.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const result = validateResumeFile(file);

      expect(result.valid).toBe(true);
    });

    it("should accept file by extension when type is empty", () => {
      const file = new File(["content"], "resume.pdf", { type: "" });

      const result = validateResumeFile(file);

      expect(result.valid).toBe(true);
    });

    it("should accept DOC file by extension when type is empty", () => {
      const file = new File(["content"], "resume.doc", { type: "" });

      const result = validateResumeFile(file);

      expect(result.valid).toBe(true);
    });

    it("should accept DOCX file by extension when type is empty", () => {
      const file = new File(["content"], "resume.docx", { type: "" });

      const result = validateResumeFile(file);

      expect(result.valid).toBe(true);
    });

    it("should reject file larger than 10MB", () => {
      // Create a file object with a large size (11MB)
      const largeContent = new Uint8Array(11 * 1024 * 1024);
      const file = new File([largeContent], "large-resume.pdf", {
        type: "application/pdf",
      });

      const result = validateResumeFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("troppo grande");
      expect(result.error).toContain("10MB");
    });

    it("should accept file at exactly 10MB", () => {
      const exactContent = new Uint8Array(10 * 1024 * 1024);
      const file = new File([exactContent], "resume.pdf", {
        type: "application/pdf",
      });

      const result = validateResumeFile(file);

      expect(result.valid).toBe(true);
    });

    it("should reject unsupported file types", () => {
      const file = new File(["content"], "resume.txt", {
        type: "text/plain",
      });

      const result = validateResumeFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Formato file non supportato");
    });

    it("should reject image files", () => {
      const file = new File(["content"], "resume.jpg", {
        type: "image/jpeg",
      });

      const result = validateResumeFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Formato file non supportato");
    });

    it("should reject PNG files", () => {
      const file = new File(["content"], "resume.png", {
        type: "image/png",
      });

      const result = validateResumeFile(file);

      expect(result.valid).toBe(false);
    });

    it("should reject executable files", () => {
      const file = new File(["content"], "malware.exe", {
        type: "application/x-msdownload",
      });

      const result = validateResumeFile(file);

      expect(result.valid).toBe(false);
    });

    it("should reject zip files", () => {
      const file = new File(["content"], "archive.zip", {
        type: "application/zip",
      });

      const result = validateResumeFile(file);

      expect(result.valid).toBe(false);
    });

    it("should handle zero-byte file", () => {
      const file = new File([], "empty.pdf", {
        type: "application/pdf",
      });

      const result = validateResumeFile(file);

      expect(result.valid).toBe(true);
    });

    it("should handle file with uppercase extension", () => {
      const file = new File(["content"], "RESUME.PDF", {
        type: "application/pdf",
      });

      const result = validateResumeFile(file);

      expect(result.valid).toBe(true);
    });

    it("should handle file with mixed case extension when type is empty", () => {
      const file = new File(["content"], "resume.PdF", { type: "" });

      const result = validateResumeFile(file);

      expect(result.valid).toBe(true);
    });
  });

  describe("resumePublicUrl", () => {
    it("keeps a value that is already a URL", () => {
      expect(resumePublicUrl("https://files.example/resumes/cv.pdf")).toBe(
        "https://files.example/resumes/cv.pdf",
      );
    });

    it("turns a bare key into the public URL", () => {
      vi.stubEnv("R2_PUBLIC_URL", "https://files.example");
      expect(resumePublicUrl("resumes/cand1/cv.pdf")).toBe(
        "https://files.example/resumes/cand1/cv.pdf",
      );
      vi.unstubAllEnvs();
    });

    it("uses the r2.dev URL when no public base is set", () => {
      vi.stubEnv("R2_PUBLIC_URL", "");
      vi.stubEnv("R2_BUCKET_NAME", "bucket");
      vi.stubEnv("R2_ACCOUNT_ID", "account");
      expect(resumePublicUrl("/resumes/cv.pdf")).toBe(
        "https://bucket.account.r2.dev/resumes/cv.pdf",
      );
      vi.unstubAllEnvs();
    });
  });

  describe("extractKeyFromResumeUrl", () => {
    it("extracts the key from a public URL", () => {
      expect(
        extractKeyFromResumeUrl("https://files.example/resumes/cand1/cv.pdf"),
      ).toBe("resumes/cand1/cv.pdf");
    });

    it("returns a bare key unchanged", () => {
      expect(extractKeyFromResumeUrl("resumes/verifica-marco.pdf")).toBe(
        "resumes/verifica-marco.pdf",
      );
    });
  });

  describe("module exports", () => {
    it("should export validateResumeFile function", async () => {
      const { validateResumeFile } = await import("@/lib/services/r2-storage");
      expect(typeof validateResumeFile).toBe("function");
    });

    it("should export resumePublicUrl function", async () => {
      const { resumePublicUrl } = await import("@/lib/services/r2-storage");
      expect(typeof resumePublicUrl).toBe("function");
    });

    it("should export uploadResumeToR2 function", async () => {
      const { uploadResumeToR2 } = await import("@/lib/services/r2-storage");
      expect(typeof uploadResumeToR2).toBe("function");
    });

    it("should export deleteResumeFromR2 function", async () => {
      const { deleteResumeFromR2 } = await import("@/lib/services/r2-storage");
      expect(typeof deleteResumeFromR2).toBe("function");
    });

    it("should export deleteFileFromR2 function", async () => {
      const { deleteFileFromR2 } = await import("@/lib/services/r2-storage");
      expect(typeof deleteFileFromR2).toBe("function");
    });

    it("should export extractKeyFromResumeUrl function", async () => {
      const { extractKeyFromResumeUrl } = await import(
        "@/lib/services/r2-storage"
      );
      expect(typeof extractKeyFromResumeUrl).toBe("function");
    });
  });
});
