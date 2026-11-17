import {
  DECISION_OUTCOME_LABEL,
  DECISION_OUTCOME_OPTIONS,
  mustWarningText,
  scoreTintClass,
} from "@/components/applications/decision/decision-presentation";
import { describe, expect, it } from "vitest";

describe("DECISION_OUTCOME_LABEL", () => {
  it("labels the three outcomes in Italian", () => {
    expect(DECISION_OUTCOME_LABEL).toEqual({
      offer: "Offerta",
      hired: "Assunto",
      rejected: "Scartato",
    });
  });

  it("offers the outcomes in the order offer, hired, rejected", () => {
    expect(DECISION_OUTCOME_OPTIONS).toEqual([
      { value: "offer", label: "Offerta" },
      { value: "hired", label: "Assunto" },
      { value: "rejected", label: "Scartato" },
    ]);
  });
});

describe("mustWarningText", () => {
  it("describes a must criterion without evidence", () => {
    expect(
      mustWarningText({
        criterionId: "c1",
        criterionName: "React",
        kind: "no_evidence",
        value: null,
        expectedLevel: 4,
      }),
    ).toBe("React: nessuna prova");
  });

  it("describes a must criterion below the expected level", () => {
    expect(
      mustWarningText({
        criterionId: "c1",
        criterionName: "React",
        kind: "below_expected",
        value: 2.5,
        expectedLevel: 4,
      }),
    ).toBe("React: sotto il livello atteso (2.5 su 4)");
  });
});

describe("scoreTintClass", () => {
  it("is muted without a value", () => {
    expect(scoreTintClass(null, 3)).toBe("bg-muted text-muted-foreground");
  });

  it("is success at or above the expected level", () => {
    expect(scoreTintClass(3, 3)).toBe("bg-success/10 text-success");
    expect(scoreTintClass(4.5, 3)).toBe("bg-success/10 text-success");
  });

  it("is warning up to one point below the expected level", () => {
    expect(scoreTintClass(2, 3)).toBe("bg-warning/10 text-warning");
    expect(scoreTintClass(2.5, 3)).toBe("bg-warning/10 text-warning");
  });

  it("is destructive lower than that", () => {
    expect(scoreTintClass(1.9, 3)).toBe("bg-destructive/10 text-destructive");
  });
});
