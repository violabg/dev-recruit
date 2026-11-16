import { MineToggle } from "@/components/applications/mine-toggle";
import { SearchAndFilterApplications } from "@/components/applications/search-and-filter-applications";
import PageHeader from "@/components/page-header";
import { getPositionItemsForSelect } from "@/lib/data/positions";
import { Suspense } from "react";
import {
  ApplicationsFiltersSkeleton,
  ApplicationsListSkeleton,
} from "./fallbacks";
import {
  ApplicationsRuntimeSection,
  type ApplicationsSearchParams,
} from "./runtime-section";

/** Every application with its stage, filterable by stage and position. */
export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: ApplicationsSearchParams;
}) {
  const positionItems = await getPositionItemsForSelect();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        section="applications"
        title="Candidature"
        description="Tutte le candidature e la loro fase"
      />
      <Suspense fallback={<ApplicationsFiltersSkeleton />}>
        <div className="flex lg:flex-row flex-col lg:items-center gap-4">
          <SearchAndFilterApplications positionItems={positionItems} />
          <MineToggle />
        </div>
      </Suspense>
      <Suspense fallback={<ApplicationsListSkeleton />}>
        <ApplicationsRuntimeSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
