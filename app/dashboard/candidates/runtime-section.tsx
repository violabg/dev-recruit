import { Suspense } from "react";

import { CandidateFiltersSection } from "./candidate-filters-section";
import { CandidateListSection } from "./candidate-list-section";
import { CandidatesListSkeleton, FiltersSkeleton } from "./fallbacks";

export type CandidatesSearchParams = {
  search?: string;
  status?: string;
  position?: string;
  sort?: string;
  view?: string;
  page?: string;
  pageSize?: string;
};

type CandidateStatus = "all" | "active" | "archived";
type CandidateSort = "newest" | "oldest" | "progress";
type CandidateView = "table" | "grid";

const STATUS_VALUES: CandidateStatus[] = ["all", "active", "archived"];
const SORT_VALUES: CandidateSort[] = ["newest", "oldest", "progress"];
const VIEW_VALUES: CandidateView[] = ["table", "grid"];

const normalizeStatus = (value?: string): CandidateStatus =>
  value && STATUS_VALUES.includes(value as CandidateStatus)
    ? (value as CandidateStatus)
    : "all";

const normalizeSort = (value?: string): CandidateSort =>
  value && SORT_VALUES.includes(value as CandidateSort)
    ? (value as CandidateSort)
    : "newest";

const normalizeView = (value?: string): CandidateView =>
  value && VIEW_VALUES.includes(value as CandidateView)
    ? (value as CandidateView)
    : "table";

const normalizePageValue = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
};

const normalizeSearchParams = (params: CandidatesSearchParams) => ({
  search: params.search?.trim() ?? "",
  status: normalizeStatus(params.status),
  positionId: params.position?.trim() || "all",
  sort: normalizeSort(params.sort),
  view: normalizeView(params.view),
  page: normalizePageValue(params.page, 1),
  pageSize: normalizePageValue(params.pageSize, 15),
});

export const CandidatesRuntimeFallback = () => (
  <div className="space-y-6">
    <FiltersSkeleton />
    <CandidatesListSkeleton />
  </div>
);

export const CandidatesRuntimeSection = async ({
  searchParams,
}: {
  searchParams: CandidatesSearchParams;
}) => {
  const params = await searchParams;
  const { search, status, positionId, sort, view } =
    normalizeSearchParams(params);

  return (
    <>
      <Suspense fallback={<FiltersSkeleton />}>
        <CandidateFiltersSection />
      </Suspense>

      <Suspense fallback={<CandidatesListSkeleton />}>
        <CandidateListSection
          search={search}
          status={status}
          positionId={positionId}
          sort={sort}
          view={view}
        />
      </Suspense>
    </>
  );
};
