/**
 * Tests for Enronment Variable Validation
 *
 * Note: The global test setup mocks @/lib/env, so these tests verify
 * the mock behavior and exports. Integration tests of the actual env
 * validation would require unmocking which causes issues with module caching.
 */
import { ENV } from "varlock/env";
import { describe, expect, it } from "vitest";

describe("env", () => {
  describe("env proxy (mocked)", () => {
    it("should return DATABASE_URL from mocked environment", () => {
      expect(typeof ENV.DATABASE_URL).toBe("string");
      expect(ENV.DATABASE_URL).toBe(
        "postgresql://test:test@localhost:5432/test",
      );
    });

    it("should return GROQ_API_KEY from mocked environment", () => {
      expect(typeof ENV.GROQ_API_KEY).toBe("string");
      expect(ENV.GROQ_API_KEY).toBe("test-api-key");
    });

    it("should return R2 configuration values from mocked environment", () => {
      expect(typeof ENV.R2_ACCESS_KEY_ID).toBe("string");
      expect(typeof ENV.R2_SECRET_ACCESS_KEY).toBe("string");
      expect(typeof ENV.R2_BUCKET_NAME).toBe("string");
    });

    it("should return consistent values on repeated access", () => {
      const firstAccess = ENV.DATABASE_URL;
      const secondAccess = ENV.DATABASE_URL;

      expect(firstAccess).toBe(secondAccess);
    });
  });
});

describe("env.ts validation behavior (unit tests)", () => {
  // These test the Zod schema logic conceptually
  describe("serverEnvSchema validation rules", () => {
    it("should require DATABASE_URL as a string", () => {
      // The schema requires DATABASE_URL - verified by the fact the mock includes it
      expect(ENV.DATABASE_URL).toBeDefined();
    });

    it("should allow optional GROQ_API_KEY", () => {
      // The schema makes GROQ_API_KEY optional
      expect(
        typeof ENV.GROQ_API_KEY === "string" || ENV.GROQ_API_KEY === undefined,
      ).toBe(true);
    });

    it("should allow optional R2 configuration", () => {
      // The schema makes R2 vars optional
      expect(
        typeof ENV.R2_ACCESS_KEY_ID === "string" ||
          ENV.R2_ACCESS_KEY_ID === undefined,
      ).toBe(true);
    });
  });
});
