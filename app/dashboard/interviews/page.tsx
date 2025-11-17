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
import { fetchInterviewsData } from "@/lib/actions/interviews";
import { CheckCircle, Clock, MessageSquare, XCircle } from "lucide-react";

// Define the search params type
type SearchParams = {
  search?: string;
  status?: string;
  position?: string;
  language?: string;
  page?: string;
};

// Status configuration for badges and icons
const statusConfig = {
  pending: {
    label: "Pendenti",
    icon: Clock,
    variant: "secondary" as const,
    color: "text-orange-500",
  },
  in_progress: {
    label: "In Corso",
    icon: MessageSquare,
    variant: "default" as const,
    color: "text-blue-500",
  },
  completed: {
    label: "Completati",
    icon: CheckCircle,
    variant: "default" as const,
    color: "text-green-500",
  },
  cancelled: {
    label: "Annullati",
    icon: XCircle,
    variant: "destructive" as const,
    color: "text-red-500",
  },
};

// Main interviews page component
export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = params?.search || "";
  const status = params?.status || "all";
  const positionId = params?.position || "all";
  const programmingLanguage = params?.language || "all";
  const page = Number(params?.page) || 1;

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
  } = await fetchInterviewsData({
    search,
    status,
    positionId,
    programmingLanguage,
    page,
    limit: 10,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-4">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Colloqui</h1>
          <p className="text-muted-foreground text-sm">
            Gestisci e monitora tutti i colloqui tecnici
          </p>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(statusConfig).map(([statusKey, config]) => {
          const count = statusCounts[statusKey] || 0;
          const Icon = config.icon;

          return (
            <Card key={statusKey} className="hover:shadow-md transition-shadow">
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

      {/* Search and Filters */}
      <SearchAndFilterInterviews
        positions={positions}
        programmingLanguages={programmingLanguages}
        initialSearch={search}
        initialStatus={status}
        initialPosition={positionId}
        initialLanguage={programmingLanguage}
      />

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {totalCount} colloqui trovati
          </span>
          {status !== "all" && (
            <Badge variant="outline">
              {statusConfig[status as keyof typeof statusConfig]?.label ||
                status}
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
        <div className="text-muted-foreground text-sm">
          Pagina {currentPage} di {totalPages}
        </div>
      </div>

      {/* Interviews Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista Colloqui</CardTitle>
          <CardDescription>
            Visualizza tutti i colloqui con le relative informazioni e gestisci
            i link di invito
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          <InterviewsTable
            interviews={interviews}
            currentPage={currentPage}
            totalPages={totalPages}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
