import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

import { AssessmentsTable } from "@/components/assessments/assessments-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UrlPagination } from "@/components/ui/url-pagination";
import { getFilteredAssessments } from "@/lib/data/assessments";
import { AssessmentStatus } from "@/lib/schemas";
import {
  normalizeLanguage,
  normalizePage,
  normalizePosition,
  normalizeStatus,
} from "./utils";

export type AssessmentsSearchParams = {
  search?: string;
  status?: AssessmentStatus | "all";
  position?: string;
  language?: string;
  page?: string;
};

export const AssessmentsRuntimeSection = async ({
  searchParams,
}: {
  searchParams: Promise<AssessmentsSearchParams>;
}) => {
  const params = await searchParams;
  const search = params?.search ?? "";
  const status = normalizeStatus(params?.status);
  const positionId = normalizePosition(params?.position);
  const programmingLanguage = normalizeLanguage(params?.language);
  const page = normalizePage(params?.page);

  const {
    assessments,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
  } = await getFilteredAssessments({
    search,
    status,
    positionId,
    programmingLanguage,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {totalCount} test trovati
          </span>
        </div>
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
          <AssessmentsTable assessments={assessments} />
          <UrlPagination
            pagination={{
              currentPage,
              totalPages,
              totalCount,
              hasNextPage,
              hasPrevPage,
            }}
            itemLabel="test"
            itemLabelPlural="test"
          />
        </CardContent>
      </Card>
    </>
  );
};
