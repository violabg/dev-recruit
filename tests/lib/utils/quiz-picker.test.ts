import type { QuizPickerOption } from "@/lib/data/quizzes";
import {
  DEFAULT_QUIZ_PICKER_FILTERS,
  filterQuizPickerOptions,
  formatQuizAddSummary,
  getAddableQuizOptions,
  getQuizPickerLevelItems,
  getQuizPickerPositionItems,
  hasTitleOnPosition,
  type QuizPickerFilters,
} from "@/lib/utils/quiz-picker";
import { describe, expect, it } from "vitest";

const position = (
  overrides: Partial<QuizPickerOption["position"]> = {},
): QuizPickerOption["position"] => ({
  id: "pos-2",
  title: "Backend",
  experienceLevel: "senior",
  status: "open",
  ...overrides,
});

const option = (
  overrides: Partial<QuizPickerOption> = {},
): QuizPickerOption => ({
  id: "quiz1",
  title: "Quiz React",
  timeLimit: 30,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  questionCount: 5,
  questionTypes: ["multiple_choice"],
  position: position(),
  ...overrides,
});

const filters = (
  overrides: Partial<QuizPickerFilters> = {},
): QuizPickerFilters => ({
  ...DEFAULT_QUIZ_PICKER_FILTERS,
  ...overrides,
});

const ids = (options: QuizPickerOption[]) => options.map((o) => o.id);

describe("DEFAULT_QUIZ_PICKER_FILTERS", () => {
  it("applies no filter and sorts by newest", () => {
    expect(DEFAULT_QUIZ_PICKER_FILTERS).toEqual({
      search: "",
      positionId: "all",
      questionTypes: [],
      level: "all",
      sort: "newest",
    });
  });
});

describe("getAddableQuizOptions", () => {
  it("drops the quizzes that already belong to the position", () => {
    const options = [
      option({ id: "own", position: position({ id: "pos-1" }) }),
      option({ id: "other", position: position({ id: "pos-2" }) }),
    ];

    expect(ids(getAddableQuizOptions(options, "pos-1"))).toEqual(["other"]);
  });

  it("keeps every quiz of other positions, whatever their status", () => {
    const options = [
      option({ id: "a", position: position({ id: "p-a", status: "draft" }) }),
      option({ id: "b", position: position({ id: "p-b", status: "closed" }) }),
    ];

    expect(ids(getAddableQuizOptions(options, "pos-1"))).toEqual(["a", "b"]);
  });
});

describe("filterQuizPickerOptions", () => {
  it("returns every option with the default filters", () => {
    const options = [option({ id: "a" }), option({ id: "b" })];
    expect(filterQuizPickerOptions(options, filters())).toHaveLength(2);
  });

  it("searches the title case-insensitively, ignoring surrounding spaces", () => {
    const options = [
      option({ id: "react", title: "Quiz React Avanzato" }),
      option({ id: "node", title: "Node.js" }),
    ];

    expect(
      ids(filterQuizPickerOptions(options, filters({ search: "  REACT " }))),
    ).toEqual(["react"]);
  });

  it("searches the title only, not the position title", () => {
    const options = [
      option({
        id: "a",
        title: "Quiz base",
        position: position({ title: "React developer" }),
      }),
    ];

    expect(
      filterQuizPickerOptions(options, filters({ search: "react" })),
    ).toEqual([]);
  });

  it("filters by owning position", () => {
    const options = [
      option({ id: "a", position: position({ id: "pos-2" }) }),
      option({ id: "b", position: position({ id: "pos-3" }) }),
    ];

    expect(
      ids(filterQuizPickerOptions(options, filters({ positionId: "pos-3" }))),
    ).toEqual(["b"]);
  });

  it("filters by level of the owning position", () => {
    const options = [
      option({ id: "a", position: position({ experienceLevel: "junior" }) }),
      option({ id: "b", position: position({ experienceLevel: "senior" }) }),
    ];

    expect(
      ids(filterQuizPickerOptions(options, filters({ level: "junior" }))),
    ).toEqual(["a"]);
  });

  it("filters by one question type", () => {
    const options = [
      option({ id: "mc", questionTypes: ["multiple_choice"] }),
      option({ id: "code", questionTypes: ["code_snippet"] }),
    ];

    expect(
      ids(
        filterQuizPickerOptions(
          options,
          filters({ questionTypes: ["code_snippet"] }),
        ),
      ),
    ).toEqual(["code"]);
  });

  it("keeps only quizzes containing every chosen question type", () => {
    const options = [
      option({ id: "both", questionTypes: ["multiple_choice", "code_snippet"] }),
      option({ id: "mc", questionTypes: ["multiple_choice"] }),
      option({ id: "code", questionTypes: ["code_snippet"] }),
    ];

    expect(
      ids(
        filterQuizPickerOptions(
          options,
          filters({ questionTypes: ["multiple_choice", "code_snippet"] }),
        ),
      ),
    ).toEqual(["both"]);
  });

  it("applies no type filter when no type is chosen", () => {
    const options = [
      option({ id: "a", questionTypes: [] }),
      option({ id: "b", questionTypes: ["open_question"] }),
    ];

    expect(
      filterQuizPickerOptions(options, filters({ questionTypes: [] })),
    ).toHaveLength(2);
  });

  it("combines every filter with AND", () => {
    const match = option({
      id: "match",
      title: "React hooks",
      questionTypes: ["open_question", "code_snippet"],
      position: position({ id: "pos-2", experienceLevel: "senior" }),
    });
    const options = [
      match,
      option({ ...match, id: "wrong-title", title: "Vue" }),
      option({
        ...match,
        id: "wrong-position",
        position: position({ id: "pos-3", experienceLevel: "senior" }),
      }),
      option({
        ...match,
        id: "wrong-level",
        position: position({ id: "pos-2", experienceLevel: "junior" }),
      }),
      option({ ...match, id: "wrong-types", questionTypes: ["open_question"] }),
    ];

    expect(
      ids(
        filterQuizPickerOptions(
          options,
          filters({
            search: "react",
            positionId: "pos-2",
            level: "senior",
            questionTypes: ["code_snippet"],
          }),
        ),
      ),
    ).toEqual(["match"]);
  });

  it("sorts newest first by creation date", () => {
    const options = [
      option({ id: "old", createdAt: new Date("2026-01-01T00:00:00Z") }),
      option({ id: "new", createdAt: new Date("2026-03-01T00:00:00Z") }),
      option({ id: "mid", createdAt: new Date("2026-02-01T00:00:00Z") }),
    ];

    expect(ids(filterQuizPickerOptions(options, filters()))).toEqual([
      "new",
      "mid",
      "old",
    ]);
  });

  it("sorts by title with the Italian locale", () => {
    const options = [
      option({ id: "z", title: "Zeta" }),
      option({ id: "e", title: "èlite" }),
      option({ id: "a", title: "alfa" }),
      option({ id: "b", title: "Beta" }),
    ];

    expect(
      ids(filterQuizPickerOptions(options, filters({ sort: "title" }))),
    ).toEqual(["a", "b", "e", "z"]);
  });

  it("returns a new array and leaves the input untouched", () => {
    const options = [
      option({ id: "old", createdAt: new Date("2026-01-01T00:00:00Z") }),
      option({ id: "new", createdAt: new Date("2026-03-01T00:00:00Z") }),
    ];

    const result = filterQuizPickerOptions(options, filters());

    expect(result).not.toBe(options);
    expect(ids(options)).toEqual(["old", "new"]);
  });
});

describe("getQuizPickerPositionItems", () => {
  it("starts with 'Tutte le posizioni'", () => {
    expect(getQuizPickerPositionItems([])).toEqual([
      { value: "all", label: "Tutte le posizioni" },
    ]);
  });

  it("lists each owning position once, sorted by title", () => {
    const options = [
      option({ id: "a", position: position({ id: "p-z", title: "Zeta" }) }),
      option({ id: "b", position: position({ id: "p-a", title: "Alfa" }) }),
      option({ id: "c", position: position({ id: "p-z", title: "Zeta" }) }),
    ];

    expect(getQuizPickerPositionItems(options)).toEqual([
      { value: "all", label: "Tutte le posizioni" },
      { value: "p-a", label: "Alfa" },
      { value: "p-z", label: "Zeta" },
    ]);
  });

  it("marks draft and closed positions with their status label, not open ones", () => {
    const options = [
      option({
        id: "a",
        position: position({ id: "p-1", title: "Aperta", status: "open" }),
      }),
      option({
        id: "b",
        position: position({ id: "p-2", title: "Bozza pos", status: "draft" }),
      }),
      option({
        id: "c",
        position: position({ id: "p-3", title: "Chiusa pos", status: "closed" }),
      }),
    ];

    expect(getQuizPickerPositionItems(options)).toEqual([
      { value: "all", label: "Tutte le posizioni" },
      { value: "p-1", label: "Aperta" },
      { value: "p-2", label: "Bozza pos · Bozza" },
      { value: "p-3", label: "Chiusa pos · Chiusa" },
    ]);
  });
});

describe("getQuizPickerLevelItems", () => {
  it("starts with 'Tutti i livelli', lists each level once, sorted, skipping empty levels", () => {
    const options = [
      option({ id: "a", position: position({ experienceLevel: "senior" }) }),
      option({ id: "b", position: position({ experienceLevel: "junior" }) }),
      option({ id: "c", position: position({ experienceLevel: "senior" }) }),
      option({ id: "d", position: position({ experienceLevel: "" }) }),
    ];

    expect(getQuizPickerLevelItems(options)).toEqual([
      { value: "all", label: "Tutti i livelli" },
      { value: "junior", label: "junior" },
      { value: "senior", label: "senior" },
    ]);
  });
});

describe("hasTitleOnPosition", () => {
  it("matches a title ignoring case and surrounding spaces", () => {
    expect(
      hasTitleOnPosition(option({ title: "Quiz React" }), ["  quiz react "]),
    ).toBe(true);
  });

  it("is false when no title matches", () => {
    expect(
      hasTitleOnPosition(option({ title: "Quiz React" }), ["Quiz Vue"]),
    ).toBe(false);
    expect(hasTitleOnPosition(option({ title: "Quiz React" }), [])).toBe(false);
  });
});

describe("formatQuizAddSummary", () => {
  it("uses the singular for one quiz", () => {
    expect(formatQuizAddSummary(1)).toBe("1 test aggiunto alla posizione");
  });

  it("uses the plural for more quizzes", () => {
    expect(formatQuizAddSummary(3)).toBe("3 test aggiunti alla posizione");
  });
});
