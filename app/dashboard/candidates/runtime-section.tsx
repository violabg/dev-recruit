import { CandidateGrid } from "@/components/candidates/candidate-grid";
import { CandidateTable } from "@/components/candidates/candidate-table";
import { Button } from "@/components/ui/button";
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
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import type { CandidatesSearchParams } from "./page";

type CandidateStatus =
  | "all"
  | "pending"
  | "contacted"
  | "interviewing"
  | "hired"
  | "rejected";
type CandidateSort = "newest" | "oldest" | "name" | "status";
type CandidateView = "table" | "grid";

const STATUS_VALUES: CandidateStatus[] = [
  "all",
  "pending",
  "contacted",
  "interviewing",
  "hired",
  "rejected",
];
const SORT_VALUES: CandidateSort[] = ["newest", "oldest", "name", "status"];
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
  const candidatesData = await getFilteredCandidates({
    search,
    status,
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
              <Button
                size="sm"
                render={
                  <Link href="/dashboard/candidates/new">
                    <Plus className="mr-1 size-4" />
                    Nuovo Candidato
                  </Link>
                }
                nativeButton={false}
              />
            </EmptyContent>
          </Empty>
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
  );
};
