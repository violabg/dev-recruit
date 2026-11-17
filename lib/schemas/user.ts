import { z } from "zod";

// ====================
// USER MANAGEMENT SCHEMAS
// ====================

export const USER_ROLE_VALUES = ["user", "admin"] as const;

export const userRoleSchema = z.enum(USER_ROLE_VALUES, {
  error: "Ruolo non valido",
});

export type UserRole = z.infer<typeof userRoleSchema>;

export const userIdSchema = z.string().trim().min(1, {
  error: "Utente non valido",
});

export const sessionIdSchema = z.string().trim().min(1, {
  error: "Sessione non valida",
});

const firstNameField = z
  .string()
  .trim()
  .min(1, { error: "Il nome è obbligatorio" })
  .max(50, { error: "Il nome può avere al massimo 50 caratteri" });

const lastNameField = z
  .string()
  .trim()
  .min(1, { error: "Il cognome è obbligatorio" })
  .max(50, { error: "Il cognome può avere al massimo 50 caratteri" });

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Email non valida" }));

export const userPasswordSchema = z
  .string()
  .min(8, { error: "La password deve avere almeno 8 caratteri" })
  .max(128, { error: "La password può avere al massimo 128 caratteri" });

export const userDataSchema = z.object({
  firstName: firstNameField,
  lastName: lastNameField,
  email: emailField,
});

export const createUserSchema = userDataSchema.extend({
  password: userPasswordSchema,
  role: userRoleSchema,
  emailVerified: z.boolean(),
});

export const setUserPasswordSchema = z
  .object({
    password: userPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    error: "Le password non corrispondono",
  });

export const banUserSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, { error: "Indica il motivo del blocco (almeno 3 caratteri)" })
    .max(500, { error: "Il motivo può avere al massimo 500 caratteri" }),
});

export const emailVerifiedSchema = z.boolean({ error: "Valore non valido" });

// ====================
// TYPE EXPORTS
// ====================

export type UserDataFormData = z.infer<typeof userDataSchema>;
export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type SetUserPasswordFormData = z.infer<typeof setUserPasswordSchema>;
export type BanUserFormData = z.infer<typeof banUserSchema>;

// ====================
// HELPERS
// ====================

/** Narrows a stored role to a known one: `admin` only when it is exactly `admin`. */
export function toUserRole(role: string | null | undefined): UserRole {
  return role === "admin" ? "admin" : "user";
}

/** Full name shown for a user, built from first and last name. */
export function buildDisplayName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}
