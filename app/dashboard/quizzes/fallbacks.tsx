import { PaginationSkeleton, TableSkeleton } from "@/components/skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown } from "lucide-react";

/** Mirrors SearchAndFilterQuizzes: search + [sort, level, position]. */
export function FiltersSkeleton() {
  return (
    <div className="flex sm:flex-row flex-col gap-4">
      <div className="relative flex-1">
        <Skeleton className="rounded-lg w-full h-9" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="rounded-lg w-[142px] h-9" />
        <Skeleton className="rounded-lg w-[145px] h-9" />
        <Skeleton className="rounded-lg w-[183px] h-9" />
      </div>
    </div>
  );
}

/** Mirrors QuizListSection → QuizViewTabs (table view) + UrlPagination. */
export function QuizListSkeleton() {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="w-full">
            <div className="flex justify-between items-center">
              <Skeleton className="rounded-lg w-40 h-8" />
            </div>
            <div className="pt-4">
              <TableSkeleton
                rows={5}
                columns={[
                  {
                    header: (
                      <div className="flex items-center">
                        Titolo
                        <ArrowUpDown className="ml-2 size-4" />
                      </div>
                    ),
                    headClassName: "w-[250px]",
                  },
                  { header: "Posizione", cell: "textBadge" },
                  { header: "Domande", cell: "muted" },
                  { header: "Tempo", cell: "badge" },
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
}
