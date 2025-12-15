import { SearchAndFilterInterviews } from "@/components/interviews/search-and-filter-interviews";
import PositionOptions from "@/components/positions/position-options";
import { ProgrammingLanguageSelectItems } from "@/components/quiz/programming-language-select-items";
import { Suspense } from "react";
import {
  FiltersSkeleton,
  InterviewsSkeleton,
  StatsFallback,
} from "./fallbacks";
import {
  InterviewsRuntimeSection,
  type InterviewsSearchParams,
} from "./runtime-section";
import { Stats } from "./stats";

export default function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<InterviewsSearchParams>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-4">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Colloqui</h1>
          <p className="text-muted-foreground text-sm">
            Gestisci tutti i colloqui tecnici
          </p>
        </div>
      </div>

      <div className="@container space-y-6">
        <Suspense fallback={<StatsFallback />}>
          <Stats />
        </Suspense>
        <Suspense fallback={<FiltersSkeleton />}>
          <SearchAndFilterInterviews
            positionOptions={<PositionOptions />}
            languageOptions={
              <Suspense fallback={<div>Loading...</div>}>
                <ProgrammingLanguageSelectItems />
              </Suspense>
            }
          />
        </Suspense>

        <Suspense fallback={<InterviewsSkeleton />}>
          <InterviewsRuntimeSection searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
