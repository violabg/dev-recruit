import { z } from "zod";
import { baseSchemas } from "./base";
// Imported from the module, never from the barrel, to avoid an import cycle
import { criterionAnchorsSchema } from "./scorecard";

// ====================
// INTERVIEW GUIDE SCHEMAS
// ====================
// Interview guide ("Traccia del colloquio"): a template of a position with ordered
// sections and questions.

export const GUIDE_SECTION_KIND_VALUES = [
  "intro",
  "experience",
  "technical",
  "behavioral",
  "candidate_questions",
  "closing",
] as const;

export type GuideSectionKind = (typeof GUIDE_SECTION_KIND_VALUES)[number];

export const guideQuestionSchema = z.object({
  id: baseSchemas.id.optional(),
  text: z
    .string()
    .trim()
    .min(3, "Il testo della domanda è obbligatorio")
    .max(1000, "La domanda non può superare 1000 caratteri"),
  followUps: z
    .array(z.string().trim().min(1))
    .max(10, "Sono consentiti al massimo 10 approfondimenti"),
  criterionIds: z.array(baseSchemas.id),
  anchors: criterionAnchorsSchema,
  required: z.boolean(),
});

export const guideSectionSchema = z.object({
  id: baseSchemas.id.optional(),
  title: z
    .string()
    .trim()
    .min(2, "Il titolo della sezione deve contenere almeno 2 caratteri")
    .max(120, "Il titolo della sezione non può superare 120 caratteri"),
  minutes: z
    .int()
    .min(1, "La durata minima di una sezione è 1 minuto")
    .max(240, "La durata massima di una sezione è 240 minuti"),
  kind: z.enum(GUIDE_SECTION_KIND_VALUES, {
    error: () => "Tipo di sezione non valido",
  }),
  questions: z
    .array(guideQuestionSchema)
    .max(30, "Sono consentite al massimo 30 domande per sezione"),
});

// Editor form. Order of sections and questions = array position.
export const interviewGuideEditorSchema = z.object({
  title: baseSchemas.title,
  round: z.int().min(1, "Il round minimo è 1").max(10, "Il round massimo è 10"),
  durationMinutes: z
    .int()
    .min(10, "La durata minima è 10 minuti")
    .max(480, "La durata massima è 480 minuti"),
  sections: z
    .array(guideSectionSchema)
    .max(12, "Sono consentite al massimo 12 sezioni"),
});

// Input of upsertInterviewGuideAction: with guideId it updates, without it
// creates for positionId
export const saveInterviewGuideSchema = interviewGuideEditorSchema
  .extend({
    guideId: baseSchemas.id.optional(),
    positionId: baseSchemas.id.optional(),
  })
  .refine((d) => Boolean(d.guideId || d.positionId), {
    message: "La posizione è obbligatoria per creare una traccia",
    path: ["positionId"],
  });

// Input of generateInterviewGuideAction
export const generateInterviewGuideSchema = z.object({
  positionId: baseSchemas.id,
  title: baseSchemas.title,
  round: z.int().min(1).max(10),
  durationMinutes: z.int().min(10).max(480),
  instructions: baseSchemas.instructions,
  specificModel: z.string().optional(),
});

// Shape the AI must return: criteria by key (C1, C2, ...), no ids
export const aiInterviewGuideGenerationSchema = z.object({
  sections: z.array(
    z.object({
      title: z.string(),
      minutes: z.number(),
      kind: z.enum(GUIDE_SECTION_KIND_VALUES),
      questions: z.array(
        z.object({
          text: z.string(),
          followUps: z.array(z.string()),
          criterionKeys: z.array(z.string()),
          anchors: criterionAnchorsSchema,
          required: z.boolean(),
        }),
      ),
    }),
  ),
});

export type GuideQuestionInput = z.infer<typeof guideQuestionSchema>;
export type GuideSectionInput = z.infer<typeof guideSectionSchema>;
export type InterviewGuideEditorData = z.infer<
  typeof interviewGuideEditorSchema
>;
export type SaveInterviewGuideInput = z.infer<typeof saveInterviewGuideSchema>;
export type GenerateInterviewGuideInput = z.infer<
  typeof generateInterviewGuideSchema
>;

// Result of generation: sections without ids, criteria already resolved to ids
export type GeneratedInterviewGuide = {
  sections: Omit<GuideSectionInput, "id">[];
};
