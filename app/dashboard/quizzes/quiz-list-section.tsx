import { QuizGrid } from "@/components/quiz/quiz-grid";
import { QuizTable } from "@/components/quiz/quiz-table";
import { Card, CardContent } from "@/components/ui/card";
import { UrlPagination } from "@/components/ui/url-pagination";
import { CachedQuizzesContent } from "@/lib/data/quizzes";

import { NewQuizButton } from "./new-quiz-button";
import { QuizViewTabs } from "./quiz-view-tabs";
import type { NormalizedQuizzesParams } from "./runtime-section";

type QuizListSectionProps = NormalizedQuizzesParams;

/**
 * QuizListSection - Server component that renders the quiz list
 * Fetches cached quiz data and renders either table or grid view
 */
export async function QuizListSection({
  search,
  sort,
  filter,
  positionId,
  view,
  page,
  pageSize,
}: QuizListSectionProps) {
  const {
    quizzes,
    fetchError,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
  } = await CachedQuizzesContent({
    search,
    sort,
    filter,
    positionId,
    page,
    pageSize,
  });

  if (fetchError) {
    return (
      <div className="bg-destructive/15 p-4 rounded-md text-destructive">
        <p>Si è verificato un errore nel caricamento dei quiz: {fetchError}</p>
      </div>
    );
  }

  const hasQuizzes = quizzes && quizzes.length > 0;

  return (
    <Card>
      <CardContent>
        {!hasQuizzes ? (
          <QuizEmptyState
            hasFilters={
              search !== "" || filter !== "all" || positionId !== "all"
            }
          />
        ) : (
          <div className="space-y-4">
            <QuizViewTabs
              defaultValue={view}
              tableContent={<QuizTable quizzes={quizzes} />}
              gridContent={<QuizGrid quizzes={quizzes} />}
            />
            <UrlPagination
              pagination={{
                currentPage,
                totalPages,
                totalCount,
                hasNextPage,
                hasPrevPage,
              }}
              itemLabel="quiz"
              itemLabelPlural="quiz"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Empty state component for quiz list
 */
function QuizEmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col justify-center items-center p-8 border border-dashed rounded-lg h-[200px] text-center">
      <div className="flex flex-col justify-center items-center mx-auto max-w-[420px] text-center">
        <h3 className="mt-4 font-semibold text-lg">Nessun quiz trovato</h3>
        <p className="mt-2 mb-4 text-muted-foreground text-sm">
          {hasFilters
            ? "Nessun quiz trovato con i criteri di ricerca specificati."
            : "Non hai ancora creato quiz. Crea il tuo primo quiz per iniziare."}
        </p>
        <NewQuizButton />
      </div>
    </div>
  );
}
