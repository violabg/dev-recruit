/**
 * Tests for Candidate Schema
 */

import {
  candidateEmailSchema,
  candidateFormSchema,
  candidateUpdateSchema,
} from "@/lib/schemas/candidate";
import { describe, expect, it } from "vitest";

describe("candidateEmailSchema", () => {
  it("trims and lower-cases the email", () => {
    expect(candidateEmailSchema.parse("  Mario@Example.COM ")).toBe(
      "mario@example.com",
    );
  });

  it("refuses an invalid email with the Italian message", () => {
    const result = candidateEmailSchema.safeParse("non-una-email");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Inserisci un indirizzo email valido",
    );
  });

  it("normalises the email in both candidate schemas", () => {
    expect(
      candidateFormSchema.parse({
        firstName: "Mario",
        lastName: "Rossi",
        email: " MARIO@example.com",
        positionIds: ["p1"],
      }).email,
    ).toBe("mario@example.com");
    expect(candidateUpdateSchema.parse({ email: "Anna@X.it " }).email).toBe(
      "anna@x.it",
    );
  });
});

describe("candidateUpdateSchema — Non ricontattare", () => {
  it("accepts the flag and its note", () => {
    expect(
      candidateUpdateSchema.parse({
        doNotContact: true,
        doNotContactNote: "Non interessato",
      }),
    ).toEqual({ doNotContact: true, doNotContactNote: "Non interessato" });
  });

  it("accepts a null note", () => {
    expect(
      candidateUpdateSchema.safeParse({ doNotContact: false, doNotContactNote: null })
        .success,
    ).toBe(true);
  });

  it("refuses a note over 500 characters", () => {
    const result = candidateUpdateSchema.safeParse({
      doNotContactNote: "x".repeat(501),
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "La nota non può superare 500 caratteri",
    );
  });

  it("has no status field", () => {
    const parsed = candidateUpdateSchema.parse({
      firstName: "Mario",
      status: "hired",
    } as any);
    expect(parsed).not.toHaveProperty("status");
    // A status alone is not an update
    expect(candidateUpdateSchema.safeParse({ status: "hired" }).success).toBe(
      false,
    );
  });
});

describe("candidateFormSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid candidate form data", () => {
      const validData = {
        firstName: "Mario",
        lastName: "Rossi",
        email: "mario.rossi@example.com",
        positionIds: ["position-123"],
      };

      const result = candidateFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept valid data with date of birth (adult)", () => {
      const validData = {
        firstName: "Mario",
        lastName: "Rossi",
        email: "mario.rossi@example.com",
        positionIds: ["position-123"],
        dateOfBirth: new Date("1990-01-01"),
      };

      const result = candidateFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept email variations", () => {
      const emails = [
        "test@example.com",
        "user.name@domain.co.uk",
        "user+tag@example.org",
      ];

      emails.forEach((email) => {
        const result = candidateFormSchema.safeParse({
          firstName: "Test",
          lastName: "User",
          email,
          positionIds: ["pos-1"],
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("invalid inputs", () => {
    it("should reject invalid email", () => {
      const invalidData = {
        firstName: "Mario",
        lastName: "Rossi",
        email: "not-an-email",
        positionIds: ["position-123"],
      };

      const result = candidateFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject empty first name", () => {
      const invalidData = {
        firstName: "",
        lastName: "Rossi",
        email: "test@example.com",
        positionIds: ["position-123"],
      };

      const result = candidateFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject empty last name", () => {
      const invalidData = {
        firstName: "Mario",
        lastName: "",
        email: "test@example.com",
        positionIds: ["position-123"],
      };

      const result = candidateFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject empty position IDs array", () => {
      const invalidData = {
        firstName: "Mario",
        lastName: "Rossi",
        email: "test@example.com",
        positionIds: [],
      };

      const result = candidateFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject underage candidate (less than 18)", () => {
      const today = new Date();
      const underageBirthday = new Date(
        today.getFullYear() - 17,
        today.getMonth(),
        today.getDate()
      );

      const invalidData = {
        firstName: "Young",
        lastName: "Person",
        email: "young@example.com",
        positionIds: ["position-123"],
        dateOfBirth: underageBirthday,
      };

      const result = candidateFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should accept multiple positions", () => {
      const validData = {
        firstName: "Mario",
        lastName: "Rossi",
        email: "mario.rossi@example.com",
        positionIds: ["position-123", "position-456", "position-789"],
      };

      const result = candidateFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject more than 10 positions", () => {
      const invalidData = {
        firstName: "Mario",
        lastName: "Rossi",
        email: "mario.rossi@example.com",
        positionIds: Array.from({ length: 11 }, (_, i) => `pos-${i}`),
      };

      const result = candidateFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

describe("candidateUpdateSchema", () => {
  describe("valid inputs", () => {
    it("should accept partial update with firstName", () => {
      const validData = {
        firstName: "Giuseppe",
      };

      const result = candidateUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept partial update with email", () => {
      const validData = {
        email: "new.email@example.com",
      };

      const result = candidateUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept resume URL update", () => {
      const validData = {
        resumeUrl: "https://example.com/resume.pdf",
      };

      const result = candidateUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept empty string for resumeUrl (to clear)", () => {
      const validData = {
        resumeUrl: "",
      };

      const result = candidateUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept null for resumeUrl", () => {
      const validData = {
        resumeUrl: null,
      };

      const result = candidateUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept removeResume flag", () => {
      const validData = {
        removeResume: true,
      };

      const result = candidateUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept multiple fields update", () => {
      const validData = {
        firstName: "Mario",
        lastName: "Bianchi",
      };

      const result = candidateUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept null dateOfBirth (to clear)", () => {
      const validData = {
        dateOfBirth: null,
      };

      const result = candidateUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject empty object", () => {
      const invalidData = {};

      const result = candidateUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid email", () => {
      const invalidData = {
        email: "not-an-email",
      };

      const result = candidateUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid resumeUrl", () => {
      const invalidData = {
        resumeUrl: "not-a-url",
      };

      const result = candidateUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
