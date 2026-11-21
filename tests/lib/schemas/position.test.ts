/**
 * Tests for Position Schema
 */

import {
  POSITION_STATUS_VALUES,
  positionDescriptionSchema,
  positionFormSchema,
  positionStatusSchema,
  updatePositionStatusSchema,
} from "@/lib/schemas/position";
import { describe, expect, it } from "vitest";

describe("positionStatusSchema", () => {
  it("lists draft, open and closed", () => {
    expect(POSITION_STATUS_VALUES).toEqual(["draft", "open", "closed"]);
  });

  it.each(["draft", "open", "closed"])("accepts %s", (status) => {
    expect(positionStatusSchema.parse(status)).toBe(status);
  });

  it("refuses an unknown status with the Italian message", () => {
    const result = positionStatusSchema.safeParse("archived");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Stato della posizione non valido",
    );
  });
});

describe("updatePositionStatusSchema", () => {
  it("accepts a position id and a status", () => {
    expect(
      updatePositionStatusSchema.parse({ positionId: "p1", status: "closed" }),
    ).toEqual({ positionId: "p1", status: "closed" });
  });

  it("refuses a missing position id", () => {
    expect(
      updatePositionStatusSchema.safeParse({ positionId: "", status: "open" })
        .success,
    ).toBe(false);
  });

  it("refuses an unknown status", () => {
    expect(
      updatePositionStatusSchema.safeParse({ positionId: "p1", status: "x" })
        .success,
    ).toBe(false);
  });
});

describe("positionFormSchema has no status", () => {
  it("drops a status sent with the form", () => {
    const parsed = positionFormSchema.parse({
      title: "Developer",
      experienceLevel: "senior",
      skills: ["React"],
      status: "open",
    } as any);
    expect(parsed).not.toHaveProperty("status");
  });
});

describe("positionFormSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid position form data", () => {
      const validData = {
        title: "Senior Developer",
        description: "We are looking for a senior developer",
        experienceLevel: "senior",
        skills: ["React", "TypeScript"],
      };

      const result = positionFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept optional soft skills", () => {
      const validData = {
        title: "Developer",
        description: "Description here",
        experienceLevel: "mid",
        skills: ["JavaScript"],
        softSkills: ["Communication", "Teamwork"],
      };

      const result = positionFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept optional contract type", () => {
      const validData = {
        title: "Developer",
        description: "Description here",
        experienceLevel: "junior",
        skills: ["Python"],
        contractType: "full-time",
      };

      const result = positionFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject title with less than 2 characters", () => {
      const invalidData = {
        title: "A",
        description: "Description",
        experienceLevel: "mid",
        skills: ["React"],
      };

      const result = positionFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject empty experience level", () => {
      const invalidData = {
        title: "Developer",
        description: "Description",
        experienceLevel: "",
        skills: ["React"],
      };

      const result = positionFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject empty skills array", () => {
      const invalidData = {
        title: "Developer",
        description: "Description",
        experienceLevel: "mid",
        skills: [],
      };

      const result = positionFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject missing required fields", () => {
      const invalidData = {
        title: "Developer",
      };

      const result = positionFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

describe("positionDescriptionSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid position description data", () => {
      const validData = {
        title: "Frontend Developer",
        experienceLevel: "senior",
        skills: ["React", "TypeScript", "CSS"],
        currentDescription: "Existing description",
      };

      const result = positionDescriptionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept optional soft skills", () => {
      const validData = {
        title: "Backend Developer",
        experienceLevel: "mid",
        skills: ["Node.js"],
        softSkills: ["Problem solving"],
        currentDescription: "Description",
      };

      const result = positionDescriptionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept optional contract type", () => {
      const validData = {
        title: "Full Stack Developer",
        experienceLevel: "junior",
        skills: ["JavaScript", "Python"],
        contractType: "part-time",
        currentDescription: "Description",
      };

      const result = positionDescriptionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept a request without title, level and skills", () => {
      const validData = {
        title: "",
        experienceLevel: "",
        skills: [],
        currentDescription: "Testo di partenza",
      };

      const result = positionDescriptionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject a description longer than 2000 characters", () => {
      const invalidData = {
        title: "Developer",
        currentDescription: "x".repeat(2001),
      };

      const result = positionDescriptionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
