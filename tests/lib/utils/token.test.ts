/**
 * Tests for Token Utilities
 */

import { generateAssessmentToken } from "@/lib/utils/token";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The prisma mock is already configured in setup.ts
// We need to import the mocked version
vi.mock("@/lib/prisma", () => ({
  default: {
    assessment: {
      findUnique: vi.fn(),
    },
  },
}));

describe("generateAssessmentToken", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset the mock implementation
    const prisma = (await import("@/lib/prisma")).default;
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(null);
  });

  it("should generate a token string", async () => {
    const token = await generateAssessmentToken();

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("should generate token without hyphens", async () => {
    const token = await generateAssessmentToken();

    expect(token).not.toContain("-");
  });

  it("should generate 32-character token (UUID without hyphens)", async () => {
    const token = await generateAssessmentToken();

    // UUID is 36 chars with hyphens (8-4-4-4-12), 32 without
    expect(token.length).toBe(32);
  });

  it("should generate unique tokens", async () => {
    const tokens = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const token = await generateAssessmentToken();
      tokens.add(token);
    }

    // All 100 tokens should be unique
    expect(tokens.size).toBe(100);
  });

  it("should check database for existing token", async () => {
    const prisma = (await import("@/lib/prisma")).default;

    await generateAssessmentToken();

    expect(prisma.assessment.findUnique).toHaveBeenCalled();
    expect(prisma.assessment.findUnique).toHaveBeenCalledWith({
      where: { token: expect.any(String) },
      select: { id: true },
    });
  });

  it("should retry if token already exists", async () => {
    const prisma = (await import("@/lib/prisma")).default;

    // First call returns existing, second returns null
    vi.mocked(prisma.assessment.findUnique)
      .mockResolvedValueOnce({ id: "existing-1" } as never)
      .mockResolvedValueOnce({ id: "existing-2" } as never)
      .mockResolvedValueOnce(null);

    const token = await generateAssessmentToken();

    expect(token).toBeDefined();
    expect(prisma.assessment.findUnique).toHaveBeenCalledTimes(3);
  });

  it("should only contain hexadecimal characters", async () => {
    const token = await generateAssessmentToken();

    // UUID only contains hex chars (0-9, a-f)
    expect(token).toMatch(/^[0-9a-f]+$/);
  });
});
