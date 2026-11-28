import { z } from "zod";
import { baseSchemas } from "./base";
// Imported from the modules, never from the barrel, to avoid an import cycle
import { GUIDE_SECTION_KIND_VALUES } from "./interview-guide";
import { type CriterionAnchors, criterionAnchorsSchema } from "./scorecard";

// ====================
// INTERVIEW SCHEMAS
// ====================
// Interview ("Colloquio") of an application: scheduling, kit preparation,
// live notes and the interviewer scorecard.

// ====================
// VALUE LISTS
// ====================
// Value arrays only: labels live in the interview presentation module.

export const INTERVIEW_STATUS_VALUES = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUS_VALUES)[number];

export const INTERVIEW_PARTICIPANT_ROLE_VALUES = ["lead", "observer"] as const;
export type InterviewParticipantRole =
  (typeof INTERVIEW_PARTICIPANT_ROLE_VALUES)[number];

export const KIT_STATUS_VALUES = ["draft", "ready"] as const;
export type KitStatus = (typeof KIT_STATUS_VALUES)[number];

export const KIT_ITEM_ORIGIN_VALUES = [
  "template",
  "cv",
  "resume_gap",
  "quiz_answer",
  "previous_round",
  "manual",
] as const;
export type KitItemOrigin = (typeof KIT_ITEM_ORIGIN_VALUES)[number];

export const AI_KIT_ITEM_ORIGIN_VALUES = [
  "cv",
  "resume_gap",
  "quiz_answer",
  "previous_round",
] as const;
export type AiKitItemOrigin = (typeof AI_KIT_ITEM_ORIGIN_VALUES)[number];

export const HIRE_RECOMMENDATION_VALUES = [
  "strong_yes",
  "yes",
  "maybe",
  "no",
  "strong_no",
] as const;
export type HireRecommendation = (typeof HIRE_RECOMMENDATION_VALUES)[number];

export const KIT_CHECKLIST_CATEGORY_VALUES = [
  "communicate",
  "logistics",
] as const;
export type KitChecklistCategory =
  (typeof KIT_CHECKLIST_CATEGORY_VALUES)[number];

export const INTERVIEW_MISSING_SOURCE_VALUES = [
  "cv",
  "cv_evaluation",
  "assessment",
  "answer_detail",
] as const;
export type InterviewMissingSource =
  (typeof INTERVIEW_MISSING_SOURCE_VALUES)[number];

// ====================
// SCHEDULING
// ====================

export const interviewParticipantInputSchema = z.object({
  userId: baseSchemas.id,
  role: z.enum(INTERVIEW_PARTICIPANT_ROLE_VALUES),
});

const participantsSchema = z
  .array(interviewParticipantInputSchema)
  .min(1, "Aggiungi almeno un partecipante")
  .max(10, "Al massimo 10 partecipanti")
  .refine((p) => p.filter((x) => x.role === "lead").length === 1, {
    message: "Indica un solo conduttore",
  })
  .refine((p) => new Set(p.map((x) => x.userId)).size === p.length, {
    message: "Un partecipante è indicato più volte",
  });

// scheduledAt is an ISO string with offset, converted by the client from the
// datetime-local value
const interviewWhenSchema = {
  scheduledAt: z.iso.datetime({ offset: true, error: "Data e ora non valide" }),
  durationMinutes: z
    .number()
    .int()
    .min(10, "Durata minima 10 minuti")
    .max(480, "Durata massima 480 minuti"),
  meetingUrl: z
    .union([z.url("Link della call non valido"), z.literal("")])
    .optional(),
  participants: participantsSchema,
};

export const scheduleInterviewSchema = z.object({
  applicationId: baseSchemas.id,
  guideId: z.string().min(1, "Seleziona una traccia del colloquio"),
  round: z.number().int().min(1).max(10),
  ...interviewWhenSchema,
});
export type ScheduleInterviewInput = z.infer<typeof scheduleInterviewSchema>;

export const rescheduleInterviewSchema = z.object({
  interviewId: baseSchemas.id,
  ...interviewWhenSchema,
});
export type RescheduleInterviewInput = z.infer<
  typeof rescheduleInterviewSchema
>;

export const interviewIdSchema = z.object({ interviewId: baseSchemas.id });
export type InterviewIdInput = z.infer<typeof interviewIdSchema>;

/** Input of the pending-proposal actions (Pianifica, Scarta) */
export const proposalIdSchema = z.object({ proposalId: baseSchemas.id });
export type ProposalIdInput = z.infer<typeof proposalIdSchema>;

// ====================
// KIT EDITOR
// ====================

export const kitItemInputSchema = z.object({
  // Stored KitItem id; absent = new row
  id: z.string().optional(),
  sectionId: z.string().min(1),
  text: z
    .string()
    .trim()
    .min(3, "Il testo della domanda è troppo corto")
    .max(1000),
  followUps: z.array(z.string().trim().min(1)).max(10).default([]),
  criterionIds: z.array(z.string()).max(10).default([]),
  anchors: criterionAnchorsSchema.optional(),
  required: z.boolean().default(false),
  origin: z.enum(KIT_ITEM_ORIGIN_VALUES).default("manual"),
  rationale: z.string().max(1000).nullish(),
  sourceRef: z.string().max(400).nullish(),
});
export type KitItemInput = z.infer<typeof kitItemInputSchema>;

export const kitHypothesisSchema = z.object({
  criterionId: z.string().min(1),
  hypothesis: z.string().trim().min(3).max(1000),
  howToVerify: z.string().trim().min(3).max(1000),
});
export type KitHypothesis = z.infer<typeof kitHypothesisSchema>;

export const kitChecklistItemSchema = z.object({
  id: z.string().min(1),
  category: z.enum(KIT_CHECKLIST_CATEGORY_VALUES),
  text: z
    .string()
    .trim()
    .min(2, "Voce della checklist troppo corta")
    .max(300),
  done: z.boolean().default(false),
});
export type KitChecklistItem = z.infer<typeof kitChecklistItemSchema>;

export const interviewKitEditorSchema = z.object({
  briefing: z
    .array(z.string().trim().min(1).max(600))
    .max(5, "Il briefing ha al massimo 5 punti")
    .default([]),
  hypotheses: z.array(kitHypothesisSchema).max(15).default([]),
  checklist: z.array(kitChecklistItemSchema).max(30),
  // Order inside a section = order in this list
  items: z.array(kitItemInputSchema).max(80),
  missingSources: z
    .array(z.enum(INTERVIEW_MISSING_SOURCE_VALUES))
    .default([]),
});
export type InterviewKitEditorData = z.infer<typeof interviewKitEditorSchema>;

export const saveInterviewKitSchema = interviewKitEditorSchema.extend({
  interviewId: baseSchemas.id,
});
export type SaveInterviewKitInput = z.infer<typeof saveInterviewKitSchema>;

export const setInterviewKitStatusSchema = z.object({
  interviewId: baseSchemas.id,
  status: z.enum(KIT_STATUS_VALUES),
});
export type SetInterviewKitStatusInput = z.infer<
  typeof setInterviewKitStatusSchema
>;

// ====================
// KIT GENERATION
// ====================

export const generateInterviewKitSchema = z.object({
  interviewId: baseSchemas.id,
  specificModel: z.string().optional(),
});
export type GenerateInterviewKitInput = z.infer<
  typeof generateInterviewKitSchema
>;

// Shape the AI must return: criteria (C1..), test questions (Q1..) and
// previous-round feedback (F1..) by key, never ids
export const aiInterviewKitGenerationSchema = z.object({
  briefing: z.array(z.string()),
  hypotheses: z.array(
    z.object({
      criterionKey: z.string(),
      hypothesis: z.string(),
      howToVerify: z.string(),
    }),
  ),
  items: z.array(
    z.object({
      text: z.string(),
      followUps: z.array(z.string()),
      criterionKeys: z.array(z.string()),
      sectionKind: z.enum(GUIDE_SECTION_KIND_VALUES),
      origin: z.enum(AI_KIT_ITEM_ORIGIN_VALUES),
      rationale: z.string(),
      // Q<n> or F<n>
      sourceKey: z.string().optional(),
      // Origin cv / resume_gap
      cvQuote: z.string().optional(),
      anchors: criterionAnchorsSchema,
    }),
  ),
  suggestedChecklist: z.array(
    z.object({
      category: z.enum(KIT_CHECKLIST_CATEGORY_VALUES),
      text: z.string(),
    }),
  ),
});
export type AiInterviewKitGeneration = z.infer<
  typeof aiInterviewKitGenerationSchema
>;

export type InterviewKitProposalItem = {
  sectionId: string;
  text: string;
  followUps: string[];
  criterionIds: string[];
  anchors: CriterionAnchors;
  required: false;
  origin: AiKitItemOrigin;
  rationale: string;
  sourceRef: string | null;
};

// Result of generation: ids already resolved
export type InterviewKitProposal = {
  // At most 5
  briefing: string[];
  // criterionId resolved, unknown keys dropped
  hypotheses: KitHypothesis[];
  // Already capped
  items: InterviewKitProposalItem[];
  suggestedChecklist: { category: KitChecklistCategory; text: string }[];
  missingSources: InterviewMissingSource[];
};

// ====================
// LIVE NOTES AND INTERVIEWER SCORECARD
// ====================

export const saveKitItemNoteSchema = z.object({
  kitItemId: baseSchemas.id,
  note: z.string().max(4000).nullish(),
  score: z
    .number()
    .int()
    .min(1, "Voto da 1 a 5")
    .max(5, "Voto da 1 a 5")
    .nullish(),
  evidenceQuote: z.string().max(2000).nullish(),
});
export type SaveKitItemNoteInput = z.infer<typeof saveKitItemNoteSchema>;

export const setKitItemCoveredSchema = z.object({
  kitItemId: baseSchemas.id,
  covered: z.boolean(),
});
export type SetKitItemCoveredInput = z.infer<typeof setKitItemCoveredSchema>;

export const criterionScoreInputSchema = z.object({
  criterionId: z.string().min(1),
  // null = not scored, no row stored
  score: z
    .number()
    .int()
    .min(1, "Voto da 1 a 5")
    .max(5, "Voto da 1 a 5")
    .nullable(),
  evidence: z.string().max(4000).nullish(),
});

export const interviewerFeedbackFormSchema = z.object({
  hireRecommendation: z.enum(HIRE_RECOMMENDATION_VALUES).nullable(),
  notes: z.string().max(8000).nullish(),
  redFlags: z.array(z.string().trim().min(2)).max(20).default([]),
  standoutMoments: z.array(z.string().trim().min(2)).max(20).default([]),
  scores: z.array(criterionScoreInputSchema).max(40),
});
export type InterviewerFeedbackFormData = z.infer<
  typeof interviewerFeedbackFormSchema
>;

export const saveInterviewerFeedbackSchema =
  interviewerFeedbackFormSchema.extend({ interviewId: baseSchemas.id });
export type SaveInterviewerFeedbackInput = z.infer<
  typeof saveInterviewerFeedbackSchema
>;

export const submitInterviewerFeedbackSchema =
  saveInterviewerFeedbackSchema.refine(
    (data) => data.hireRecommendation !== null,
    {
      message: "Indica la raccomandazione finale",
      path: ["hireRecommendation"],
    },
  );
