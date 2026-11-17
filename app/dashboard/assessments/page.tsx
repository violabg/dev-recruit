import { SelectOptionsSkeleton } from "@/components/skeletons";
import { SearchAndFilterAssessments } from "@/components/assessments/search-and-filter-assessments";
import PageHeader from "@/components/page-header";
import { ProgrammingLanguageSelectItems } from "@/components/quiz/programming-language-select-items";
import { getPositionItemsForSelect } from "@/lib/data/positions";
import { Suspense } from "react";
import {
  AssessmentsSkeleton,
  FiltersSkeleton,
  StatsFallback,
} from "./fallbacks";
import {
  AssessmentsRuntimeSection,
  type AssessmentsSearchParams,
} from "./runtime-section";
import { Stats } from "./stats";

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<AssessmentsSearchParams>;
}) {
  const positionItems = await getPositionItemsForSelect();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        section="assessments"
        title="Test inviati"
        description="Gestisci tutti i test inviati ai candidati"
      />
      <div className="@container flex flex-col gap-6">
        <Suspense fallback={<StatsFallback />}>
          <Stats />
        </Suspense>
        <Suspense fallback={<FiltersSkeleton />}>
          <SearchAndFilterAssessments
            languageOptions={
              <Suspense fallback={<SelectOptionsSkeleton />}>
                <ProgrammingLanguageSelectItems />
              </Suspense>
            }
            positionItems={positionItems}
          />
        </Suspense>

        <Suspense fallback={<AssessmentsSkeleton />}>
          <AssessmentsRuntimeSection searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
