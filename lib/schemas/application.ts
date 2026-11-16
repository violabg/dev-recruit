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
