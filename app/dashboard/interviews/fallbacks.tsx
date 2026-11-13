import { InterviewPipelineSkeleton } from "@/components/dashboard/interview-pipeline";
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

/** Mirrors Stats: the shared pipeline skeleton. */
export const StatsFallback = InterviewPipelineSkeleton;

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
