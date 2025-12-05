import { SearchAndFilterQuizzesWrapper } from "@/components/quiz/search-and-filter-quizzes-wrapper";
import { Suspense } from "react";
import { FiltersSkeleton, QuizzesRuntimeFallback } from "./fallbacks";
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
      <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-2">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Quiz</h1>
          <p className="text-muted-foreground">
            Gestisci i quiz per le tue posizioni aperte
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NewQuizButton />
        </div>
      </div>

      <div className="@container">
        <div className="space-y-4">
          <Suspense fallback={<FiltersSkeleton />}>
            <SearchAndFilterQuizzesWrapper />
          </Suspense>

          <Suspense fallback={<QuizzesRuntimeFallback />}>
            <QuizzesRuntimeSection searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
