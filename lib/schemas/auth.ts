import { z } from "zod/v4";
import { baseSchemas } from "./base";

// ====================
// AUTHENTICATION SCHEMAS
// ====================

export const loginSchema = z.object({
  email: baseSchemas.email,
  password: baseSchemas.password,
});

export const signUpSchema = z
  .object({
    first_name: z
      .string()
      .min(2, {
          error: "Nome deve essere almeno 2 caratteri"
    })
      .max(30, {
          error: "Nome deve essere massimo 30 caratteri"
    }),
    last_name: z
      .string()
      .min(2, {
          error: "Cognome deve essere almeno 2 caratteri"
    })
      .max(30, {
          error: "Cognome deve essere massimo 30 caratteri"
    }),
    email: baseSchemas.email,
    password: baseSchemas.password,
    repeatPassword: baseSchemas.password,
  })
  .refine((data) => data.password === data.repeatPassword, {
    path: ["repeatPassword"],
      error: "Passwords do not match"
});

export const forgotPasswordSchema = z.object({
  email: baseSchemas.email,
});

export const updatePasswordSchema = z.object({
  password: baseSchemas.password,
});

export const changePasswordSchema = z
  .object({
    current_password: baseSchemas.password,
    new_password: z
      .string()
      .min(6, {
          error: "Password deve essere almeno 6 caratteri"
    })
      .max(100, {
          error: "Password deve essere massimo 100 caratteri"
    }),
    confirm_password: baseSchemas.password,
  })
  .refine((data) => data.new_password === data.confirm_password, {
    path: ["confirm_password"],
      error: "Le password non corrispondono"
})
  .refine((data) => data.current_password !== data.new_password, {
    path: ["new_password"],
      error: "La nuova password deve essere diversa da quella attuale"
});

// ====================
// TYPE EXPORTS
// ====================

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
