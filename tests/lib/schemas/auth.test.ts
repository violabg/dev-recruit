/**
 * Tests for Auth Schemas
 */

import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/schemas/auth";
import { describe, expect, it } from "vitest";

describe("loginSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid login credentials", () => {
      const validData = {
        email: "user@example.com",
        password: "password123",
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept various email formats", () => {
      const emails = [
        "test@example.com",
        "user.name@domain.co.uk",
        "user+tag@example.org",
      ];

      emails.forEach((email) => {
        const result = loginSchema.safeParse({
          email,
          password: "validpass123",
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("invalid inputs", () => {
    it("should reject invalid email", () => {
      const invalidData = {
        email: "not-an-email",
        password: "password123",
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject short password", () => {
      const invalidData = {
        email: "user@example.com",
        password: "12345", // less than 6 characters
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject empty email", () => {
      const invalidData = {
        email: "",
        password: "password123",
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

describe("signUpSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid sign up data", () => {
      const validData = {
        first_name: "Mario",
        last_name: "Rossi",
        email: "mario@example.com",
        password: "password123",
        repeatPassword: "password123",
      };

      const result = signUpSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject short first name", () => {
      const invalidData = {
        first_name: "M",
        last_name: "Rossi",
        email: "mario@example.com",
        password: "password123",
        repeatPassword: "password123",
      };

      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject long first name", () => {
      const invalidData = {
        first_name: "A".repeat(31),
        last_name: "Rossi",
        email: "mario@example.com",
        password: "password123",
        repeatPassword: "password123",
      };

      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject short last name", () => {
      const invalidData = {
        first_name: "Mario",
        last_name: "R",
        email: "mario@example.com",
        password: "password123",
        repeatPassword: "password123",
      };

      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject mismatched passwords", () => {
      const invalidData = {
        first_name: "Mario",
        last_name: "Rossi",
        email: "mario@example.com",
        password: "password123",
        repeatPassword: "different123",
      };

      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid email", () => {
      const invalidData = {
        first_name: "Mario",
        last_name: "Rossi",
        email: "not-an-email",
        password: "password123",
        repeatPassword: "password123",
      };

      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

describe("forgotPasswordSchema", () => {
  it("should accept valid email", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("updatePasswordSchema", () => {
  it("should accept valid password", () => {
    const result = updatePasswordSchema.safeParse({
      password: "newpassword123",
    });
    expect(result.success).toBe(true);
  });

  it("should reject short password", () => {
    const result = updatePasswordSchema.safeParse({
      password: "12345",
    });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid password change", () => {
      const validData = {
        current_password: "oldpassword123",
        new_password: "newpassword456",
        confirm_password: "newpassword456",
      };

      const result = changePasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject mismatched new passwords", () => {
      const invalidData = {
        current_password: "oldpassword123",
        new_password: "newpassword456",
        confirm_password: "different789",
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject same current and new password", () => {
      const invalidData = {
        current_password: "samepassword123",
        new_password: "samepassword123",
        confirm_password: "samepassword123",
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject short new password", () => {
      const invalidData = {
        current_password: "oldpassword123",
        new_password: "12345",
        confirm_password: "12345",
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
