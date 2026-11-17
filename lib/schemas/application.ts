import { z } from "zod";
import { baseSchemas } from "./base";

// ====================
// APPLICATION SCHEMAS
// ====================
// A candidacy: one candidate for one position. The stage lives here, never
// on the candidate.

export const APPLICATION_STAGE_VALUES = [
  "applied",
  "screening",
  "assessment",
  "interview",
  "decision",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
] as const;

export const applicationStageSchema = z.enum(APPLICATION_STAGE_VALUES, {
  error: () => "Fase della candidatura non valida",
});

export type ApplicationStage = z.infer<typeof applicationStageSchema>;

export const moveApplicationStageSchema = z.object({
  applicationId: baseSchemas.id,
  stage: applicationStageSchema,
});

export type MoveApplicationStageInput = z.infer<
  typeof moveApplicationStageSchema
>;

export const applicationOwnerSchema = z.object({
  applicationId: baseSchemas.id,
  owner: z.enum(["me", "none"], {
    error: () => "Responsabile non valido",
  }),
});

export type ApplicationOwnerInput = z.infer<typeof applicationOwnerSchema>;

// ====================
// DECISION SCHEMAS
// ====================

export const DECISION_OUTCOME_VALUES = ["offer", "hired", "rejected"] as const;

export const decisionOutcomeSchema = z.enum(DECISION_OUTCOME_VALUES, {
  error: () => "Esito della decisione non valido",
});

// Structurally equal to DecisionOutcome of lib/utils/application-stage.ts
export type DecisionOutcomeValue = z.infer<typeof decisionOutcomeSchema>;

export const decisionRationaleSchema = z
  .string()
  .trim()
  .min(10, "La motivazione deve avere almeno 10 caratteri")
  .max(5000, "La motivazione può avere al massimo 5000 caratteri");

export const recordApplicationDecisionSchema = z.object({
  applicationId: baseSchemas.id,
  outcome: decisionOutcomeSchema,
  rationale: decisionRationaleSchema,
});

export type RecordApplicationDecisionInput = z.infer<
  typeof recordApplicationDecisionSchema
>;

/** Application.decisionWeights: criterionId -> weight 1-5 used at decision time */
export const decisionWeightsSchema = z.record(
  z.string(),
  z.int().min(1).max(5),
);

export type DecisionWeights = z.infer<typeof decisionWeightsSchema>;

export const challengeDecisionSchema = z.object({
  applicationId: baseSchemas.id,
  outcome: decisionOutcomeSchema,
  rationale: z
    .string()
    .trim()
    .max(5000, "La motivazione può avere al massimo 5000 caratteri")
    .optional(),
  specificModel: z.string().optional(),
});

export type ChallengeDecisionInput = z.infer<typeof challengeDecisionSchema>;

// AI output: criterion KEYS (C1, C2…), never ids
export const aiDecisionChallengeSchema = z.object({
  reasons: z.array(
    z.object({
      title: z.string(),
      explanation: z.string(),
      criterionKeys: z.array(z.string()),
    }),
  ),
});

export type AiDecisionChallenge = z.infer<typeof aiDecisionChallengeSchema>;

export type DecisionChallengeReason = {
  title: string;
  explanation: string;
  criterionIds: string[];
};

// 1..5 reasons
export type DecisionChallenge = { reasons: DecisionChallengeReason[] };
