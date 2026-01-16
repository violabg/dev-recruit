import { SearchAndFilterCandidates } from "@/components/candidates/search-and-filter-candidates";
import PageHeader from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";

import { getPositionItemsForSelect } from "@/lib/data/positions";
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
  const positionItems = await getPositionItemsForSelect();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidati"
        description="Gestisci i candidati per le tue posizioni aperte"
        actionBtns={
          <Link
            href="/dashboard/candidates/new"
            className={buttonVariants({ variant: "default", size: "sm" })}
          >
            <Plus className="mr-1 size-4" />
            Nuovo Candidato
          </Link>
        }
      />

      <div className="space-y-6">
        <Suspense fallback={<FiltersSkeleton />}>
          <SearchAndFilterCandidates positionItems={positionItems} />
        </Suspense>

        <Suspense fallback={<CandidatesListSkeleton />}>
          <CandidatesRuntimeSection searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
