import { ApplicationsTable } from "@/components/applications/applications-table";
import { UrlPagination } from "@/components/ui/url-pagination";
import { getCurrentUser } from "@/lib/auth-server";
import { getFilteredApplications } from "@/lib/data/applications";
import { APPLICATION_STAGE_VALUES, type ApplicationStage } from "@/lib/schemas";

export type ApplicationsSearchParams = Promise<{
  search?: string;
  stage?: string;
  position?: string;
  mine?: string;
  page?: string;
}>;

const normalizeStage = (value?: string): ApplicationStage | "all" =>
  value && (APPLICATION_STAGE_VALUES as readonly string[]).includes(value)
    ? (value as ApplicationStage)
    : "all";

const normalizePage = (value?: string) => {
  const parsed = Math.floor(Number(value));
  return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
};

/** Dynamic part of the applications list. */
export async function ApplicationsRuntimeSection({
  searchParams,
}: {
  searchParams: ApplicationsSearchParams;
}) {
  const params = await searchParams;

  const search = params.search?.trim() ?? "";
  const stage = normalizeStage(params.stage);
  const positionId = params.position?.trim() || "all";
  const page = normalizePage(params.page);

  // "Solo le mie" is a view filter the user switches on: without it every
  // application is listed
  const ownerId =
    params.mine === "1" ? (await getCurrentUser())?.id : undefined;

  const {
    applications,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
  } = await getFilteredApplications({
    search,
    stage,
    positionId,
    ownerId,
    page,
  });

  return (
    <div className="flex flex-col gap-4">
      <span className="text-muted-foreground text-sm">
        {totalCount} candidature trovate
      </span>
      <ApplicationsTable applications={applications} />
      <UrlPagination
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
        }}
        itemLabel="candidatura"
        itemLabelPlural="candidature"
      />
    </div>
  );
}
