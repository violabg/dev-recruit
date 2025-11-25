import { SearchPositions } from "@/components/positions/search-positions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPositions } from "@/lib/data/positions";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import PositionsSkeleton from "./fallback";
import { PositionsTableClient } from "./positions-table-client";

// Server component for positions page
export default async function PositionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q: string | undefined }>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="font-bold text-3xl">Posizioni</h1>
        <Button asChild size="sm" variant={"default"}>
          <Link href="/dashboard/positions/new">
            <Plus className="mr-1 w-4 h-4" />
            Nuova Posizione
          </Link>
        </Button>
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
  searchParams: Promise<{ q: string | undefined }>;
}) => {
  const { q: query } = await searchParams;
  const allPositions = await getPositions();

  // Filter positions client-side based on query
  const positions = query
    ? allPositions.filter((pos) =>
        pos.title.toLowerCase().includes(query.toLowerCase())
      )
    : allPositions;
  return (
    <>
      <div className="flex items-center gap-4">
        <SearchPositions defaultValue={query} />
      </div>
      {positions && positions.length > 0 ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titolo</TableHead>
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
      ) : (
        <div className="flex flex-col justify-center items-center border border-dashed rounded-lg h-[400px]">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              {query ? "Nessuna posizione trovata" : "Nessuna posizione creata"}
            </p>
            {!query && (
              <Button className="mt-2" size="sm" asChild>
                <Link href="/dashboard/positions/new">
                  <Plus className="mr-1 w-4 h-4" />
                  Crea posizione
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
