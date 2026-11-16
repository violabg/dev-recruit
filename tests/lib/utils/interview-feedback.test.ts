import {
  buildFeedbackPrefill,
  computeCriterionCoverage,
  type CoverageCriterion,
} from "@/lib/utils/interview-feedback";
import { describe, expect, it } from "vitest";

const criteria: CoverageCriterion[] = [
  { id: "c-nice", name: "Comunicazione", priority: "nice", order: 0, archived: false },
  { id: "c-must-2", name: "TypeScript", priority: "must", order: 2, archived: false },
  { id: "c-must-1", name: "React", priority: "must", order: 1, archived: true },
  { id: "c-unused", name: "SQL", priority: "must", order: 3, archived: false },
];

describe("computeCriterionCoverage", () => {
  it("lists only cited criteria, must first then scorecard order", () => {
    const coverage = computeCriterionCoverage(criteria, [
      { id: "i1", criterionIds: ["c-nice", "c-must-2"], covered: false, ownScore: null },
      { id: "i2", criterionIds: ["c-must-1"], covered: false, ownScore: null },
    ]);
    expect(coverage.map((row) => row.criterionId)).toEqual([
      "c-must-1",
      "c-must-2",
      "c-nice",
    ]);
    expect(coverage[0]).toMatchObject({ name: "React", archived: true, priority: "must" });
  });

  it("counts evidence from covered items or the viewer's own score", () => {
    const coverage = computeCriterionCoverage(criteria, [
      { id: "i1", criterionIds: ["c-must-1"], covered: true, ownScore: null },
      { id: "i2", criterionIds: ["c-must-1"], covered: false, ownScore: null },
      { id: "i3", criterionIds: ["c-must-2"], covered: false, ownScore: 4 },
      { id: "i4", criterionIds: ["c-nice"], covered: false, ownScore: null },
    ]);
    const byId = Object.fromEntries(coverage.map((row) => [row.criterionId, row]));
    expect(byId["c-must-1"]).toMatchObject({
      hasEvidence: true,
      coveredCount: 1,
      itemCount: 2,
    });
    expect(byId["c-must-2"]).toMatchObject({
      hasEvidence: true,
      coveredCount: 0,
      itemCount: 1,
    });
    expect(byId["c-nice"]).toMatchObject({ hasEvidence: false, coveredCount: 0 });
  });

  it("ignores criterion ids the scorecard does not know", () => {
    expect(
      computeCriterionCoverage(criteria, [
        { id: "i1", criterionIds: ["deleted"], covered: true, ownScore: 5 },
      ]),
    ).toEqual([]);
  });
});

describe("buildFeedbackPrefill", () => {
  it("rounds the mean of the own scores and joins notes then quotes", () => {
    const prefill = buildFeedbackPrefill(
      [{ id: "c1" }, { id: "c2" }, { id: "c3" }],
      [
        { kitItemId: "i1", criterionIds: ["c1"], note: "Buona risposta", score: 4, evidenceQuote: "uso i generics" },
        { kitItemId: "i2", criterionIds: ["c1", "c2"], note: "  ", score: 5, evidenceQuote: null },
        { kitItemId: "i3", criterionIds: ["c2"], note: null, score: null, evidenceQuote: "nessun test" },
      ],
    );

    expect(prefill).toEqual([
      // mean 4.5 -> 5
      { criterionId: "c1", score: 5, evidence: "Buona risposta\nuso i generics" },
      { criterionId: "c2", score: 5, evidence: "nessun test" },
      { criterionId: "c3", score: null, evidence: "" },
    ]);
  });

  it("rounds a mean below .5 down", () => {
    const [row] = buildFeedbackPrefill(
      [{ id: "c1" }],
      [
        { kitItemId: "i1", criterionIds: ["c1"], note: null, score: 2, evidenceQuote: null },
        { kitItemId: "i2", criterionIds: ["c1"], note: null, score: 3, evidenceQuote: null },
        { kitItemId: "i3", criterionIds: ["c1"], note: null, score: 2, evidenceQuote: null },
      ],
    );
    // 7 / 3 = 2.33
    expect(row.score).toBe(2);
  });
});
