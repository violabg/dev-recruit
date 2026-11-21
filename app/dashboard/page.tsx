import { MineToggle } from "@/components/applications/mine-toggle";
import { ActionCenter, ActionSummary } from "@/components/dashboard/action-center";
import PageHeader from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth-server";
import {
  getActionCenterData,
  type ActionCenterData,
} from "@/lib/data/applications";
import { isApplicationStale } from "@/lib/utils/application-stage";
import { isTodayOrTomorrow } from "@/lib/utils/interview-calendar";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ActionCenterSkeleton, ActionSummarySkeleton } from "./fallbacks";

type DashboardSearchParams = Promise<{ mine?: string }>;

export default function DashboardPage({
  searchParams,
}: {
  searchParams: DashboardSearchParams;
}) {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Le mie azioni"
        description="Il lavoro che aspetta te, nell'ordine della selezione."
        actionBtns={
          <>
            <Suspense>
              <MineToggle />
            </Suspense>
            <Link
              href="/dashboard/positions/new"
              className={buttonVariants({ variant: "default", className: "ml-2" })}
            >
              <Plus className="mr-1 size-4" />
              Nuova posizione
            </Link>
          </>
        }
      >
        <Suspense fallback={<ActionSummarySkeleton />}>
          <MySummary searchParams={searchParams} />
        </Suspense>
      </PageHeader>

      <Suspense fallback={<ActionCenterSkeleton />}>
        <MyActions searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/**
 * Request-time read of the home. The cached read is the same for every user;
 * "Solo le mie" filters it in memory, and the clock is read only here.
 */
async function loadMyActions(searchParams: DashboardSearchParams) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const data = await getActionCenterData();

  const mineOnly = params.mine === "1" && user;
  const isMine = (row: { ownerId: string | null }) =>
    !mineOnly || row.ownerId === user.id;

  const now = new Date();

  // Positions with an incomplete setup have no application: never filtered.
  // Interviews: owner or participant; scorecards: their interviewer
  const filtered: ActionCenterData = {
    assessmentsToEvaluate: data.assessmentsToEvaluate.filter(isMine),
    openApplications: data.openApplications.filter(isMine),
    positionsWithIncompleteSetup: data.positionsWithIncompleteSetup,
    interviewsWithoutKit: data.interviewsWithoutKit
      .filter((row) => isTodayOrTomorrow(row.scheduledAt, now))
      .filter(
        (row) =>
          !mineOnly ||
          row.ownerId === user.id ||
          row.participantIds.includes(user.id),
      ),
    feedbackToFill: data.feedbackToFill.filter(
      (row) => !mineOnly || row.interviewerId === user.id,
    ),
  };

  const staleApplications = filtered.openApplications.filter((application) =>
    isApplicationStale(application, now),
  );

  return { data: filtered, staleApplications };
}

/** Queue counts in the header band. */
async function MySummary({ searchParams }: { searchParams: DashboardSearchParams }) {
  const { data, staleApplications } = await loadMyActions(searchParams);
  return <ActionSummary data={data} staleApplications={staleApplications} />;
}

/** The queues, one stop each. */
async function MyActions({ searchParams }: { searchParams: DashboardSearchParams }) {
  const { data, staleApplications } = await loadMyActions(searchParams);
  return <ActionCenter data={data} staleApplications={staleApplications} />;
}
