import { QuizGrid } from "@/components/quiz/quiz-grid";
import { QuizTable } from "@/components/quiz/quiz-table";
import { SearchAndFilterQuizzes } from "@/components/quiz/search-and-filter-quizzes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPositions } from "@/lib/data/positions";
import { CachedQuizzesContent, getQuizzes } from "@/lib/data/quizzes";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { QuizListSkeleton } from "./fallbacks";

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
 *    - Quiz cards/table fetched with CachedQuizzesContent
 *    - Tagged "quizzes" for manual revalidation on mutations
 *    - Wrapped in Suspense with QuizListSkeleton fallback
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
  const view = params?.view || "table";

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
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Quiz</h1>
          <p className="text-muted-foreground">
            Gestisci i quiz per le tue posizioni aperte
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" asChild>
            <Link href="/dashboard/quizzes/new">
              <Plus className="mr-1 w-4 h-4" />
              Nuovo quiz
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

          <Suspense fallback={<QuizListSkeleton />}>
            <QuizzesListContent
              search={search}
              sort={sort}
              filter={filter}
              positionId={positionId}
              view={view}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

/**
 * QuizzesListContent - Cached component rendering quiz cards or table
 * Fetches and caches quiz data with Cache Components
 */
async function QuizzesListContent({
  search,
  sort,
  filter,
  positionId,
  view,
}: {
  search: string;
  sort: string;
  filter: string;
  positionId: string;
  view: string;
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

  const hasQuizzes = quizzes && quizzes.length > 0;
  const activeView = view || "table";

  return (
    <Card>
      <CardContent>
        {!hasQuizzes ? (
          <div className="flex flex-col justify-center items-center p-8 border border-dashed rounded-lg h-[200px] text-center">
            <div className="flex flex-col justify-center items-center mx-auto max-w-[420px] text-center">
              <h3 className="mt-4 font-semibold text-lg">
                Nessun quiz trovato
              </h3>
              <p className="mt-2 mb-4 text-muted-foreground text-sm">
                {search || filter !== "all" || positionId !== "all"
                  ? "Nessun quiz trovato con i criteri di ricerca specificati."
                  : "Non hai ancora creato quiz. Crea il tuo primo quiz per iniziare."}
              </p>
              <Button asChild size="sm">
                <Link href="/dashboard/quizzes/new">
                  <Plus className="mr-1 w-4 h-4" />
                  Nuovo quiz
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue={activeView} className="w-full">
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="table">Tabella</TabsTrigger>
                <TabsTrigger value="grid">Griglia</TabsTrigger>
              </TabsList>
              <div className="text-muted-foreground text-sm">
                {quizzes.length} quiz trovati
              </div>
            </div>
            <TabsContent value="table" className="pt-4">
              <QuizTable quizzes={quizzes} />
            </TabsContent>
            <TabsContent value="grid" className="@container pt-4">
              <QuizGrid quizzes={quizzes} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
