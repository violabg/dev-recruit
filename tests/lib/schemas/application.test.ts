import {
  aiDecisionChallengeSchema,
  APPLICATION_STAGE_VALUES,
  challengeDecisionSchema,
  DECISION_OUTCOME_VALUES,
  decisionWeightsSchema,
  recordApplicationDecisionSchema,
  applicationOwnerSchema,
  applicationStageSchema,
  moveApplicationStageSchema,
} from "@/lib/schemas/application";
import { describe, expect, it } from "vitest";

describe("applicationStageSchema", () => {
  it("lists the nine stages", () => {
    expect(APPLICATION_STAGE_VALUES).toEqual([
      "applied",
      "screening",
      "assessment",
      "interview",
      "decision",
      "offer",
      "hired",
      "rejected",
      "withdrawn",
    ]);
  });

  it.each(APPLICATION_STAGE_VALUES)("accepts %s", (stage) => {
    expect(applicationStageSchema.parse(stage)).toBe(stage);
  });

  it("refuses an unknown stage with the Italian message", () => {
    const result = applicationStageSchema.safeParse("pending");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Fase della candidatura non valida",
    );
  });
});

describe("moveApplicationStageSchema", () => {
  it("accepts an application id and a stage", () => {
    expect(
      moveApplicationStageSchema.parse({ applicationId: "app1", stage: "offer" }),
    ).toEqual({ applicationId: "app1", stage: "offer" });
  });

  it("refuses a missing application id", () => {
    expect(
      moveApplicationStageSchema.safeParse({ applicationId: "", stage: "offer" })
        .success,
    ).toBe(false);
  });

  it("refuses an invalid stage", () => {
    const result = moveApplicationStageSchema.safeParse({
      applicationId: "app1",
      stage: "archived",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Fase della candidatura non valida",
    );
  });
});

describe("applicationOwnerSchema", () => {
  it.each(["me", "none"])("accepts %s", (owner) => {
    expect(
      applicationOwnerSchema.parse({ applicationId: "app1", owner }),
    ).toEqual({ applicationId: "app1", owner });
  });

  it("refuses another owner value with the Italian message", () => {
    const result = applicationOwnerSchema.safeParse({
      applicationId: "app1",
      owner: "user-123",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Responsabile non valido");
  });
});

describe("recordApplicationDecisionSchema", () => {
  const valid = {
    applicationId: "app1",
    outcome: "offer",
    rationale: "Ottimo profilo tecnico",
  };

  it.each(["offer", "hired", "rejected"])("accepts the outcome %s", (outcome) => {
    expect(
      recordApplicationDecisionSchema.safeParse({ ...valid, outcome }).success,
    ).toBe(true);
  });

  it("lists the three outcomes", () => {
    expect(DECISION_OUTCOME_VALUES).toEqual(["offer", "hired", "rejected"]);
  });

  it("trims the rationale", () => {
    expect(
      recordApplicationDecisionSchema.parse({
        ...valid,
        rationale: "   Ottimo profilo tecnico   ",
      }).rationale,
    ).toBe("Ottimo profilo tecnico");
  });

  it("refuses a rationale shorter than 10 characters after trimming", () => {
    const result = recordApplicationDecisionSchema.safeParse({
      ...valid,
      rationale: "  123456789  ",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "La motivazione deve avere almeno 10 caratteri",
    );
  });

  it("refuses a rationale longer than 5000 characters", () => {
    const result = recordApplicationDecisionSchema.safeParse({
      ...valid,
      rationale: "a".repeat(5001),
    });
    expect(result.error?.issues[0].message).toBe(
      "La motivazione può avere al massimo 5000 caratteri",
    );
  });

  it("refuses the outcome decision with the Italian message", () => {
    const result = recordApplicationDecisionSchema.safeParse({
      ...valid,
      outcome: "decision",
    });
    expect(result.error?.issues[0].message).toBe(
      "Esito della decisione non valido",
    );
  });
});

describe("decisionWeightsSchema", () => {
  it("accepts integer weights from 1 to 5", () => {
    expect(decisionWeightsSchema.parse({ c1: 1, c2: 5 })).toEqual({
      c1: 1,
      c2: 5,
    });
  });

  it.each([0, 6, 2.5])("refuses the weight %s", (weight) => {
    expect(decisionWeightsSchema.safeParse({ c1: weight }).success).toBe(false);
  });
});

describe("challengeDecisionSchema", () => {
  it("accepts a missing rationale", () => {
    expect(
      challengeDecisionSchema.parse({ applicationId: "app1", outcome: "hired" }),
    ).toEqual({ applicationId: "app1", outcome: "hired" });
  });

  it("refuses a rationale longer than 5000 characters", () => {
    expect(
      challengeDecisionSchema.safeParse({
        applicationId: "app1",
        outcome: "hired",
        rationale: "a".repeat(5001),
      }).success,
    ).toBe(false);
  });
});

describe("aiDecisionChallengeSchema", () => {
  it("carries criterion keys, never ids", () => {
    expect(
      aiDecisionChallengeSchema.parse({
        reasons: [{ title: "T", explanation: "E", criterionKeys: ["C1"] }],
      }),
    ).toEqual({
      reasons: [{ title: "T", explanation: "E", criterionKeys: ["C1"] }],
    });
  });
});
