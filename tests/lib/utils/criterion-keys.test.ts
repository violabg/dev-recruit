import {
  buildCriterionKeys,
  resolveCriterionKeys,
} from "@/lib/utils/criterion-keys";
import { describe, expect, it } from "vitest";

const criteria = [
  { id: "c-a", name: "React" },
  { id: "c-b", name: "TypeScript" },
  { id: "c-c", name: "Comunicazione" },
];

describe("buildCriterionKeys", () => {
  it("assigns C1..Cn in the order of the input and keeps the fields", () => {
    expect(buildCriterionKeys(criteria)).toEqual([
      { id: "c-a", name: "React", key: "C1" },
      { id: "c-b", name: "TypeScript", key: "C2" },
      { id: "c-c", name: "Comunicazione", key: "C3" },
    ]);
  });

  it("returns [] for no criteria", () => {
    expect(buildCriterionKeys([])).toEqual([]);
  });
});

describe("resolveCriterionKeys", () => {
  const keyed = buildCriterionKeys(criteria);

  it("resolves keys to ids, ignoring case and spaces", () => {
    expect(resolveCriterionKeys(keyed, [" c2 ", "C1"])).toEqual([
      "c-b",
      "c-a",
    ]);
  });

  it("drops unknown keys and duplicates, keeping the order", () => {
    expect(
      resolveCriterionKeys(keyed, ["C3", "C9", "c3", "C1", "X"]),
    ).toEqual(["c-c", "c-a"]);
  });

  it("returns [] for undefined", () => {
    expect(resolveCriterionKeys(keyed, undefined)).toEqual([]);
  });
});
