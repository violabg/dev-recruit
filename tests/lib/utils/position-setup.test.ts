import {
  getPositionSetup,
  POSITION_TABS,
  resolvePositionTab,
  SETUP_STEP_LABEL,
  SETUP_STEP_TAB,
  type SetupPart,
} from "@/lib/utils/position-setup";
import { describe, expect, it } from "vitest";

// [activeCriteriaCount, quizCount, guideCount, missing]
const combinations: [number, number, number, SetupPart[]][] = [
  [0, 0, 0, ["scorecard", "quiz", "guide"]],
  [1, 0, 0, ["quiz", "guide"]],
  [0, 2, 0, ["scorecard", "guide"]],
  [0, 0, 3, ["scorecard", "quiz"]],
  [1, 1, 0, ["guide"]],
  [1, 0, 1, ["quiz"]],
  [0, 1, 1, ["scorecard"]],
  [4, 1, 2, []],
];

describe("getPositionSetup", () => {
  it.each(combinations)(
    "criteria %i, quizzes %i, guides %i",
    (activeCriteriaCount, quizCount, guideCount, missing) => {
      const setup = getPositionSetup({
        activeCriteriaCount,
        quizCount,
        guideCount,
      });

      expect(setup.steps).toEqual([
        { key: "details", done: true },
        { key: "scorecard", done: activeCriteriaCount > 0 },
        { key: "quiz", done: quizCount > 0 },
        { key: "guide", done: guideCount > 0 },
      ]);
      expect(setup.missing).toEqual(missing);
      expect(setup.complete).toBe(missing.length === 0);
    },
  );
});

describe("setup labels and tabs", () => {
  it("names every step with the current vocabulary", () => {
    expect(SETUP_STEP_LABEL).toEqual({
      details: "Dettagli",
      scorecard: "Criteri",
      quiz: "Test",
      guide: "Traccia del colloquio",
    });
  });

  it("links every step to a tab of the position page", () => {
    expect(SETUP_STEP_TAB).toEqual({
      details: "dettagli",
      scorecard: "criteri",
      quiz: "criteri",
      guide: "criteri",
    });
    for (const tab of Object.values(SETUP_STEP_TAB)) {
      expect(POSITION_TABS).toContain(tab);
    }
  });

  it("lists the three tabs in order", () => {
    expect(POSITION_TABS).toEqual(["candidati", "criteri", "dettagli"]);
  });
});

describe("resolvePositionTab", () => {
  it.each([
    ["candidati", false, "candidati"],
    ["criteri", true, "criteri"],
    ["dettagli", false, "dettagli"],
    ["selezione", false, "candidati"],
    ["scheda", true, "criteri"],
    ["quiz", true, "criteri"],
    ["guide", true, "criteri"],
    [undefined, true, "candidati"],
    [undefined, false, "criteri"],
    ["boh", true, "candidati"],
  ] as const)(
    "%s with setup %s resolves to %s",
    (raw, setupComplete, expected) => {
      expect(resolvePositionTab(raw, setupComplete)).toBe(expected);
    },
  );
});
