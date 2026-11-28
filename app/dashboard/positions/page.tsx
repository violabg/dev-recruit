import PageHeader from "@/components/page-header";
import { PositionStatusFilter } from "@/components/positions/position-status-filter";
import { SearchPositions } from "@/components/positions/search-positions";
import { buttonVariants } from "@/components/ui/button";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEFAULT_PAGE_SIZE,
  UrlPagination,
} from "@/components/ui/url-pagination";
import { getPositions } from "@/lib/data/positions";
import { POSITION_STATUS_VALUES, type PositionStatus } from "@/lib/schemas";
import { Briefcase, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PositionsSkeleton, SearchPositionsSkeleton } from "./fallbacks";
import { PositionsTableClient } from "./positions-table-client";

type PositionsSearchParams = Promise<{
  q?: string;
  status?: string;
  page?: string;
}>;

/** Absent or invalid → the open positions */
const normalizeStatus = (value?: string): PositionStatus | "all" => {
  if (value === "all") return "all";
  return (POSITION_STATUS_VALUES as readonly string[]).includes(value ?? "")
    ? (value as PositionStatus)
    : "open";
};

// Server component for positions page
export default async function PositionsPage({
  searchParams,
}: {
  searchParams: PositionsSearchParams;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Posizioni"
        description="Gestisci le posizioni"
        actionBtns={
          <Link
            href="/dashboard/positions/new"
            className={buttonVariants({ variant: "default", size: "sm" })}
          >
            <Plus className="mr-1 size-4" />
            Nuova Posizione
          </Link>
        }
      />
      <div className="flex items-center gap-4">
        <Suspense fallback={<SearchPositionsSkeleton />}>
          <SearchPositions />
          <PositionStatusFilter />
        </Suspense>
      </div>
      <Suspense fallback={<PositionsSkeleton />}>
        <PositionsTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const PositionsTable = async ({
  searchParams,
}: {
  searchParams: PositionsSearchParams;
}) => {
  const params = await searchParams;
  const query = params.q?.trim();
  const status = normalizeStatus(params.status);
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);

  const {
    positions,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
  } = await getPositions({
    search: query,
    status,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  return (
    <div className="flex flex-col gap-4">
      {positions && positions.length > 0 ? (
        <>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titolo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Livello</TableHead>
                  <TableHead>Competenze</TableHead>
                  <TableHead>Data Creazione</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <PositionsTableClient
                  positions={positions.map((p) => ({
                    ...p,
                    createdAt: p.createdAt.toISOString(),
                  }))}
                />
              </TableBody>
            </Table>
          </div>
          <UrlPagination
            pagination={{
              currentPage,
              totalPages,
              totalCount,
              hasNextPage,
              hasPrevPage,
            }}
            itemLabel="posizione"
            itemLabelPlural="posizioni"
          />
        </>
      ) : (
        <Empty className="border h-100">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Briefcase />
            </EmptyMedia>
            <EmptyTitle>
              {query ? "Nessuna posizione trovata" : "Nessuna posizione creata"}
            </EmptyTitle>
            <EmptyDescription>
              {query
                ? "Prova a modificare i criteri di ricerca."
                : "Non hai ancora creato posizioni. Crea la tua prima posizione per iniziare."}
            </EmptyDescription>
          </EmptyHeader>
          {!query && (
            <EmptyContent>
              <Link
                href="/dashboard/positions/new"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Plus className="mr-1 size-4" />
                Crea posizione
              </Link>
            </EmptyContent>
          )}
        </Empty>
      )}
    </div>
  );
};
