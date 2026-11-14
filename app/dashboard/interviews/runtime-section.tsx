import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

import { InterviewsTable } from "@/components/interviews/interviews-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UrlPagination } from "@/components/ui/url-pagination";
import { getFilteredInterviews } from "@/lib/data/interviews";
import { InterviewStatus } from "@/lib/schemas";
import {
  normalizeLanguage,
  normalizePage,
  normalizePosition,
  normalizeStatus,
} from "./utils";

export type InterviewsSearchParams = {
  search?: string;
  status?: InterviewStatus | "all";
  position?: string;
  language?: string;
  page?: string;
};

export const InterviewsRuntimeSection = async ({
  searchParams,
}: {
  searchParams: Promise<InterviewsSearchParams>;
}) => {
  const params = await searchParams;
  const search = params?.search ?? "";
  const status = normalizeStatus(params?.status);
  const positionId = normalizePosition(params?.position);
  const programmingLanguage = normalizeLanguage(params?.language);
  const page = normalizePage(params?.page);

  const {
    interviews,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
  } = await getFilteredInterviews({
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
            {totalCount} colloqui trovati
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista Colloqui</CardTitle>
          <CardDescription>
            Visualizza tutti i colloqui con le relative informazioni e gestisci
            i link di invito
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-4">
          <InterviewsTable interviews={interviews} />
          <UrlPagination
            pagination={{
              currentPage,
              totalPages,
              totalCount,
              hasNextPage,
              hasPrevPage,
            }}
            itemLabel="colloquio"
            itemLabelPlural="colloqui"
          />
        </CardContent>
      </Card>
    </>
  );
};
