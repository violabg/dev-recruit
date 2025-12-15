import { SearchAndFilterCandidates } from "@/components/candidates/search-and-filter-candidates";
import PageHeader from "@/components/page-header";
import PositionOptions from "@/components/positions/position-options";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CandidatesListSkeleton, FiltersSkeleton } from "./fallbacks";
import { CandidatesRuntimeSection } from "./runtime-section";

export type CandidatesSearchParams = Promise<{
  search?: string;
  status?: string;
  position?: string;
  sort?: string;
  view?: string;
  page?: string;
  pageSize?: string;
}>;

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: CandidatesSearchParams;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidati"
        description="Gestisci i candidati per le tue posizioni aperte"
        actionBtns={
          <Button asChild size="sm" variant="default">
            <Link href="/dashboard/candidates/new">
              <Plus className="mr-1 size-4" />
              Nuovo Candidato
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        <Suspense fallback={<FiltersSkeleton />}>
          <SearchAndFilterCandidates positionOptions={<PositionOptions />} />
        </Suspense>

        <Suspense fallback={<CandidatesListSkeleton />}>
          <CandidatesRuntimeSection searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
