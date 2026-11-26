import type { CandidatePickerOption } from "@/lib/data/candidates";
import {
  DEFAULT_CANDIDATE_PICKER_FILTERS,
  filterCandidatePickerOptions,
  formatAssociationSummary,
  getCandidatePickerEligibility,
  MAX_CANDIDATE_POSITIONS,
  type CandidatePickerFilters,
} from "@/lib/utils/candidate-picker";
import { describe, expect, it } from "vitest";

type PickerApplication = CandidatePickerOption["applications"][number];

const option = (
  overrides: Partial<CandidatePickerOption> = {},
): CandidatePickerOption => ({
  id: "cand1",
  firstName: "Mario",
  lastName: "Rossi",
  email: "mario.rossi@example.com",
  doNotContact: false,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  applications: [],
  ...overrides,
});

const app = (
  positionId: string,
  stage: PickerApplication["stage"] = "applied",
): PickerApplication => ({
  positionId,
  positionTitle: `Posizione ${positionId}`,
  stage,
});

const filters = (
  overrides: Partial<CandidatePickerFilters> = {},
): CandidatePickerFilters => ({
  ...DEFAULT_CANDIDATE_PICKER_FILTERS,
  ...overrides,
});

const activeOn = (count: number, prefix = "other") =>
  Array.from({ length: count }, (_, i) => app(`${prefix}-${i}`, "screening"));

describe("MAX_CANDIDATE_POSITIONS", () => {
  it("is 10", () => {
    expect(MAX_CANDIDATE_POSITIONS).toBe(10);
  });
});

describe("DEFAULT_CANDIDATE_PICKER_FILTERS", () => {
  it("hides do-not-contact candidates and sorts by name", () => {
    expect(DEFAULT_CANDIDATE_PICKER_FILTERS).toEqual({
      search: "",
      otherPositionId: "all",
      stage: "all",
      hideDoNotContact: true,
      sort: "name",
    });
  });
});

describe("getCandidatePickerEligibility", () => {
  it("is eligible with no application on the position and fewer than 10 active", () => {
    expect(
      getCandidatePickerEligibility(
        option({ applications: activeOn(3) }),
        "pos1",
      ),
    ).toEqual({ status: "eligible" });
  });

  it("is eligible with no application at all", () => {
    expect(getCandidatePickerEligibility(option(), "pos1")).toEqual({
      status: "eligible",
    });
  });

  it("reopens an application withdrawn from the position", () => {
    expect(
      getCandidatePickerEligibility(
        option({ applications: [app("pos1", "withdrawn")] }),
        "pos1",
      ),
    ).toEqual({ status: "reopen" });
  });

  it("reports the stage of a candidate already in the position", () => {
    expect(
      getCandidatePickerEligibility(
        option({ applications: [app("pos1", "interview")] }),
        "pos1",
      ),
    ).toEqual({ status: "already_in_position", stage: "interview" });
  });

  it("treats a rejected application on the position as already in it", () => {
    expect(
      getCandidatePickerEligibility(
        option({ applications: [app("pos1", "rejected")] }),
        "pos1",
      ),
    ).toEqual({ status: "already_in_position", stage: "rejected" });
  });

  it("refuses a candidate with 10 active applications on other positions", () => {
    expect(
      getCandidatePickerEligibility(
        option({ applications: activeOn(10) }),
        "pos1",
      ),
    ).toEqual({ status: "max_positions" });
  });

  it("does not count withdrawn applications toward the limit", () => {
    const applications = [
      ...activeOn(9),
      app("w1", "withdrawn"),
      app("w2", "withdrawn"),
      app("w3", "withdrawn"),
    ];

    expect(
      getCandidatePickerEligibility(option({ applications }), "pos1"),
    ).toEqual({ status: "eligible" });
  });

  it("refuses reopening when the candidate already has 10 active applications", () => {
    const applications = [...activeOn(10), app("pos1", "withdrawn")];

    expect(
      getCandidatePickerEligibility(option({ applications }), "pos1"),
    ).toEqual({ status: "max_positions" });
  });

  it("reports already_in_position before the limit", () => {
    const applications = [...activeOn(9), app("pos1", "offer")];

    expect(applications.filter((a) => a.stage !== "withdrawn")).toHaveLength(10);
    expect(
      getCandidatePickerEligibility(option({ applications }), "pos1"),
    ).toEqual({ status: "already_in_position", stage: "offer" });
  });
});

describe("filterCandidatePickerOptions", () => {
  const mario = option({
    id: "mario",
    firstName: "Mario",
    lastName: "Rossi",
    email: "mario.rossi@example.com",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    applications: [app("posA", "interview")],
  });
  const anna = option({
    id: "anna",
    firstName: "Anna",
    lastName: "Bianchi",
    email: "anna.b@acme.it",
    createdAt: new Date("2026-03-01T00:00:00Z"),
    applications: [app("posB", "screening")],
  });
  const luca = option({
    id: "luca",
    firstName: "Luca",
    lastName: "Rossi",
    email: "luca@example.com",
    doNotContact: true,
    createdAt: new Date("2026-02-01T00:00:00Z"),
    applications: [app("posA", "withdrawn"), app("posB", "applied")],
  });
  const all = [mario, anna, luca];
  const ids = (list: CandidatePickerOption[]) => list.map((o) => o.id);

  it("matches 'nome cognome'", () => {
    expect(
      ids(filterCandidatePickerOptions(all, filters({ search: "mario rossi" }))),
    ).toEqual(["mario"]);
  });

  it("matches 'cognome nome'", () => {
    expect(
      ids(filterCandidatePickerOptions(all, filters({ search: "rossi mario" }))),
    ).toEqual(["mario"]);
  });

  it("matches a substring of the email", () => {
    expect(
      ids(filterCandidatePickerOptions(all, filters({ search: "acme" }))),
    ).toEqual(["anna"]);
  });

  it("trims the search and ignores case", () => {
    expect(
      ids(
        filterCandidatePickerOptions(all, filters({ search: "  MARIO Rossi " })),
      ),
    ).toEqual(["mario"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(
      filterCandidatePickerOptions(all, filters({ search: "zzz" })),
    ).toEqual([]);
  });

  it("keeps candidates with an application, of any stage, to the other position", () => {
    expect(
      ids(
        filterCandidatePickerOptions(
          all,
          filters({ otherPositionId: "posA", hideDoNotContact: false }),
        ),
      ),
    ).toEqual(["luca", "mario"]);
  });

  it("keeps candidates with an application in the stage", () => {
    expect(
      ids(
        filterCandidatePickerOptions(
          all,
          filters({ stage: "applied", hideDoNotContact: false }),
        ),
      ),
    ).toEqual(["luca"]);
    expect(
      ids(filterCandidatePickerOptions(all, filters({ stage: "screening" }))),
    ).toEqual(["anna"]);
  });

  it("drops do-not-contact candidates when hideDoNotContact is on", () => {
    expect(
      ids(filterCandidatePickerOptions(all, filters({ hideDoNotContact: true }))),
    ).not.toContain("luca");
  });

  it("keeps do-not-contact candidates when hideDoNotContact is off", () => {
    expect(
      ids(
        filterCandidatePickerOptions(all, filters({ hideDoNotContact: false })),
      ),
    ).toContain("luca");
  });

  it("sorts by last name then first name", () => {
    expect(
      ids(
        filterCandidatePickerOptions(
          all,
          filters({ sort: "name", hideDoNotContact: false }),
        ),
      ),
    ).toEqual(["anna", "luca", "mario"]);
  });

  it("sorts by newest first (createdAt descending)", () => {
    // anna 2026-03, luca 2026-02, mario 2026-01
    expect(
      ids(
        filterCandidatePickerOptions(
          [mario, luca, anna],
          filters({ sort: "newest", hideDoNotContact: false }),
        ),
      ),
    ).toEqual(["anna", "luca", "mario"]);
  });

  it("sorts differently by name and by newest", () => {
    const older = option({
      id: "older",
      firstName: "Aldo",
      lastName: "Abate",
      createdAt: new Date("2025-01-01T00:00:00Z"),
    });
    const newer = option({
      id: "newer",
      firstName: "Zeno",
      lastName: "Zanetti",
      createdAt: new Date("2026-06-01T00:00:00Z"),
    });

    expect(
      ids(filterCandidatePickerOptions([newer, older], filters({ sort: "name" }))),
    ).toEqual(["older", "newer"]);
    expect(
      ids(
        filterCandidatePickerOptions([older, newer], filters({ sort: "newest" })),
      ),
    ).toEqual(["newer", "older"]);
  });

  it("returns a new array and never mutates the input", () => {
    const input = [mario, luca, anna];
    const copy = [...input];

    const result = filterCandidatePickerOptions(
      input,
      filters({ hideDoNotContact: false }),
    );

    expect(result).not.toBe(input);
    expect(input).toEqual(copy);
    expect(ids(input)).toEqual(["mario", "luca", "anna"]);
  });
});

describe("formatAssociationSummary", () => {
  it.each([
    [1, 0, "1 candidato associato"],
    [3, 0, "3 candidati associati"],
    [2, 1, "2 candidati associati, 1 candidatura riaperta"],
    [0, 2, "0 candidati associati, 2 candidature riaperte"],
    [0, 0, "Nessun nuovo candidato: erano già in selezione"],
  ])("(%i, %i) → %s", (created, reopened, expected) => {
    expect(formatAssociationSummary(created, reopened)).toBe(expected);
  });
});
