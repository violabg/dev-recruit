import PageHeader from "@/components/page-header";
import PositionLevelOptions from "@/components/positions/position-level-options";
import PositionOptions from "@/components/positions/position-options";
import { SearchAndFilterQuizzes } from "@/components/quiz/search-and-filter-quizzes";
import { Suspense } from "react";
import { FiltersSkeleton, QuizListSkeleton } from "./fallbacks";
import { NewQuizButton } from "./new-quiz-button";
import {
  QuizzesRuntimeSection,
  type QuizzesSearchParams,
} from "./runtime-section";

/**
 * CACHE COMPONENTS ARCHITECTURE:
 *
 * This page uses Cache Components for optimal performance:
 *
 * 1. Static Shell (prerendered at build time):
 *    - Page title, navigation buttons
 *
 * 2. Runtime Section (with nested Suspense boundaries):
 *    - QuizFiltersSection: Cached filter options (uniqueLevels, positions)
 *    - QuizListSection: Cached quiz data with search/filter/sort
 *
 * 3. Caching Strategy:
 *    - Filter options tagged "quizzes" + "positions"
 *    - Quiz list tagged "quizzes"
 *    - Both use "hours" cache lifetime
 *
 * Dynamic search/sort/filter triggers fresh fetch via searchParams
 */
export default async function QuizzesPage({
  searchParams,
}: {
  searchParams: QuizzesSearchParams;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quiz"
        description="Gestisci i quiz per le tue posizioni aperte"
        actionBtns={<NewQuizButton />}
      />
      <div className="@container space-y-6">
        <Suspense fallback={<FiltersSkeleton />}>
          <SearchAndFilterQuizzes
            levelsOptions={<PositionLevelOptions />}
            positionOptions={<PositionOptions />}
          />
        </Suspense>

        <Suspense fallback={<QuizListSkeleton />}>
          <QuizzesRuntimeSection searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
