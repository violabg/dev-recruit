import {
  computePositionCoverage,
  coverageFixHref,
} from "@/lib/utils/position-coverage";
import { describe, expect, it } from "vitest";

const criteria = [
  { id: "c1", name: "Leadership", priority: "must" as const, order: 0 },
  { id: "c2", name: "React", priority: "nice" as const, order: 1 },
];

describe("computePositionCoverage", () => {
  it("counts every quiz link and every guide question per criterion", () => {
    const coverage = computePositionCoverage(
      criteria,
      [{ criterionIds: ["c1"] }, { criterionIds: ["c1", "c2"] }],
      [{ criterionIds: ["c2"] }, { criterionIds: ["x"] }],
    );

    expect(coverage.rows).toEqual([
      {
        criterionId: "c1",
        name: "Leadership",
        priority: "must",
        quizQuestionCount: 2,
        guideQuestionCount: 0,
        total: 2,
        uncovered: false,
      },
      {
        criterionId: "c2",
        name: "React",
        priority: "nice",
        quizQuestionCount: 1,
        guideQuestionCount: 1,
        total: 2,
        uncovered: false,
      },
    ]);
    expect(coverage.uncovered).toEqual([]);
  });

  it("marks a criterion with no question as uncovered and leaves one question normal", () => {
    const coverage = computePositionCoverage(
      criteria,
      [{ criterionIds: ["c2"] }],
      [],
    );

    const [c1, c2] = coverage.rows;
    expect(c1.total).toBe(0);
    expect(c1.uncovered).toBe(true);
    expect(c2.total).toBe(1);
    expect(c2.uncovered).toBe(false);
    expect(coverage.uncovered).toEqual([c1]);
  });

  it("ignores ids that are not among the active criteria", () => {
    const coverage = computePositionCoverage(
      criteria,
      [{ criterionIds: ["x", "c1"] }],
      [{ criterionIds: ["x"] }],
    );

    expect(coverage.rows.map((row) => row.criterionId)).toEqual(["c1", "c2"]);
    expect(coverage.uncovered.map((row) => row.criterionId)).toEqual(["c2"]);
  });

  it("keeps the input order of the criteria", () => {
    const coverage = computePositionCoverage(
      [criteria[1], criteria[0]],
      [],
      [],
    );

    expect(coverage.rows.map((row) => row.criterionId)).toEqual(["c2", "c1"]);
    expect(coverage.uncovered.map((row) => row.criterionId)).toEqual([
      "c2",
      "c1",
    ]);
  });
});

describe("coverageFixHref", () => {
  it("opens the editor of the first traccia, preselecting the criterion", () => {
    expect(coverageFixHref("p1", [{ id: "g1", round: 1 }], "c1")).toBe(
      "/dashboard/positions/p1/guides/g1/edit?criterio=c1",
    );
  });

  it("opens the new traccia page when the position has no traccia", () => {
    expect(coverageFixHref("p1", [], "c1")).toBe(
      "/dashboard/positions/p1/guides/new?criterio=c1",
    );
  });
});
