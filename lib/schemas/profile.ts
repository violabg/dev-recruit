import { z } from "zod";

// ====================
// PROFILE SCHEMAS
// ====================

export const profileSchema = z.object({
  full_name: z
    .string()
    .min(2, {
      error: "Nome completo deve essere almeno 2 caratteri",
    })
    .max(50, {
      error: "Nome completo deve essere massimo 50 caratteri",
    }),
  user_name: z
    .string()
    .min(2, {
      error: "Nome utente deve essere almeno 2 caratteri",
    })
    .max(30, {
      error: "Nome utente deve essere massimo 30 caratteri",
    })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      error:
        "Nome utente può contenere solo lettere, numeri, trattini e underscore",
    }),
});

// ====================
// TYPE EXPORTS
// ====================

export type ProfileFormData = z.infer<typeof profileSchema>;
