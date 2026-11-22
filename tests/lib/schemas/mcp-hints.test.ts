import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  actionCenterInputSchema,
  createPositionDraftInputSchema,
  kitPatchInputSchema,
  openQuizFormInputSchema,
  proposeInterviewSlotInputSchema,
  quizDraftInputSchema,
} from "@/lib/schemas/mcp";
import { positionFormSchema } from "@/lib/schemas/position";
import { quizEditorSchema } from "@/lib/schemas/quiz";

type JsonSchema = { properties: Record<string, { description?: string; items?: JsonSchema }> };

const json = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as unknown as JsonSchema;

describe("MCP tool input hints", () => {
  it("carries the per-type question fields in the quiz draft schema", () => {
    const { properties } = json(quizDraftInputSchema);

    expect(properties.questions.description).toMatch(/multiple_choice: .*almeno 4/);
    expect(properties.questions.description).toMatch(/code_snippet: .*sampleSolution/);
    expect(properties.timeLimit.description).toMatch(/null senza limite/);
    expect(json(openQuizFormInputSchema).properties.difficulty.description).toMatch(/1.*5/);
  });

  it("carries the scheduling rules in the proposal schema", () => {
    const { properties } = json(proposeInterviewSlotInputSchema);

    expect(properties.scheduledAt.description).toMatch(/ISO con il fuso/);
    expect(properties.participants.description).toMatch(/esattamente un conduttore/);
  });

  it("carries the position and kit rules", () => {
    expect(json(createPositionDraftInputSchema).properties.description.description).toMatch(
      /discriminatori/,
    );
    expect(json(kitPatchInputSchema).properties.removeItemIds.description).toMatch(
      /get_interview_kit/,
    );
    expect(json(actionCenterInputSchema).properties.mineOnly.description).toBeTruthy();
  });

  it("leaves the dashboard schemas without the assistant hints", () => {
    expect(json(quizEditorSchema).properties.questions.description).toBeUndefined();
    expect(json(positionFormSchema).properties.description.description ?? "").not.toMatch(
      /discriminatori/,
    );
  });

  it("keeps the dashboard validation", () => {
    const result = proposeInterviewSlotInputSchema.safeParse({
      applicationId: "a1",
      guideId: "g1",
      round: 1,
      scheduledAt: "2026-11-25T10:00:00+01:00",
      durationMinutes: 60,
      participants: [
        { userId: "u1", role: "observer" },
        { userId: "u2", role: "observer" },
      ],
    });

    expect(result.success).toBe(false);
  });
});
