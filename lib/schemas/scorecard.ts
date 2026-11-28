import { z } from "zod";
import { baseSchemas } from "./base";

// ====================
// SCORECARD SCHEMAS
// ====================
// Evaluation scorecard ("Criteri della posizione") of a position and its criteria.

export const CRITERION_CATEGORY_VALUES = ["technical", "soft", "culture"] as const;
export const CRITERION_PRIORITY_VALUES = ["must", "nice"] as const;
export const CRITERION_SOURCE_VALUES = ["skill", "softSkill", "custom"] as const;

export type CriterionCategory = (typeof CRITERION_CATEGORY_VALUES)[number];
export type CriterionPriority = (typeof CRITERION_PRIORITY_VALUES)[number];
export type CriterionSource = (typeof CRITERION_SOURCE_VALUES)[number];

const anchorTextSchema = z
  .string()
  .max(500, "Il testo non può superare 500 caratteri")
  .default("");

// How a weak, a medium and a strong answer sound
export const criterionAnchorsSchema = z.object({
  weak: anchorTextSchema,
  medium: anchorTextSchema,
  strong: anchorTextSchema,
});

export type CriterionAnchors = z.infer<typeof criterionAnchorsSchema>;

// One row of the editor. `id` present = saved criterion, absent = new
export const scorecardCriterionSchema = z.object({
  id: baseSchemas.id.optional(),
  name: z
    .string()
    .trim()
    .min(2, "Il nome del criterio deve contenere almeno 2 caratteri")
    .max(120, "Il nome del criterio non può superare 120 caratteri"),
  description: z
    .string()
    .max(1000, "La descrizione non può superare 1000 caratteri")
    .optional(),
  category: z.enum(CRITERION_CATEGORY_VALUES, {
    error: () => "Categoria non valida",
  }),
  priority: z.enum(CRITERION_PRIORITY_VALUES, {
    error: () => "Priorità non valida",
  }),
  weight: z.int().min(1, "Il peso minimo è 1").max(5, "Il peso massimo è 5"),
  expectedLevel: z
    .int()
    .min(1, "Il livello atteso minimo è 1")
    .max(5, "Il livello atteso massimo è 5"),
  anchors: criterionAnchorsSchema,
  source: z.enum(CRITERION_SOURCE_VALUES, {
    error: () => "Origine non valida",
  }),
});

export type ScorecardCriterionInput = z.infer<typeof scorecardCriterionSchema>;

// Editor form and input of saveScorecardAction. Order = array position.
export const saveScorecardSchema = z.object({
  positionId: baseSchemas.id,
  criteria: z
    .array(scorecardCriterionSchema)
    .max(40, "Sono consentiti al massimo 40 criteri"),
});

export type SaveScorecardInput = z.infer<typeof saveScorecardSchema>;

// Input of generateScorecardCriteriaAction
export const generateScorecardCriteriaSchema = z.object({
  positionId: baseSchemas.id,
  specificModel: z.string().optional(),
});

export type GenerateScorecardCriteriaInput = z.infer<
  typeof generateScorecardCriteriaSchema
>;

// Shape the AI must return: criteria without id
export const aiScorecardGenerationSchema = z.object({
  criteria: z.array(scorecardCriterionSchema.omit({ id: true })),
});

export type ProposedCriterion = Omit<ScorecardCriterionInput, "id">;
