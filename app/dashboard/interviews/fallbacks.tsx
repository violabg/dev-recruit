import { PaginationSkeleton, TableSkeleton, TextSkeleton } from "@/components/skeletons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_CONFIG } from "./runtime-section";

/** Mirrors Stats: static status labels/icons, only the counts are skeletons. */
export const StatsFallback = () => (
  <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
    {Object.entries(STATUS_CONFIG).map(([key, config]) => {
      const Icon = config.icon;
      return (
        <Card key={key}>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">{config.label}</CardTitle>
            <Icon className={`h-4 w-4 ${config.color}`} />
          </CardHeader>
          <CardContent>
            <TextSkeleton lineClassName="h-8" className="w-10 h-7" />
            <p className="text-muted-foreground text-xs">colloqui</p>
          </CardContent>
        </Card>
      );
    })}
  </div>
);

/** Mirrors SearchAndFilterInterviews: search + wrapped [status, position, language]. */
export const FiltersSkeleton = () => (
  <div className="flex sm:flex-row flex-col gap-4">
    <Skeleton className="flex-1 rounded-lg h-9" />
    <div className="flex flex-wrap gap-4">
      <Skeleton className="rounded-lg w-[153px] h-9" />
      <Skeleton className="rounded-lg w-[183px] h-9" />
      <Skeleton className="rounded-lg w-[172px] h-9" />
    </div>
  </div>
);

/** Mirrors InterviewsRuntimeSection: count line + "Lista Colloqui" table card. */
export const InterviewsSkeleton = () => (
  <>
    <div className="flex justify-between items-center">
      <TextSkeleton className="w-32" />
    </div>
    <Card>
      <CardHeader>
        <CardTitle>Lista Colloqui</CardTitle>
        <CardDescription>
          Visualizza tutti i colloqui con le relative informazioni e gestisci
          i link di invito
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4">
        <div className="space-y-4">
          <TableSkeleton
            rows={5}
            columns={[
              { header: "Candidato" },
              { header: "Quiz" },
              { header: "Posizione" },
              { header: "Competenze", cell: "badge" },
              { header: "Stato", cell: "badge" },
              {
                header: "Azioni",
                headClassName: "text-right",
                cell: "action",
                cellClassName: "text-right",
                actionCount: 2,
              },
            ]}
          />
        </div>
        <PaginationSkeleton />
      </CardContent>
    </Card>
  </>
);
