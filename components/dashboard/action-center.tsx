import { ApplicationStageBadge } from "@/components/applications/application-stage-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActionCenterData } from "@/lib/data/applications";
import { formatDate } from "@/lib/utils";
import { STALE_APPLICATION_DAYS } from "@/lib/utils/application-stage";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const ROW_CLASS =
  "group flex items-center gap-3 hover:bg-muted/70 focus-visible:bg-muted/70 px-2 py-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors";

/** One card of the home: title, count and the rows, or its empty text. */
function ActionCard({
  title,
  count,
  emptyText = "Niente da fare",
  children,
}: {
  title: string;
  count: number;
  emptyText?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-baseline gap-3">
        <CardTitle>{title}</CardTitle>
        <span className="font-display font-bold text-heading text-2xl tabular-nums">
          {count}
        </span>
      </CardHeader>
      <CardContent>
        {count === 0 ? (
          <p className="text-muted-foreground text-sm">{emptyText}</p>
        ) : (
          <ul className="-mx-2">{children}</ul>
        )}
      </CardContent>
    </Card>
  );
}

/** A row that leads to the page where the action is done. */
function ActionRow({
  href,
  title,
  detail,
  aside,
}: {
  href: string;
  title: string;
  detail?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <li>
      <Link href={href as never} className={ROW_CLASS}>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{title}</p>
          {detail && (
            <p className="text-muted-foreground text-sm truncate">{detail}</p>
          )}
        </div>
        {aside}
        <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
      </Link>
    </li>
  );
}

/**
 * Home "Le mie azioni": what waits for an action. The data arrives already
 * filtered by the page; staleness is decided by the page as well.
 */
export function ActionCenter({
  data,
  staleApplications,
}: {
  data: ActionCenterData;
  staleApplications: ActionCenterData["openApplications"];
}) {
  return (
    <div className="gap-6 grid md:grid-cols-2 xl:grid-cols-3">
      <ActionCard
        title="Test da valutare"
        count={data.assessmentsToEvaluate.length}
      >
        {data.assessmentsToEvaluate.map((item) => (
          <ActionRow
            key={item.assessmentId}
            href={`/dashboard/assessments/${item.assessmentId}`}
            title={`${item.candidateName} · ${item.positionTitle}`}
            detail={item.quizTitle}
          />
        ))}
      </ActionCard>

      <ActionCard
        title={`Candidature ferme da più di ${STALE_APPLICATION_DAYS} giorni`}
        count={staleApplications.length}
      >
        {staleApplications.map((item) => (
          <ActionRow
            key={item.applicationId}
            href={`/dashboard/applications/${item.applicationId}`}
            title={`${item.candidateName} · ${item.positionTitle}`}
            detail={`Ultimo cambio di fase: ${formatDate(
              new Date(item.stageChangedAt).toISOString(),
            )}`}
            aside={<ApplicationStageBadge stage={item.stage} />}
          />
        ))}
      </ActionCard>

      <ActionCard
        title="Posizioni con setup incompleto"
        count={data.positionsWithIncompleteSetup.length}
      >
        {data.positionsWithIncompleteSetup.map((item) => (
          <ActionRow
            key={item.positionId}
            href={`/dashboard/positions/${item.positionId}`}
            title={item.title}
            detail="Manca: Quiz"
          />
        ))}
      </ActionCard>

      <ActionCard
        title="Colloqui senza kit pronto"
        count={data.interviewsWithoutKit.length}
        emptyText="Disponibile con la Fase 3"
      >
        {data.interviewsWithoutKit.map((item) => (
          <ActionRow
            key={item.applicationId}
            href={`/dashboard/applications/${item.applicationId}`}
            title={`${item.candidateName} · ${item.positionTitle}`}
          />
        ))}
      </ActionCard>

      <ActionCard
        title="Schede da compilare"
        count={data.feedbackToFill.length}
        emptyText="Disponibile con la Fase 3"
      >
        {data.feedbackToFill.map((item) => (
          <ActionRow
            key={item.applicationId}
            href={`/dashboard/applications/${item.applicationId}`}
            title={`${item.candidateName} · ${item.positionTitle}`}
          />
        ))}
      </ActionCard>
    </div>
  );
}
