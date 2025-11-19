import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CandidateFiltersSection } from "./candidate-filters-section";
import { CandidateListSection } from "./candidate-list-section";
import { CandidateStatsSection } from "./candidate-stats-section";
import {
  CandidatesListSkeleton,
  FiltersSkeleton,
  StatsSkeleton,
} from "./fallbacks";

// Define the search params type
export type SearchParams = {
  search?: string;
  status?: string;
  position?: string;
  sort?: string;
  view?: string;
};

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="space-y-6">
      <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-4">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Candidati</h1>
          <p className="text-muted-foreground">
            Gestisci i candidati per le tue posizioni aperte
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/candidates/new">
            <Plus className="mr-2 w-4 h-4" />
            Nuovo Candidato
          </Link>
        </Button>
      </div>

      <Suspense fallback={<CandidatesRuntimeFallback />}>
        <CandidatesRuntimeContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const CandidatesRuntimeFallback = () => (
  <div className="space-y-6">
    <StatsSkeleton />
    <FiltersSkeleton />
    <CandidatesListSkeleton />
  </div>
);

const CandidatesRuntimeContent = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
  const params = await searchParams;
  const search = params?.search || "";
  const status = params?.status || "all";
  const positionId = params?.position || "all";
  const sort = params?.sort || "newest";
  const view = params?.view || "table";

  return (
    <>
      <Suspense fallback={<StatsSkeleton />}>
        <CandidateStatsSection />
      </Suspense>

      <Suspense fallback={<FiltersSkeleton />}>
        <CandidateFiltersSection />
      </Suspense>

      <Suspense fallback={<CandidatesListSkeleton />}>
        <CandidateListSection
          search={search}
          status={status}
          positionId={positionId}
          sort={sort}
          view={view}
        />
      </Suspense>
    </>
  );
};
