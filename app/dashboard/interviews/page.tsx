import { SearchAndFilterInterviews } from "@/components/interviews/search-and-filter-interviews";
import PageHeader from "@/components/page-header";
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
      <PageHeader
        title="Colloqui"
        description="Gestisci tutti i colloqui tecnici"
      />
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
