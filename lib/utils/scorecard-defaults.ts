import type { ProposedCriterion } from "@/lib/schemas";

/**
 * Default soft criteria of a scorecard: five soft dimensions with their
 * names and descriptions.
 * Used by the scorecard editor (initial unsaved rows) and by the criteria
 * proposal prompt (so the AI does not propose duplicates).
 * No server imports: also used by a client component.
 */
export const DEFAULT_SOFT_CRITERIA: readonly ProposedCriterion[] = [
  {
    name: "Comunicazione",
    description: "Chiarezza, ascolto, capacità di spiegare",
    category: "soft",
    priority: "must",
    weight: 3,
    expectedLevel: 3,
    anchors: { weak: "", medium: "", strong: "" },
    source: "custom",
  },
  {
    name: "Collaborazione",
    description: "Teamwork, feedback, approccio cooperativo",
    category: "soft",
    priority: "must",
    weight: 3,
    expectedLevel: 3,
    anchors: { weak: "", medium: "", strong: "" },
    source: "custom",
  },
  {
    name: "Problem Solving",
    description: "Struttura mentale, trade-off, decisioni",
    category: "soft",
    priority: "must",
    weight: 3,
    expectedLevel: 3,
    anchors: { weak: "", medium: "", strong: "" },
    source: "custom",
  },
  {
    name: "Culture Fit",
    description: "Allineamento a valori e modalità di lavoro",
    category: "soft",
    priority: "must",
    weight: 3,
    expectedLevel: 3,
    anchors: { weak: "", medium: "", strong: "" },
    source: "custom",
  },
  {
    name: "Leadership",
    description: "Solo per ruoli senior o lead",
    category: "soft",
    priority: "nice",
    weight: 3,
    expectedLevel: 3,
    anchors: { weak: "", medium: "", strong: "" },
    source: "custom",
  },
];
