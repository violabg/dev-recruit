import {
  aiScorecardGenerationSchema,
  saveScorecardSchema,
  scorecardCriterionSchema,
} from "@/lib/schemas";
import { describe, expect, it } from "vitest";

const validCriterion = {
  name: "React",
  description: "Componenti manutenibili",
  category: "technical",
  priority: "must",
  weight: 3,
  expectedLevel: 3,
  anchors: { weak: "debole", medium: "media", strong: "forte" },
  source: "skill",
};

const firstMessage = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe("scorecardCriterionSchema", () => {
  it("accepts a complete criterion", () => {
    expect(scorecardCriterionSchema.safeParse(validCriterion).success).toBe(
      true,
    );
  });

  it.each(["technical", "soft", "culture"])("accepts category %s", (category) => {
    expect(
      scorecardCriterionSchema.safeParse({ ...validCriterion, category })
        .success,
    ).toBe(true);
  });

  it("refuses another category with the Italian message", () => {
    const result = scorecardCriterionSchema.safeParse({
      ...validCriterion,
      category: "management",
    });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("Categoria non valida");
  });

  it.each(["must", "nice"])("accepts priority %s", (priority) => {
    expect(
      scorecardCriterionSchema.safeParse({ ...validCriterion, priority })
        .success,
    ).toBe(true);
  });

  it("refuses another priority", () => {
    const result = scorecardCriterionSchema.safeParse({
      ...validCriterion,
      priority: "optional",
    });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("Priorità non valida");
  });

  it.each(["skill", "softSkill", "custom"])("accepts source %s", (source) => {
    expect(
      scorecardCriterionSchema.safeParse({ ...validCriterion, source }).success,
    ).toBe(true);
  });

  it("refuses another source", () => {
    const result = scorecardCriterionSchema.safeParse({
      ...validCriterion,
      source: "ai",
    });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("Origine non valida");
  });

  it.each([1, 5])("accepts weight and expected level %i", (value) => {
    expect(
      scorecardCriterionSchema.safeParse({
        ...validCriterion,
        weight: value,
        expectedLevel: value,
      }).success,
    ).toBe(true);
  });

  it.each([
    [0, "Il peso minimo è 1"],
    [6, "Il peso massimo è 5"],
  ])("refuses weight %i", (weight, message) => {
    const result = scorecardCriterionSchema.safeParse({
      ...validCriterion,
      weight,
    });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe(message);
  });

  it.each([
    [0, "Il livello atteso minimo è 1"],
    [6, "Il livello atteso massimo è 5"],
  ])("refuses expected level %i", (expectedLevel, message) => {
    const result = scorecardCriterionSchema.safeParse({
      ...validCriterion,
      expectedLevel,
    });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe(message);
  });

  it("refuses non-integer weight and expected level", () => {
    expect(
      scorecardCriterionSchema.safeParse({ ...validCriterion, weight: 2.5 })
        .success,
    ).toBe(false);
    expect(
      scorecardCriterionSchema.safeParse({
        ...validCriterion,
        expectedLevel: 3.2,
      }).success,
    ).toBe(false);
  });

  it("requires anchors as the three texts weak, medium, strong", () => {
    expect(
      scorecardCriterionSchema.safeParse({
        ...validCriterion,
        anchors: "debole / media / forte",
      }).success,
    ).toBe(false);
    expect(
      scorecardCriterionSchema.safeParse({
        ...validCriterion,
        anchors: ["debole", "media", "forte"],
      }).success,
    ).toBe(false);
    expect(
      scorecardCriterionSchema.safeParse({
        ...validCriterion,
        anchors: { weak: 1, medium: "media", strong: "forte" },
      }).success,
    ).toBe(false);
  });

  it("fills missing anchor texts with an empty string", () => {
    const result = scorecardCriterionSchema.parse({
      ...validCriterion,
      anchors: { weak: "debole" },
    });
    expect(result.anchors).toEqual({ weak: "debole", medium: "", strong: "" });
  });

  it("refuses a name shorter than 2 characters (after trim)", () => {
    const result = scorecardCriterionSchema.safeParse({
      ...validCriterion,
      name: " R ",
    });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe(
      "Il nome del criterio deve contenere almeno 2 caratteri",
    );
  });
});

describe("saveScorecardSchema", () => {
  it("accepts up to 40 criteria and an empty list", () => {
    expect(
      saveScorecardSchema.safeParse({
        positionId: "pos-1",
        criteria: Array.from({ length: 40 }, () => validCriterion),
      }).success,
    ).toBe(true);
    expect(
      saveScorecardSchema.safeParse({ positionId: "pos-1", criteria: [] })
        .success,
    ).toBe(true);
  });

  it("refuses more than 40 criteria", () => {
    const result = saveScorecardSchema.safeParse({
      positionId: "pos-1",
      criteria: Array.from({ length: 41 }, () => validCriterion),
    });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("Sono consentiti al massimo 40 criteri");
  });
});

describe("aiScorecardGenerationSchema", () => {
  it("has no id: an id sent by the model is stripped", () => {
    const result = aiScorecardGenerationSchema.parse({
      criteria: [{ ...validCriterion, id: "c-1" }],
    });
    expect(result.criteria[0]).not.toHaveProperty("id");
  });
});
