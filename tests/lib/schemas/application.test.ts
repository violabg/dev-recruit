import {
  APPLICATION_STAGE_VALUES,
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
