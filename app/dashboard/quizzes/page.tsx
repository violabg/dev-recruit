import { QuizCard } from "@/components/quiz/quiz-card";
import { SearchAndFilterQuizzes } from "@/components/quiz/search-and-filter-quizzes";
import { Button } from "@/components/ui/button";
import { getPositions } from "@/lib/data/positions";
import { CachedQuizzesContent, getQuizzes } from "@/lib/data/quizzes";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { QuizCardsSkeleton } from "./fallbacks";

/**
 * CACHE COMPONENTS ARCHITECTURE:
 *
 * This page uses Cache Components for optimal performance:
 *
 * 1. Static Shell (prerendered at build time):
 *    - Page title, navigation buttons
 *    - Search/filter UI (client component)
 *
 * 2. Cached Content (revalidates every hour):
 *    - Quiz cards fetched with CachedQuizzesContent
 *    - Tagged "quizzes" for manual revalidation on mutations
 *    - Wrapped in Suspense with QuizCardsSkeleton fallback
 *
 * 3. Cached Statistics (revalidates every hour):
 *    - Statistics section with position breakdowns
 *    - Tagged "quizzes" for manual revalidation
 *    - Wrapped in Suspense with QuizzesStatisticsSkeleton fallback
 *
 * Dynamic search/sort/filter on client triggers fresh fetch via useSearchParams
 */
export default async function QuizzesPage({
  searchParams,
}: {
  searchParams: any;
}) {
  const params = await searchParams;

  const search = params?.search || "";
  const sort = params?.sort || "newest";
  const filter = params?.filter || "all";
  const positionId = params?.positionId || "all";

  // Fetch unique levels and initial data for filter options
  const { uniqueLevels } = await getQuizzes({
    search: "",
    sort: "newest",
    filter: "all",
    positionId: "all",
  });
  const positions = await getPositions();

  return (
    <div className="space-y-6">
      <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-2">
        <h1 className="font-bold text-3xl">Quiz</h1>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" asChild>
            <Link href="/dashboard/quizzes/new">
              Nuovo quiz
              <Plus className="ml-1 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="@container">
        <div className="space-y-4">
          <SearchAndFilterQuizzes
            uniqueLevels={uniqueLevels}
            positions={positions.map((position) => ({
              id: position.id,
              title: position.title,
            }))}
          />

          <Suspense fallback={<QuizCardsSkeleton />}>
            <QuizzesListContent
              search={search}
              sort={sort}
              filter={filter}
              positionId={positionId}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

/**
 * QuizzesListContent - Cached component rendering quiz cards
 * Fetches and caches quiz data with Cache Components
 */
async function QuizzesListContent({
  search,
  sort,
  filter,
  positionId,
}: {
  search: string;
  sort: string;
  filter: string;
  positionId: string;
}) {
  const { quizzes, fetchError } = await CachedQuizzesContent({
    search,
    sort,
    filter,
    positionId,
  });

  if (fetchError) {
    return (
      <div className="bg-destructive/15 p-4 rounded-md text-destructive">
        <p>Si è verificato un errore nel caricamento dei quiz: {fetchError}</p>
      </div>
    );
  }

  if (!quizzes || quizzes.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center border border-dashed rounded-lg h-[300px]">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            {search || filter !== "all" || positionId !== "all"
              ? "Nessun quiz trovato con i criteri di ricerca specificati."
              : "Nessun quiz creato. Crea un quiz per una posizione."}
          </p>
          <Button className="mt-4" size="sm" asChild>
            <Link href="/dashboard/positions">Vai alle posizioni</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    // Quiz items grid:
    // - 1 column by default.
    // - 2 columns when its container is >= 1060px wide.
    // - 3 columns when its container is >= 1470px wide.
    <div className="gap-4 grid grid-cols-1 @[1060px]:grid-cols-2 @[1470px]:grid-cols-3">
      {quizzes.map((quiz) => (
        <QuizCard key={quiz.id} quiz={quiz} />
      ))}
    </div>
  );
}
