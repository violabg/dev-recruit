import { z } from "zod";
import { baseSchemas } from "./base";
import {
  INTERVIEW_PARTICIPANT_ROLE_VALUES,
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
  mineOnly: z
    .boolean()
    .default(true)
    .describe("true: solo il lavoro dell'utente. false solo se l'utente chiede il lavoro di tutti."),
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
/**
 * Field descriptions shared by the position draft and the position form
 * widget. They reach every MCP client through the tool input schema.
 */
const POSITION_FIELD_HINTS = {
  description:
    "Descrizione chiara in italiano: responsabilità, contesto del team, cosa rende il ruolo interessante. Scrivila tu dagli appunti dell'utente. Mai requisiti discriminatori (età, genere, provenienza, stato civile).",
  experienceLevel:
    "Riprendi un livello già usato dalle posizioni simili (list_positions).",
} as const;

export const createPositionDraftInputSchema = positionFormSchema.extend({
  description: positionFormSchema.shape.description.describe(
    POSITION_FIELD_HINTS.description,
  ),
  experienceLevel: positionFormSchema.shape.experienceLevel.describe(
    POSITION_FIELD_HINTS.experienceLevel,
  ),
});

/**
 * What the assistant already knows of a new position, to prefill the form
 * widget: every field optional, nothing validated beyond its type (the form
 * validates on save).
 */
export const openPositionFormInputSchema = z.object({
  title: z.string().max(200, "Titolo di al massimo 200 caratteri").optional(),
  description: z
    .string()
    .max(10000, "Descrizione troppo lunga")
    .optional()
    .describe(POSITION_FIELD_HINTS.description),
  experienceLevel: z
    .string()
    .max(100)
    .optional()
    .describe(POSITION_FIELD_HINTS.experienceLevel),
  skills: z.array(z.string().max(100)).max(50).optional(),
  softSkills: z.array(z.string().max(100)).max(50).optional(),
  contractType: z.string().max(100).optional(),
});

/**
 * Generation parameters of a quiz the assistant already knows, to prefill
 * the quiz form widget: every one optional. The widget sends them back to
 * the assistant, which writes the questions and shows the preview.
 */
const QUIZ_TIME_LIMIT_HINT = "Minuti; null senza limite.";

export const openQuizFormInputSchema = z.object({
  positionId: baseSchemas.id,
  quizTitle: z.string().max(200, "Titolo di al massimo 200 caratteri").optional(),
  instructions: baseSchemas.instructions,
  questionCount: z.int().min(3).max(20).optional(),
  difficulty: baseSchemas.difficulty.optional().describe("Da 1 (facile) a 5 (difficile)."),
  includeMultipleChoice: z.boolean().optional(),
  includeOpenQuestions: z.boolean().optional(),
  includeCodeSnippets: z.boolean().optional(),
  includeBehavioralScenarios: z.boolean().optional(),
  timeLimit: z
    .int()
    .min(5)
    .max(120)
    .nullable()
    .optional()
    .describe(QUIZ_TIME_LIMIT_HINT),
});

/** A new quiz of a position: same fields as the quiz editor */
export const quizDraftInputSchema = quizEditorSchema.extend({
  positionId: baseSchemas.id,
  timeLimit: quizEditorSchema.shape.timeLimit.describe(QUIZ_TIME_LIMIT_HINT),
  questions: quizEditorSchema.shape.questions.describe(
    [
      "Domande sulle competenze della posizione, al livello richiesto, senza riferimenti a candidati reali. Campi per tipo:",
      "- multiple_choice: question, options (almeno 4, ognuna di almeno 3 caratteri), correctAnswer (indice da 0 a 3), explanation facoltativa;",
      "- open_question: question, sampleAnswer, keywords facoltative;",
      "- code_snippet: question, codeSnippet, sampleSolution, language;",
      "- behavioral_scenario: question, sampleAnswer.",
    ].join("\n"),
  ),
});

export const getSchedulingOptionsInputSchema = z.object({
  applicationId: baseSchemas.id,
});

const SCHEDULE_HINTS = {
  guideId: "Una delle tracce della posizione (get_scheduling_options).",
  scheduledAt:
    "ISO con il fuso, per esempio 2026-11-25T10:00:00+01:00. Ripeti all'utente data e ora in italiano.",
  participants:
    "Persone del team (get_scheduling_options): esattamente un conduttore (lead), gli altri osservatori (observer).",
} as const;

/**
 * What the assistant already knows of an interview to schedule, to prefill
 * the scheduling form widget: every field optional, checked on save by the
 * scheduling schema.
 */
export const openScheduleFormInputSchema = z.object({
  applicationId: baseSchemas.id,
  guideId: z.string().max(100).optional().describe(SCHEDULE_HINTS.guideId),
  round: z.int().min(1).max(10).optional(),
  scheduledAt: z.iso
    .datetime({ offset: true, message: "Data e ora non valide" })
    .optional()
    .describe(SCHEDULE_HINTS.scheduledAt),
  durationMinutes: z.int().min(10).max(480).optional(),
  meetingUrl: z.string().max(500).optional(),
  participants: z
    .array(
      z.object({
        userId: z.string().max(100),
        role: z.enum(INTERVIEW_PARTICIPANT_ROLE_VALUES),
      }),
    )
    .max(10)
    .optional()
    .describe(SCHEDULE_HINTS.participants),
});

/** Same fields as the scheduling form */
export const proposeInterviewSlotInputSchema = scheduleInterviewSchema.extend({
  guideId: scheduleInterviewSchema.shape.guideId.describe(SCHEDULE_HINTS.guideId),
  scheduledAt: scheduleInterviewSchema.shape.scheduledAt.describe(
    SCHEDULE_HINTS.scheduledAt,
  ),
  participants: scheduleInterviewSchema.shape.participants.describe(
    SCHEDULE_HINTS.participants,
  ),
});

export const getInterviewKitInputSchema = z.object({
  interviewId: baseSchemas.id,
});

const KIT_ID_HINT = "Id restituiti da get_interview_kit.";
const KIT_QUESTION_HINT =
  "Domanda aperta, pertinente al ruolo e ai criteri, senza riferimenti a età, genere, provenienza, salute, famiglia o altri dati personali non pertinenti.";
const KIT_CRITERIA_HINT = "Solo criteri attivi della preparazione (get_interview_kit).";

const kitItemText = kitItemInputSchema.shape.text;
const kitItemFollowUps = kitItemInputSchema.shape.followUps.unwrap();
const kitItemCriteria = kitItemInputSchema.shape.criterionIds.unwrap();

/**
 * Changes to an interview kit, one by one: questions not mentioned stay as
 * they are. Field rules are the kit editor's.
 */
export const kitPatchInputSchema = z.object({
  interviewId: baseSchemas.id,
  briefing: interviewKitEditorSchema.shape.briefing
    .unwrap()
    .optional()
    .describe("Sostituisce il briefing: al massimo 5 punti."),
  hypotheses: interviewKitEditorSchema.shape.hypotheses
    .unwrap()
    .optional()
    .describe(
      "Sostituisce le ipotesi da verificare: ognuna legata a un criterio attivo della preparazione, con come verificarla.",
    ),
  addItems: z
    .array(
      z.object({
        sectionId: z.string().min(1),
        text: kitItemText.describe(KIT_QUESTION_HINT),
        followUps: kitItemFollowUps.optional(),
        criterionIds: kitItemCriteria.optional().describe(KIT_CRITERIA_HINT),
        required: z.boolean().optional(),
        rationale: z.string().max(1000).nullish(),
      }),
    )
    .max(30, "Al massimo 30 domande nuove per volta")
    .optional()
    .describe("Domande nuove. Le domande non indicate restano come sono."),
  updateItems: z
    .array(
      z.object({
        id: z.string().min(1).describe(KIT_ID_HINT),
        text: kitItemText.optional().describe(KIT_QUESTION_HINT),
        followUps: kitItemFollowUps.optional(),
        criterionIds: kitItemCriteria.optional().describe(KIT_CRITERIA_HINT),
        required: z.boolean().optional(),
      }),
    )
    .max(80)
    .optional(),
  removeItemIds: z.array(z.string().min(1)).max(80).optional().describe(KIT_ID_HINT),
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
export type OpenQuizFormInput = z.infer<typeof openQuizFormInputSchema>;
export type OpenScheduleFormInput = z.infer<typeof openScheduleFormInputSchema>;
export type PublishDraftInput = z.infer<typeof publishDraftInputSchema>;
