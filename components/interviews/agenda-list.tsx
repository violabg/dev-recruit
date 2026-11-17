import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { AgendaInterview } from "@/lib/data/interviews";
import {
  APP_TIME_ZONE,
  groupAgendaInterviews,
} from "@/lib/utils/interview-calendar";
import { cn } from "cn";
import { CalendarDays, ClipboardList, Radio } from "lucide-react";
import Link from "next/link";
import {
  getInterviewStatusPresentation,
  KIT_STATUS_PRESENTATION,
  PARTICIPANT_ROLE_LABEL,
} from "./interview-presentation";

const timeFormat = new Intl.DateTimeFormat("it-IT", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Agenda of the interviews scheduled or in progress: 'Da aggiornare' first
 * (past days still scheduled), then one group per day from today.
 */
export function AgendaList({
  interviews,
  now,
}: {
  interviews: AgendaInterview[];
  now: Date;
}) {
  const groups = groupAgendaInterviews(interviews, now);

  if (groups.length === 0) {
    return (
      <Empty className="border h-[240px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarDays />
          </EmptyMedia>
          <EmptyTitle>Nessun colloquio pianificato</EmptyTitle>
          <EmptyDescription>
            I colloqui si pianificano dalla pagina della candidatura.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const linkClass = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "inline-flex",
  );

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <Card key={group.key}>
          <CardHeader>
            <CardTitle
              className={cn(group.key === "overdue" && "text-warning")}
            >
              {group.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y">
              {group.rows.map((interview) => {
                const status = getInterviewStatusPresentation(interview.status);
                const basePath = `/dashboard/applications/${interview.applicationId}/interviews/${interview.id}`;
                return (
                  <li
                    key={interview.id}
                    className="flex lg:flex-row flex-col lg:items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="w-14 font-mono tabular-nums text-sm shrink-0">
                      {timeFormat.format(interview.scheduledAt)}
                    </span>
                    <div className="flex flex-col flex-1 gap-1 min-w-0">
                      <Link
                        href={`/dashboard/applications/${interview.applicationId}?tab=colloqui` as never}
                        className="font-medium hover:underline truncate"
                      >
                        {interview.candidateName} · {interview.positionTitle}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted-foreground">
                          Round {interview.round} · {interview.durationMinutes}{" "}
                          min
                        </span>
                        <Badge className={status.badge}>{status.label}</Badge>
                        {interview.kitStatus && (
                          <Badge
                            className={
                              KIT_STATUS_PRESENTATION[interview.kitStatus].badge
                            }
                          >
                            {KIT_STATUS_PRESENTATION[interview.kitStatus].label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm truncate">
                        {interview.participants
                          .map(
                            (participant) =>
                              `${participant.name} (${PARTICIPANT_ROLE_LABEL[participant.role]})`,
                          )
                          .join(", ")}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Link
                        href={`${basePath}/prepare` as never}
                        className={linkClass}
                      >
                        <ClipboardList className="size-4" />
                        Prepara
                      </Link>
                      <Link href={`${basePath}/live` as never} className={linkClass}>
                        <Radio className="size-4" />
                        Live
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
