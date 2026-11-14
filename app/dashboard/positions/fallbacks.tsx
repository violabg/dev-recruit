import { PaginationSkeleton, TableSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors SearchPositions (`flex flex-1 gap-2` with an h-9 input). */
export function SearchPositionsSkeleton() {
  return (
    <div className="flex flex-1 gap-2">
      <Skeleton className="flex-1 rounded-lg h-9" />
    </div>
  );
}

/** Mirrors PositionsTable: table with real headers + UrlPagination. */
export function PositionsSkeleton() {
  return (
    <div className="space-y-4">
      <TableSkeleton
        rows={5}
        columns={[
          { header: "Titolo" },
          { header: "Livello", cell: "badge" },
          { header: "Competenze", cell: "badge" },
          { header: "Data Creazione", cell: "muted" },
          {
            header: "Azioni",
            headClassName: "text-right",
            cell: "action",
            cellClassName: "text-right",
          },
        ]}
      />
      <PaginationSkeleton />
    </div>
  );
}
