import { MineToggle } from "@/components/applications/mine-toggle";
import { AgendaList } from "@/components/interviews/agenda-list";
import PageHeader from "@/components/page-header";
import { TableSkeleton } from "@/components/skeletons";
import { getCurrentUser } from "@/lib/auth-server";
import { getAgendaInterviews } from "@/lib/data/interviews";
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
        section="agenda"
        title="Agenda colloqui"
        description="Colloqui pianificati e in corso"
      />

      <Suspense>
        <MineToggle label="Solo i miei" />
      </Suspense>

      <Suspense
        fallback={
          <TableSkeleton
            columns={[
              { header: "Ora", cell: "text" },
              { header: "Colloquio", cell: "stacked" },
              { header: "Stato", cell: "badge" },
              { header: "", cell: "action", actionCount: 2 },
            ]}
          />
        }
      >
        <AgendaContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/**
 * Request-time part of the Agenda: the cached read is the same for every
 * user; "Solo i miei" filters it in memory and never limits access.
 */
async function AgendaContent({
  searchParams,
}: {
  searchParams: AgendaSearchParams;
}) {
  const { mine } = await searchParams;
  const user = await getCurrentUser();
  const rows = await getAgendaInterviews();

  const interviews =
    mine === "1" && user
      ? rows.filter(
          (row) =>
            row.ownerId === user.id ||
            row.participants.some(
              (participant) => participant.userId === user.id,
            ),
        )
      : rows;

  return <AgendaList interviews={interviews} now={new Date()} />;
}
