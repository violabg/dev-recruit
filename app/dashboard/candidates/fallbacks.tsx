import {
  FilterBarSkeleton,
  PaginationSkeleton,
  TableSkeleton,
} from "@/components/skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown } from "lucide-react";

/** Mirrors SearchAndFilterCandidates: search + status, position, sort. */
export const FiltersSkeleton = () => <FilterBarSkeleton selects={3} />;

/** Mirrors CandidatesRuntimeSection (table view, the default). */
export const CandidatesListSkeleton = () => (
  <Card>
    <CardContent>
      <div className="flex flex-col gap-4">
        <div className="w-full">
          <div className="flex justify-between items-center">
            {/* TabsList h-8: "Tabella" / "Griglia" */}
            <Skeleton className="rounded-lg w-40 h-8" />
          </div>
          <div className="pt-4">
            <TableSkeleton
              rows={5}
              columns={[
                {
                  header: (
                    <div className="flex items-center">
                      Nome
                      <ArrowUpDown className="ml-2 size-4" />
                    </div>
                  ),
                  headClassName: "w-[250px]",
                },
                { header: "Email", cell: "muted" },
                { header: "Posizione", cell: "stacked" },
                { header: "Stato", cell: "badge" },
                { header: "Data", cell: "muted" },
                {
                  header: "Azioni",
                  headClassName: "text-right",
                  cell: "action",
                  cellClassName: "text-right",
                },
              ]}
            />
          </div>
        </div>
        <PaginationSkeleton />
      </div>
    </CardContent>
  </Card>
);
