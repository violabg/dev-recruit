import {
  getPositionSetup,
  POSITION_TABS,
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
  it("names every step in Italian", () => {
    expect(SETUP_STEP_LABEL).toEqual({
      details: "Dettagli",
      scorecard: "Scheda di valutazione",
      quiz: "Quiz",
      guide: "Guida colloquio",
    });
  });

  it("links every step to a tab of the position page", () => {
    expect(SETUP_STEP_TAB).toEqual({
      details: "dettagli",
      scorecard: "scheda",
      quiz: "quiz",
      guide: "guide",
    });
    for (const tab of Object.values(SETUP_STEP_TAB)) {
      expect(POSITION_TABS).toContain(tab);
    }
  });

  it("lists the five tabs in order", () => {
    expect(POSITION_TABS).toEqual([
      "dettagli",
      "scheda",
      "selezione",
      "quiz",
      "guide",
    ]);
  });
});
