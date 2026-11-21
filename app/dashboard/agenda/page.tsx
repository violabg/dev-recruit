import { MineToggle } from "@/components/applications/mine-toggle";
import { AgendaList } from "@/components/interviews/agenda-list";
import { AgendaListSkeleton } from "@/components/interviews/agenda-list-skeleton";
import PageHeader from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth-server";
import { getAgendaInterviews } from "@/lib/data/interviews";
import { cacheLife } from "next/cache";
import { Suspense } from "react";

type AgendaSearchParams = Promise<{ mine?: string }>;

/** Agenda of the interviews scheduled and in progress. */
export default function AgendaPage({
  searchParams,
}: {
  searchParams: AgendaSearchParams;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Agenda colloqui"
        description="Colloqui pianificati e in corso"
      />

      <Suspense>
        <MineToggle label="Solo i miei" />
      </Suspense>

      <Suspense fallback={<AgendaListSkeleton />}>
        <AgendaContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AgendaContent({
  searchParams,
}: {
  searchParams: AgendaSearchParams;
}) {
  const { mine } = await searchParams;
  const view = await getAgendaView(mine === "1");

  return <AgendaList interviews={view.interviews} now={view.now} />;
}

/**
 * Request-time part of the Agenda. The cached read is the same for every user;
 * "Solo i miei" filters it in memory and never limits access.
 *
 * The session, the clock and the filter are read inside `use cache: private`,
 * so the result is cached in the browser and included in the per-link prefetch:
 * navigating to the agenda shows the list instead of the table skeleton.
 */
async function getAgendaView(mine: boolean) {
  "use cache: private";
  cacheLife("minutes");

  const user = await getCurrentUser();
  const rows = await getAgendaInterviews();

  const interviews =
    mine && user
      ? rows.filter(
          (row) =>
            row.ownerId === user.id ||
            row.participants.some(
              (participant) => participant.userId === user.id,
            ),
        )
      : rows;

  return { interviews, now: new Date() };
}
