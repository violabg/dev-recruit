import { SearchAndFilterInterviews } from "@/components/interviews/search-and-filter-interviews";
import PageHeader from "@/components/page-header";
import { ProgrammingLanguageSelectItems } from "@/components/quiz/programming-language-select-items";
import { getPositionItemsForSelect } from "@/lib/data/positions";
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

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<InterviewsSearchParams>;
}) {
  const positionItems = await getPositionItemsForSelect();

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
            languageOptions={
              <Suspense fallback={<div>Loading...</div>}>
                <ProgrammingLanguageSelectItems />
              </Suspense>
            }
            positionItems={positionItems}
          />
        </Suspense>

        <Suspense fallback={<InterviewsSkeleton />}>
          <InterviewsRuntimeSection searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
