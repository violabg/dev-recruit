import { getPositionStatusPresentation } from "@/components/positions/position-status";
import type { QuizPickerOption } from "@/lib/data/quizzes";
import type { QuestionType } from "@/lib/prisma/client";

export type QuizPickerFilters = {
  search: string;
  /** "all" or a position id */
  positionId: string;
  /** quiz must contain at least one question of EACH listed type; [] = no filter */
  questionTypes: QuestionType[];
  /** "all" or an experienceLevel value */
  level: string;
  sort: "newest" | "title";
};

export const DEFAULT_QUIZ_PICKER_FILTERS: QuizPickerFilters = {
  search: "",
  positionId: "all",
  questionTypes: [],
  level: "all",
  sort: "newest",
};

type PickerItem = { value: string; label: string };

/** Quizzes that can be added: the ones of this position are never offered. */
export function getAddableQuizOptions(
  options: QuizPickerOption[],
  positionId: string
): QuizPickerOption[] {
  return options.filter((option) => option.position.id !== positionId);
}

/** Applies the picker filters and sort; returns a new array. */
export function filterQuizPickerOptions(
  options: QuizPickerOption[],
  filters: QuizPickerFilters
): QuizPickerOption[] {
  const q = filters.search.trim().toLowerCase();

  const filtered = options.filter(
    (option) =>
      (q === "" || option.title.toLowerCase().includes(q)) &&
      (filters.positionId === "all" ||
        option.position.id === filters.positionId) &&
      filters.questionTypes.every((type) =>
        option.questionTypes.includes(type)
      ) &&
      (filters.level === "all" ||
        option.position.experienceLevel === filters.level)
  );

  if (filters.sort === "title") {
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title, "it"));
  }

  return [...filtered].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

/**
 * Owning-position filter items: the positions of the offered quizzes, any
 * status; draft and closed ones carry their status label.
 */
export function getQuizPickerPositionItems(
  options: QuizPickerOption[]
): PickerItem[] {
  const positions = new Map<string, QuizPickerOption["position"]>();
  for (const option of options) {
    positions.set(option.position.id, option.position);
  }

  const items = [...positions.values()]
    .sort((a, b) => a.title.localeCompare(b.title, "it"))
    .map((position) => ({
      value: position.id,
      label:
        position.status === "open"
          ? position.title
          : `${position.title} · ${getPositionStatusPresentation(position.status).label}`,
    }));

  return [{ value: "all", label: "Tutte le posizioni" }, ...items];
}

/** Level filter items: the experience levels of the owning positions. */
export function getQuizPickerLevelItems(
  options: QuizPickerOption[]
): PickerItem[] {
  const levels = [
    ...new Set(
      options
        .map((option) => option.position.experienceLevel)
        .filter((level) => level !== "")
    ),
  ].sort((a, b) => a.localeCompare(b, "it"));

  return [
    { value: "all", label: "Tutti i livelli" },
    ...levels.map((level) => ({ value: level, label: level })),
  ];
}

/** Whether the position already has a quiz with the same title. */
export function hasTitleOnPosition(
  option: QuizPickerOption,
  positionQuizTitles: string[]
): boolean {
  const title = option.title.trim().toLowerCase();
  return positionQuizTitles.some((t) => t.trim().toLowerCase() === title);
}

/** Toast text after a successful add. */
export function formatQuizAddSummary(count: number): string {
  return count === 1
    ? "1 quiz aggiunto alla posizione"
    : `${count} quiz aggiunti alla posizione`;
}
