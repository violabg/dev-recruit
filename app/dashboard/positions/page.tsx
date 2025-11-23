import { SearchPositions } from "@/components/positions/search-positions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPositions } from "@/lib/data/positions";
import { formatDate } from "@/lib/utils";
import { Eye, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import PositionsSkeleton from "./fallback";

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
            Nuova Posizione
            <Plus className="ml-1 w-4 h-4" />
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
              {positions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell className="font-medium">
                    {position.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{position.experienceLevel}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {position.skills.slice(0, 3).map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                      {position.skills.length > 3 && (
                        <Badge variant="secondary">
                          +{position.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDate(position.createdAt.toISOString())}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      title="Vai al dettaglio"
                    >
                      <Link href={`/dashboard/positions/${position.id}`}>
                        <Eye className="mr-1 w-4 h-4 text-primary" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
                  Crea posizione
                  <Plus className="ml-1 w-4 h-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
