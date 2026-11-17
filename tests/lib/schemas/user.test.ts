/**
 * Tests for the user-management schemas (lib/schemas/user.ts).
 * All messages are Italian and shown to the user as they are.
 */

import {
  banUserSchema,
  buildDisplayName,
  createUserSchema,
  setUserPasswordSchema,
  toUserRole,
  userDataSchema,
} from "@/lib/schemas/user";
import { describe, expect, it } from "vitest";

const validCreate = {
  firstName: "Anna",
  lastName: "Rossi",
  email: "anna@example.com",
  password: "password123",
  role: "admin",
  emailVerified: true,
};

function firstMessage(result: { success: boolean; error?: any }): string {
  return result.error.issues[0].message;
}

describe("createUserSchema", () => {
  it("accepts a valid user", () => {
    expect(createUserSchema.safeParse(validCreate).success).toBe(true);
  });

  it("requires a first name", () => {
    const result = createUserSchema.safeParse({ ...validCreate, firstName: "  " });

    expect(result.success).toBe(false);
    expect(firstMessage(result as any)).toBe("Il nome è obbligatorio");
  });

  it("requires a last name", () => {
    const result = createUserSchema.safeParse({ ...validCreate, lastName: "" });

    expect(result.success).toBe(false);
    expect(firstMessage(result as any)).toBe("Il cognome è obbligatorio");
  });

  it("refuses a malformed email", () => {
    const result = createUserSchema.safeParse({
      ...validCreate,
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
    expect(firstMessage(result as any)).toBe("Email non valida");
  });

  it("trims and lower-cases the email", () => {
    const result = createUserSchema.safeParse({
      ...validCreate,
      email: " Anna@X.it ",
    });

    expect(result.success).toBe(true);
    expect((result as any).data?.email).toBe("anna@x.it");
  });

  it("refuses a password shorter than 8 characters", () => {
    const result = createUserSchema.safeParse({
      ...validCreate,
      password: "1234567",
    });

    expect(result.success).toBe(false);
    expect(firstMessage(result as any)).toBe(
      "La password deve avere almeno 8 caratteri"
    );
  });

  it("refuses a password longer than 128 characters", () => {
    const result = createUserSchema.safeParse({
      ...validCreate,
      password: "a".repeat(129),
    });

    expect(result.success).toBe(false);
    expect(firstMessage(result as any)).toBe(
      "La password può avere al massimo 128 caratteri"
    );
  });

  it("refuses an unknown role", () => {
    const result = createUserSchema.safeParse({ ...validCreate, role: "owner" });

    expect(result.success).toBe(false);
    expect(firstMessage(result as any)).toBe("Ruolo non valido");
  });
});

describe("userDataSchema", () => {
  it("accepts the editable data of a user", () => {
    expect(
      userDataSchema.safeParse({
        firstName: "Anna",
        lastName: "Rossi",
        email: "anna@example.com",
      }).success
    ).toBe(true);
  });
});

describe("setUserPasswordSchema", () => {
  it("accepts two matching passwords", () => {
    expect(
      setUserPasswordSchema.safeParse({
        password: "password123",
        confirmPassword: "password123",
      }).success
    ).toBe(true);
  });

  it("reports the mismatch on confirmPassword", () => {
    const result = setUserPasswordSchema.safeParse({
      password: "password123",
      confirmPassword: "password124",
    });

    expect(result.success).toBe(false);
    expect((result as any).error?.issues[0].path).toEqual(["confirmPassword"]);
    expect((result as any).error?.issues[0].message).toBe(
      "Le password non corrispondono"
    );
  });
});

describe("banUserSchema", () => {
  it("refuses a reason shorter than 3 characters after trimming", () => {
    const result = banUserSchema.safeParse({ reason: "  ab " });

    expect(result.success).toBe(false);
    expect(firstMessage(result as any)).toBe(
      "Indica il motivo del blocco (almeno 3 caratteri)"
    );
  });

  it("accepts a 3-character reason", () => {
    const result = banUserSchema.safeParse({ reason: "abc" });

    expect(result.success).toBe(true);
    expect((result as any).data?.reason).toBe("abc");
  });

  it("refuses a reason longer than 500 characters", () => {
    const result = banUserSchema.safeParse({ reason: "a".repeat(501) });

    expect(result.success).toBe(false);
    expect(firstMessage(result as any)).toBe(
      "Il motivo può avere al massimo 500 caratteri"
    );
  });
});

describe("toUserRole", () => {
  it("keeps admin and narrows everything else to user", () => {
    expect(toUserRole("admin")).toBe("admin");
    expect(toUserRole("user")).toBe("user");
    expect(toUserRole(null)).toBe("user");
    expect(toUserRole(undefined)).toBe("user");
  });
});

describe("buildDisplayName", () => {
  it("joins the trimmed names", () => {
    expect(buildDisplayName(" Anna ", " Rossi ")).toBe("Anna Rossi");
  });
});
