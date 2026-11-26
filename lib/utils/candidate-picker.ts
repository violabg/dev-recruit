import type { CandidatePickerOption } from "@/lib/data/candidates";
import type { ApplicationStage } from "@/lib/prisma/client";

/** A candidate has 1–10 positions: the 11th is refused. */
export const MAX_CANDIDATE_POSITIONS = 10;

export type CandidatePickerEligibility =
  | { status: "eligible" }
  | { status: "reopen" }
  | { status: "already_in_position"; stage: ApplicationStage }
  | { status: "max_positions" };

export type CandidatePickerFilters = {
  search: string;
  /** "all" or a position id */
  otherPositionId: string;
  stage: ApplicationStage | "all";
  hideDoNotContact: boolean;
  sort: "newest" | "name";
};

export const DEFAULT_CANDIDATE_PICKER_FILTERS: CandidatePickerFilters = {
  search: "",
  otherPositionId: "all",
  stage: "all",
  hideDoNotContact: true,
  sort: "name",
};

/**
 * Whether the candidate can be associated with the position. The server
 * enforces the same rules.
 */
export function getCandidatePickerEligibility(
  option: CandidatePickerOption,
  positionId: string
): CandidatePickerEligibility {
  const current = option.applications.find((a) => a.positionId === positionId);

  if (current && current.stage !== "withdrawn") {
    return { status: "already_in_position", stage: current.stage };
  }

  const active = option.applications.filter(
    (a) => a.stage !== "withdrawn"
  ).length;
  if (active >= MAX_CANDIDATE_POSITIONS) {
    return { status: "max_positions" };
  }

  if (current) {
    // Withdrawn on this position
    return { status: "reopen" };
  }

  return { status: "eligible" };
}

/** Applies the picker filters and sort; returns a new array. */
export function filterCandidatePickerOptions(
  options: CandidatePickerOption[],
  filters: CandidatePickerFilters
): CandidatePickerOption[] {
  const q = filters.search.trim().toLowerCase();

  const filtered = options.filter((option) => {
    if (q !== "") {
      const matches =
        `${option.firstName} ${option.lastName}`.toLowerCase().includes(q) ||
        `${option.lastName} ${option.firstName}`.toLowerCase().includes(q) ||
        option.email.toLowerCase().includes(q);
      if (!matches) return false;
    }

    if (
      filters.otherPositionId !== "all" &&
      !option.applications.some(
        (a) => a.positionId === filters.otherPositionId
      )
    ) {
      return false;
    }

    if (
      filters.stage !== "all" &&
      !option.applications.some((a) => a.stage === filters.stage)
    ) {
      return false;
    }

    if (filters.hideDoNotContact && option.doNotContact) {
      return false;
    }

    return true;
  });

  if (filters.sort === "newest") {
    return [...filtered].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  return [...filtered].sort(
    (a, b) =>
      a.lastName.localeCompare(b.lastName, "it") ||
      a.firstName.localeCompare(b.firstName, "it")
  );
}

/** Toast text after a successful association. */
export function formatAssociationSummary(
  createdCount: number,
  reopenedCount: number
): string {
  if (createdCount === 0 && reopenedCount === 0) {
    return "Nessun nuovo candidato: erano già in selezione";
  }

  const created =
    createdCount === 1
      ? "1 candidato associato"
      : `${createdCount} candidati associati`;

  if (reopenedCount > 0) {
    const reopened =
      reopenedCount === 1
        ? "1 candidatura riaperta"
        : `${reopenedCount} candidature riaperte`;
    return `${created}, ${reopened}`;
  }

  return created;
}
