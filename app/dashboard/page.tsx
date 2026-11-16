import { MineToggle } from "@/components/applications/mine-toggle";
import { ActionCenter } from "@/components/dashboard/action-center";
import PageHeader from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth-server";
import {
  getActionCenterData,
  type ActionCenterData,
} from "@/lib/data/applications";
import { isApplicationStale } from "@/lib/utils/application-stage";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ActionCenterSkeleton } from "./fallbacks";

type DashboardSearchParams = Promise<{ mine?: string }>;

export default function DashboardPage({
  searchParams,
}: {
  searchParams: DashboardSearchParams;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        section="overview"
        title="Le mie azioni"
        description="Cosa aspetta una tua azione: test da valutare, candidature ferme, posizioni da completare."
        actionBtns={
          <Link
            href="/dashboard/positions/new"
            className={buttonVariants({ variant: "default" })}
          >
            <Plus className="mr-1 size-4" />
            Nuova posizione
          </Link>
        }
      />

      <Suspense>
        <MineToggle />
      </Suspense>

      <Suspense fallback={<ActionCenterSkeleton />}>
        <MyActions searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/**
 * Request-time part of the home. The cached read is the same for every user;
 * "Solo le mie" filters it in memory, and the clock is read only here.
 */
async function MyActions({
  searchParams,
}: {
  searchParams: DashboardSearchParams;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const data = await getActionCenterData();

  const mineOnly = params.mine === "1" && user;
  const isMine = (row: { ownerId: string | null }) =>
    !mineOnly || row.ownerId === user.id;

  // Positions with an incomplete setup have no application: never filtered
  const filtered: ActionCenterData = {
    assessmentsToEvaluate: data.assessmentsToEvaluate.filter(isMine),
    openApplications: data.openApplications.filter(isMine),
    positionsWithIncompleteSetup: data.positionsWithIncompleteSetup,
    interviewsWithoutKit: data.interviewsWithoutKit.filter(isMine),
    feedbackToFill: data.feedbackToFill.filter(isMine),
  };

  const now = new Date();
  const staleApplications = filtered.openApplications.filter((application) =>
    isApplicationStale(application, now),
  );

  return (
    <ActionCenter data={filtered} staleApplications={staleApplications} />
  );
}
