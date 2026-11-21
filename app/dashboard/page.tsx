import { MineToggle } from "@/components/applications/mine-toggle";
import { ActionCenter, ActionSummary } from "@/components/dashboard/action-center";
import PageHeader from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth-server";
import { getActionCenterForUser } from "@/lib/data/applications";
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
 * Request-time read of the home: the shared action center of the session
 * user, with "Solo le mie" from the URL. The clock is read only here.
 */
async function loadMyActions(searchParams: DashboardSearchParams) {
  const params = await searchParams;
  const user = await getCurrentUser();

  return getActionCenterForUser(user?.id ?? "", {
    mineOnly: params.mine === "1" && !!user,
    now: new Date(),
  });
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
