import { CandidateGrid } from "@/components/candidates/candidate-grid";
import { CandidateTable } from "@/components/candidates/candidate-table";
import { SearchAndFilterCandidates } from "@/components/candidates/search-and-filter-candidates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_PAGE_SIZE,
  UrlPagination,
} from "@/components/ui/url-pagination";
import {
  getCandidatePositions,
  getFilteredCandidates,
} from "@/lib/data/candidates";
import { Plus } from "lucide-react";
import Link from "next/link";
import { CandidatesListSkeleton, FiltersSkeleton } from "./fallbacks";
import type { CandidatesSearchParams } from "./page";

type CandidateStatus = "all" | "active" | "archived";
type CandidateSort = "newest" | "oldest" | "progress";
type CandidateView = "table" | "grid";

const STATUS_VALUES: CandidateStatus[] = ["all", "active", "archived"];
const SORT_VALUES: CandidateSort[] = ["newest", "oldest", "progress"];
const VIEW_VALUES: CandidateView[] = ["table", "grid"];

const normalizeStatus = (value?: string): CandidateStatus =>
  value && STATUS_VALUES.includes(value as CandidateStatus)
    ? (value as CandidateStatus)
    : "all";

const normalizeSort = (value?: string): CandidateSort =>
  value && SORT_VALUES.includes(value as CandidateSort)
    ? (value as CandidateSort)
    : "newest";

const normalizeView = (value?: string): CandidateView =>
  value && VIEW_VALUES.includes(value as CandidateView)
    ? (value as CandidateView)
    : "table";

const normalizePageValue = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
};

export const CandidatesRuntimeFallback = () => (
  <div className="space-y-6">
    <FiltersSkeleton />
    <CandidatesListSkeleton />
  </div>
);

export const CandidatesRuntimeSection = async ({
  searchParams,
}: {
  searchParams: CandidatesSearchParams;
}) => {
  // Await the Promise here - this is the Suspense-wrapped component
  const params = await searchParams;

  // Normalize all values to primitives AFTER awaiting
  const search = params.search?.trim() ?? "";
  const status = normalizeStatus(params.status);
  const positionId = params.position?.trim() || "all";
  const sort = normalizeSort(params.sort);
  const view = normalizeView(params.view);
  const page = normalizePageValue(params.page, 1);
  const pageSize = normalizePageValue(params.pageSize, DEFAULT_PAGE_SIZE);

  // Fetch all data in parallel within the same Suspense boundary
  const [positions, candidatesData] = await Promise.all([
    getCandidatePositions(),
    getFilteredCandidates({
      search,
      status,
      positionId,
      sort,
      page,
      pageSize,
    }),
  ]);

  const {
    candidates,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
  } = candidatesData;

  const hasCandidates = candidates.length > 0;
  const activeView = view || "table";

  return (
    <>
      <SearchAndFilterCandidates positions={positions || []} />

      <Card>
        <CardContent>
          {!hasCandidates ? (
            <div className="flex flex-col justify-center items-center p-8 border border-dashed rounded-lg h-[200px] text-center">
              <div className="flex flex-col justify-center items-center mx-auto max-w-[420px] text-center">
                <h3 className="mt-4 font-semibold text-lg">
                  Nessun candidato trovato
                </h3>
                <p className="mt-2 mb-4 text-muted-foreground text-sm">
                  {search
                    ? `Nessun candidato trovato per "${search}". Prova a modificare i filtri.`
                    : "Non hai ancora aggiunto candidati. Aggiungi il tuo primo candidato per iniziare."}
                </p>
                <Button asChild size="sm">
                  <Link href="/dashboard/candidates/new">
                    <Plus className="mr-1 w-4 h-4" />
                    Nuovo Candidato
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Tabs defaultValue={activeView} className="w-full">
                <div className="flex justify-between items-center">
                  <TabsList>
                    <TabsTrigger value="table">Tabella</TabsTrigger>
                    <TabsTrigger value="grid">Griglia</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="table" className="pt-4">
                  <CandidateTable candidates={candidates} />
                </TabsContent>
                <TabsContent value="grid" className="pt-4">
                  <CandidateGrid candidates={candidates} />
                </TabsContent>
              </Tabs>
              <UrlPagination
                pagination={{
                  currentPage,
                  totalPages,
                  totalCount,
                  hasNextPage,
                  hasPrevPage,
                }}
                itemLabel="candidato"
                itemLabelPlural="candidati"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};
