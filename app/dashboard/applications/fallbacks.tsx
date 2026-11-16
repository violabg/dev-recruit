import {
  FilterBarSkeleton,
  PaginationSkeleton,
  TableSkeleton,
  TextSkeleton,
} from "@/components/skeletons";

/** Mirrors SearchAndFilterApplications: search + stage, position. */
export function ApplicationsFiltersSkeleton() {
  return <FilterBarSkeleton selects={2} />;
}

/** Mirrors ApplicationsRuntimeSection: count line, table, pagination. */
export function ApplicationsListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <TextSkeleton className="w-40" />
      <TableSkeleton
        rows={5}
        columns={[
          { header: "Candidato", cell: "stacked" },
          { header: "Posizione" },
          { header: "Fase", cell: "badge" },
          { header: "Responsabile", cell: "muted" },
          { header: "Ultimo cambio di fase", cell: "muted" },
        ]}
      />
      <PaginationSkeleton />
    </div>
  );
}
