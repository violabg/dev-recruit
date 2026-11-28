/**
 * Setup steps of a position: the single rule used by the tabs of the position
 * page and by "Le mie azioni".
 * Pure module: no server imports.
 */

export const POSITION_TABS = ["candidati", "criteri", "dettagli"] as const;

export type PositionTab = (typeof POSITION_TABS)[number];

/** Tab values of the former five tabs: they open the new tab, without redirect. */
export const LEGACY_POSITION_TABS: Readonly<Record<string, PositionTab>> = {
  selezione: "candidati",
  scheda: "criteri",
  quiz: "criteri",
  guide: "criteri",
};

/**
 * The tab a ?tab= value opens: a current value itself, a legacy value its new
 * tab, anything else the setup-based default (criteri while incomplete).
 */
export function resolvePositionTab(
  raw: string | undefined,
  setupComplete: boolean,
): PositionTab {
  if (raw && (POSITION_TABS as readonly string[]).includes(raw)) {
    return raw as PositionTab;
  }
  if (raw && raw in LEGACY_POSITION_TABS) {
    return LEGACY_POSITION_TABS[raw];
  }
  return setupComplete ? "candidati" : "criteri";
}

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
  scorecard: "Criteri",
  quiz: "Test",
  guide: "Traccia del colloquio",
};

/** Every missing part is set up in the "Criteri e domande" tab. */
export const SETUP_STEP_TAB: Record<"details" | SetupPart, PositionTab> = {
  details: "dettagli",
  scorecard: "criteri",
  quiz: "criteri",
  guide: "criteri",
};
