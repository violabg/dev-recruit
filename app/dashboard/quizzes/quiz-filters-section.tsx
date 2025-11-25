import { SearchAndFilterQuizzes } from "@/components/quiz/search-and-filter-quizzes";
import { CachedQuizFilterOptions } from "@/lib/data/quizzes";

/**
 * QuizFiltersSection - Server component that fetches cached filter options
 * Renders the search and filter UI with position/level options
 */
export async function QuizFiltersSection() {
  const { uniqueLevels, positions } = await CachedQuizFilterOptions();

  return (
    <SearchAndFilterQuizzes uniqueLevels={uniqueLevels} positions={positions} />
  );
}
