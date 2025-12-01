/**
 * Tests for Position Schema
 */

import {
  positionDescriptionSchema,
  positionFormSchema,
} from "@/lib/schemas/position";
import { describe, expect, it } from "vitest";

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
  });

  describe("invalid inputs", () => {
    it("should reject empty experience level", () => {
      const invalidData = {
        title: "Developer",
        experienceLevel: "",
        skills: ["React"],
        currentDescription: "Description",
      };

      const result = positionDescriptionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
