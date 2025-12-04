import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { ComponentType, SVGProps } from "react";

import { InterviewsTable } from "@/components/interviews/interviews-table";
import { SearchAndFilterInterviews } from "@/components/interviews/search-and-filter-interviews";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UrlPagination } from "@/components/ui/url-pagination";
import { getInterviews } from "@/lib/actions/interviews";
import { InterviewStatus } from "@/lib/schemas";
import { CheckCircle, Clock, MessageSquare, XCircle } from "lucide-react";

export type InterviewsSearchParams = {
  search?: string;
  status?: InterviewStatus | "all";
  position?: string;
  language?: string;
  page?: string;
};

const STATUS_CONFIG: Record<
  InterviewStatus,
  {
    label: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    color: string;
  }
> = {
  pending: {
    label: "Pendenti",
    icon: Clock,
    color: "text-orange-500",
  },
  in_progress: {
    label: "In Corso",
    icon: MessageSquare,
    color: "text-blue-500",
  },
  completed: {
    label: "Completati",
    icon: CheckCircle,
    color: "text-green-500",
  },
  cancelled: {
    label: "Annullati",
    icon: XCircle,
    color: "text-red-500",
  },
};

const normalizeStatus = (
  value?: InterviewStatus | "all"
): InterviewStatus | "all" => value || "all";
const normalizeLanguage = (value?: string): string => value || "all";
const normalizePosition = (value?: string): string => value?.trim() || "all";
const normalizePage = (value?: string) => {
  if (!value) return 1;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
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
    positions,
    programmingLanguages,
    statusCounts,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
  } = await getInterviews({
    search,
    status,
    positionId,
    programmingLanguage,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = statusCounts[key as InterviewStatus] ?? 0;
          const Icon = config.icon;

          return (
            <Card key={key} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">
                  {config.label}
                </CardTitle>
                <Icon className={`h-4 w-4 ${config.color}`} />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">{count}</div>
                <p className="text-muted-foreground text-xs">
                  {count === 1 ? "colloquio" : "colloqui"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <SearchAndFilterInterviews
        positions={positions}
        programmingLanguages={programmingLanguages}
        initialSearch={search}
        initialStatus={status}
        initialPosition={positionId}
        initialLanguage={programmingLanguage}
      />

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {totalCount} colloqui trovati
          </span>
          {status !== "all" && (
            <Badge variant="outline">
              {STATUS_CONFIG[status as InterviewStatus]?.label || status}
            </Badge>
          )}
          {positionId !== "all" && (
            <Badge variant="outline">
              {positions.find((p) => p.id === positionId)?.title}
            </Badge>
          )}
          {programmingLanguage !== "all" && (
            <Badge variant="outline">{programmingLanguage}</Badge>
          )}
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
        <CardContent className="space-y-4 px-4">
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
    </div>
  );
};
