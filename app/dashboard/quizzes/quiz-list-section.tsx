import { QuizGrid } from "@/components/quiz/quiz-grid";
import { QuizTable } from "@/components/quiz/quiz-table";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { UrlPagination } from "@/components/ui/url-pagination";
import { getQuizzes } from "@/lib/data/quizzes";
import { FileQuestion } from "lucide-react";

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
  } = await getQuizzes({
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
    <Empty className="border h-[200px]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileQuestion />
        </EmptyMedia>
        <EmptyTitle>Nessun quiz trovato</EmptyTitle>
        <EmptyDescription>
          {hasFilters
            ? "Nessun quiz trovato con i criteri di ricerca specificati."
            : "Non hai ancora creato quiz. Crea il tuo primo quiz per iniziare."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <NewQuizButton />
      </EmptyContent>
    </Empty>
  );
}
