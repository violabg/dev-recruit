import {
  PaginationSkeleton,
  TableSkeleton,
  TextSkeleton,
} from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PresetsTable (real headers, icon + label/description) + pagination. */
export const PresetsListSkeleton = () => (
  <>
    <TableSkeleton
      className="rounded-lg"
      rows={5}
      columns={[
        {
          header: "Nome",
          content: (
            <div className="flex items-center gap-3">
              <Skeleton className="rounded-md size-5" />
              <div>
                <TextSkeleton lineClassName="h-6" className="w-40 h-4" />
                <TextSkeleton className="w-56" />
              </div>
            </div>
          ),
        },
        { header: "Tipo", cell: "badge" },
        { header: "Difficoltà", cell: "badge" },
        { header: "Tag", cell: "badge" },
        {
          header: "Azioni",
          headClassName: "text-right",
          cell: "action",
          cellClassName: "text-right",
        },
      ]}
    />
    <PaginationSkeleton />
  </>
);
