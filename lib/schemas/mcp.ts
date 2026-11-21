import { z } from "zod";
import { baseSchemas } from "./base";

// ====================
// MCP TOOL INPUTS (read tools)
// ====================

export const actionCenterInputSchema = z.object({
  mineOnly: z.boolean().default(true),
});

export const listPositionsInputSchema = z.object({
  search: z.string().max(100, "Ricerca di al massimo 100 caratteri").optional(),
  status: z.enum(["draft", "open", "closed", "all"]).default("all"),
  page: z.number().int().min(1, "La pagina parte da 1").default(1),
});

export const getPositionInputSchema = z.object({
  positionId: baseSchemas.id,
});

export const getApplicationInputSchema = z.object({
  applicationId: baseSchemas.id,
  includeCv: z.boolean().default(false),
});

export const listInterviewsInputSchema = z.object({
  applicationId: baseSchemas.id.optional(),
  mineOnly: z.boolean().default(false),
  from: z.iso
    .datetime({ offset: true, message: "Data di inizio non valida" })
    .optional(),
  to: z.iso
    .datetime({ offset: true, message: "Data di fine non valida" })
    .optional(),
});

export const getInterviewInputSchema = z.object({
  interviewId: baseSchemas.id,
});

// ====================
// MCP ADMIN ACTIONS
// ====================

export const setMcpEnabledSchema = z.boolean({
  error: "Valore dell'interruttore non valido",
});

export const setUserMcpDisabledSchema = z.object({
  userId: baseSchemas.id,
  disabled: z.boolean({ error: "Valore dell'interruttore non valido" }),
});

export const revokeMcpTokenSchema = baseSchemas.id;

export type SetUserMcpDisabledInput = z.infer<typeof setUserMcpDisabledSchema>;

export type ActionCenterInput = z.infer<typeof actionCenterInputSchema>;
export type ListPositionsInput = z.infer<typeof listPositionsInputSchema>;
export type GetPositionInput = z.infer<typeof getPositionInputSchema>;
export type GetApplicationInput = z.infer<typeof getApplicationInputSchema>;
export type ListInterviewsInput = z.infer<typeof listInterviewsInputSchema>;
export type GetInterviewInput = z.infer<typeof getInterviewInputSchema>;
