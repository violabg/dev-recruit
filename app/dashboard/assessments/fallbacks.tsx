import { AssessmentPipelineSkeleton } from "@/components/dashboard/assessment-pipeline";
import { PaginationSkeleton, TableSkeleton, TextSkeleton } from "@/components/skeletons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors Stats: the shared pipeline skeleton. */
export const StatsFallback = AssessmentPipelineSkeleton;

/** Mirrors SearchAndFilterAssessments: search + wrapped [status, position, language]. */
export const FiltersSkeleton = () => (
  <div className="flex @[800px]:flex-row flex-col gap-4">
    <Skeleton className="flex-1 rounded-lg h-9" />
    <div className="flex flex-wrap gap-4">
      <Skeleton className="rounded-lg w-[153px] h-9" />
      <Skeleton className="rounded-lg w-[183px] h-9" />
      <Skeleton className="rounded-lg w-[172px] h-9" />
    </div>
  </div>
);

/** Mirrors AssessmentsRuntimeSection: count line + "Lista Test" table card. */
export const AssessmentsSkeleton = () => (
  <>
    <div className="flex justify-between items-center">
      <TextSkeleton className="w-32" />
    </div>
    <Card>
      <CardHeader>
        <CardTitle>Lista Test</CardTitle>
        <CardDescription>
          Visualizza tutti i test con le relative informazioni e gestisci
          i link di invito
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4">
        <div className="flex flex-col gap-4">
          <TableSkeleton
            rows={5}
            columns={[
              { header: "Candidato" },
              { header: "Test" },
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
