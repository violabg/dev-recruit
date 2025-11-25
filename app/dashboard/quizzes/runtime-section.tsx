import { Suspense } from "react";

import { DEFAULT_PAGE_SIZE } from "@/components/ui/url-pagination";
import { FiltersSkeleton, QuizListSkeleton } from "./fallbacks";
import { QuizFiltersSection } from "./quiz-filters-section";
import { QuizListSection } from "./quiz-list-section";

// ===================
// SEARCH PARAMS TYPES
// ===================

export type QuizzesSearchParams = Promise<{
  search?: string;
  sort?: string;
  filter?: string;
  positionId?: string;
  view?: string;
  page?: string;
  pageSize?: string;
}>;

// ===================
// ALLOWED VALUES
// ===================

type QuizSort = "newest" | "oldest" | "a-z" | "z-a";
type QuizView = "table" | "grid";

const SORT_VALUES: QuizSort[] = ["newest", "oldest", "a-z", "z-a"];
const VIEW_VALUES: QuizView[] = ["table", "grid"];

// ===================
// NORMALIZATION FUNCTIONS
// ===================

const normalizeSort = (value?: string): QuizSort =>
  value && SORT_VALUES.includes(value as QuizSort)
    ? (value as QuizSort)
    : "newest";

const normalizeView = (value?: string): QuizView =>
  value && VIEW_VALUES.includes(value as QuizView)
    ? (value as QuizView)
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

export const normalizeSearchParams = (params: {
  search?: string;
  sort?: string;
  filter?: string;
  positionId?: string;
  view?: string;
  page?: string;
  pageSize?: string;
}) => ({
  search: params.search?.trim() ?? "",
  sort: normalizeSort(params.sort),
  filter: params.filter?.trim() || "all",
  positionId: params.positionId?.trim() || "all",
  view: normalizeView(params.view),
  page: normalizePageValue(params.page, 1),
  pageSize: normalizePageValue(params.pageSize, DEFAULT_PAGE_SIZE),
});

export type NormalizedQuizzesParams = ReturnType<typeof normalizeSearchParams>;

// ===================
// RUNTIME SECTION
// ===================

export const QuizzesRuntimeSection = async ({
  searchParams,
}: {
  searchParams: QuizzesSearchParams;
}) => {
  const params = await searchParams;
  const normalizedParams = normalizeSearchParams(params);

  return (
    <>
      <Suspense fallback={<FiltersSkeleton />}>
        <QuizFiltersSection />
      </Suspense>

      <Suspense fallback={<QuizListSkeleton />}>
        <QuizListSection {...normalizedParams} />
      </Suspense>
    </>
  );
};
