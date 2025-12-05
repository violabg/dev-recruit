import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { FiltersSkeleton } from "./fallbacks";
import {
  CandidatesRuntimeFallback,
  CandidatesRuntimeSection,
} from "./runtime-section";
import { SearchAndFilterQuizzesWrapper } from "./search-and-filter-quizzes-wrapper";

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
      <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-4">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Candidati</h1>
          <p className="text-muted-foreground">
            Gestisci i candidati per le tue posizioni aperte
          </p>
        </div>
        <Button asChild size="sm" variant="default">
          <Link href="/dashboard/candidates/new">
            <Plus className="mr-1 size-4" />
            Nuovo Candidato
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <Suspense fallback={<FiltersSkeleton />}>
          <SearchAndFilterQuizzesWrapper />
        </Suspense>

        <Suspense fallback={<CandidatesRuntimeFallback />}>
          <CandidatesRuntimeSection searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
