import { CandidateGrid } from "@/components/candidates/candidate-grid";
import { CandidateTable } from "@/components/candidates/candidate-table";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_PAGE_SIZE,
  UrlPagination,
} from "@/components/ui/url-pagination";
import { getFilteredCandidates } from "@/lib/data/candidates";
import { APPLICATION_STAGE_VALUES, type ApplicationStage } from "@/lib/schemas";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import type { CandidatesSearchParams } from "./page";

type CandidateStageFilter = ApplicationStage | "all";
type CandidateSort = "newest" | "oldest" | "name";
type CandidateView = "table" | "grid";

const SORT_VALUES: CandidateSort[] = ["newest", "oldest", "name"];
const VIEW_VALUES: CandidateView[] = ["table", "grid"];

const normalizeStage = (value?: string): CandidateStageFilter =>
  value && (APPLICATION_STAGE_VALUES as readonly string[]).includes(value)
    ? (value as ApplicationStage)
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

export const CandidatesRuntimeSection = async ({
  searchParams,
}: {
  searchParams: CandidatesSearchParams;
}) => {
  // Await the Promise here - this is the Suspense-wrapped component
  const params = await searchParams;

  // Normalize all values to primitives AFTER awaiting
  const search = params.search?.trim() ?? "";
  const stage = normalizeStage(params.stage);
  const positionId = params.position?.trim() || "all";
  const sort = normalizeSort(params.sort);
  const view = normalizeView(params.view);
  const page = normalizePageValue(params.page, 1);
  const pageSize = normalizePageValue(params.pageSize, DEFAULT_PAGE_SIZE);

  // Fetch all data in parallel within the same Suspense boundary
  const candidatesData = await getFilteredCandidates({
    search,
    stage,
    positionId,
    sort,
    page,
    pageSize,
  });

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
    <Card>
      <CardContent>
        {!hasCandidates ? (
          <Empty className="border h-[200px]">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>Nessun candidato trovato</EmptyTitle>
              <EmptyDescription>
                {search
                  ? `Nessun candidato trovato per "${search}". Prova a modificare i filtri.`
                  : "Non hai ancora aggiunto candidati. Aggiungi il tuo primo candidato per iniziare."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link
                href="/dashboard/candidates/new"
                className={buttonVariants({
                  variant: "default",
                  size: "sm",
                })}
              >
                <Plus className="mr-1 size-4" />
                Nuovo Candidato
              </Link>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
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
  );
};
