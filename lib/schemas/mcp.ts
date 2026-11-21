import { z } from "zod";
import { baseSchemas } from "./base";
import {
  interviewKitEditorSchema,
  kitChecklistItemSchema,
  kitItemInputSchema,
  scheduleInterviewSchema,
} from "./interview";
import { positionFormSchema } from "./position";
import { quizEditorSchema } from "./quiz";

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
// MCP TOOL INPUTS (draft and write tools)
// ====================

/** Same fields as the dashboard form; the position is created as a draft */
export const createPositionDraftInputSchema = positionFormSchema;

/**
 * What the assistant already knows of a new position, to prefill the form
 * widget: every field optional, nothing validated beyond its type (the form
 * validates on save).
 */
export const openPositionFormInputSchema = z.object({
  title: z.string().max(200, "Titolo di al massimo 200 caratteri").optional(),
  description: z.string().max(10000, "Descrizione troppo lunga").optional(),
  experienceLevel: z.string().max(100).optional(),
  skills: z.array(z.string().max(100)).max(50).optional(),
  softSkills: z.array(z.string().max(100)).max(50).optional(),
  contractType: z.string().max(100).optional(),
});

/** A new quiz of a position: same fields as the quiz editor */
export const quizDraftInputSchema = quizEditorSchema.extend({
  positionId: baseSchemas.id,
});

export const getSchedulingOptionsInputSchema = z.object({
  applicationId: baseSchemas.id,
});

/** Same fields as the scheduling form */
export const proposeInterviewSlotInputSchema = scheduleInterviewSchema;

export const getInterviewKitInputSchema = z.object({
  interviewId: baseSchemas.id,
});

const kitItemText = kitItemInputSchema.shape.text;
const kitItemFollowUps = kitItemInputSchema.shape.followUps.unwrap();
const kitItemCriteria = kitItemInputSchema.shape.criterionIds.unwrap();

/**
 * Changes to an interview kit, one by one: questions not mentioned stay as
 * they are. Field rules are the kit editor's.
 */
export const kitPatchInputSchema = z.object({
  interviewId: baseSchemas.id,
  briefing: interviewKitEditorSchema.shape.briefing.unwrap().optional(),
  hypotheses: interviewKitEditorSchema.shape.hypotheses.unwrap().optional(),
  addItems: z
    .array(
      z.object({
        sectionId: z.string().min(1),
        text: kitItemText,
        followUps: kitItemFollowUps.optional(),
        criterionIds: kitItemCriteria.optional(),
        required: z.boolean().optional(),
        rationale: z.string().max(1000).nullish(),
      }),
    )
    .max(30, "Al massimo 30 domande nuove per volta")
    .optional(),
  updateItems: z
    .array(
      z.object({
        id: z.string().min(1),
        text: kitItemText.optional(),
        followUps: kitItemFollowUps.optional(),
        criterionIds: kitItemCriteria.optional(),
        required: z.boolean().optional(),
      }),
    )
    .max(80)
    .optional(),
  removeItemIds: z.array(z.string().min(1)).max(80).optional(),
  addChecklist: z
    .array(kitChecklistItemSchema.pick({ category: true, text: true }))
    .max(30)
    .optional(),
  removeChecklistIds: z.array(z.string().min(1)).max(30).optional(),
});

/** The confirmed step of a draft: open a position, schedule a proposal, mark a kit ready */
export const publishDraftInputSchema = z.object({
  kind: z.enum(["position", "proposal", "kit"], {
    error: "Tipo di bozza non valido",
  }),
  id: baseSchemas.id,
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
export type QuizDraftInput = z.infer<typeof quizDraftInputSchema>;
export type KitPatchInput = z.infer<typeof kitPatchInputSchema>;
export type OpenPositionFormInput = z.infer<typeof openPositionFormInputSchema>;
export type PublishDraftInput = z.infer<typeof publishDraftInputSchema>;
