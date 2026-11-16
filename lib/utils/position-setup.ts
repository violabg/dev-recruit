/**
 * Setup steps of a position: the single rule used by the setup checklist of the
 * position page and by "Le mie azioni".
 * Pure module: no server imports.
 */

export const POSITION_TABS = [
  "dettagli",
  "scheda",
  "selezione",
  "quiz",
  "guide",
] as const;

export type PositionTab = (typeof POSITION_TABS)[number];

export type SetupPart = "scorecard" | "quiz" | "guide";

export type PositionSetup = {
  steps: { key: "details" | SetupPart; done: boolean }[];
  missing: SetupPart[];
  complete: boolean;
};

/**
 * Details are always done; the scorecard is done with at least one active
 * criterion, the quiz with at least one quiz, the guide with at least one
 * guide. `missing` lists the parts not done in the order scorecard, quiz, guide.
 */
export function getPositionSetup(counts: {
  activeCriteriaCount: number;
  quizCount: number;
  guideCount: number;
}): PositionSetup {
  const done: Record<SetupPart, boolean> = {
    scorecard: counts.activeCriteriaCount > 0,
    quiz: counts.quizCount > 0,
    guide: counts.guideCount > 0,
  };

  const parts: SetupPart[] = ["scorecard", "quiz", "guide"];
  const missing = parts.filter((part) => !done[part]);

  return {
    steps: [
      { key: "details", done: true },
      ...parts.map((part) => ({ key: part, done: done[part] })),
    ],
    missing,
    complete: missing.length === 0,
  };
}

export const SETUP_STEP_LABEL: Record<"details" | SetupPart, string> = {
  details: "Dettagli",
  scorecard: "Scheda di valutazione",
  quiz: "Quiz",
  guide: "Guida colloquio",
};

export const SETUP_STEP_TAB: Record<"details" | SetupPart, PositionTab> = {
  details: "dettagli",
  scorecard: "scheda",
  quiz: "quiz",
  guide: "guide",
};
