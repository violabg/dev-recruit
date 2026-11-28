import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { InterviewListItem } from "@/lib/data/interviews";
import type { UserOption } from "@/lib/data/users";
import { formatInterviewDateTime } from "@/lib/utils/interview-calendar";
import { cn } from "cn";
import { ClipboardList, NotebookPen, Radio } from "lucide-react";
import Link from "next/link";
import { InterviewCardActions } from "./interview-card-actions";
import { InterviewInvitePanel } from "./interview-invite-panel";
import {
  getInterviewStatusPresentation,
  HIRE_RECOMMENDATION_LABEL,
  KIT_STATUS_PRESENTATION,
  PARTICIPANT_ROLE_LABEL,
} from "./interview-presentation";

type InterviewCardProps = {
  interview: InterviewListItem;
  candidateName: string;
  positionTitle: string;
  users: UserOption[];
};

/**
 * One interview of the Colloqui tab: round, guide, date, status, kit,
 * participants, submitted scorecards, links to the interview pages, status
 * gestures and the summary to share.
 */
export function InterviewCard({
  interview,
  candidateName,
  positionTitle,
  users,
}: InterviewCardProps) {
  const status = getInterviewStatusPresentation(interview.status);
  const basePath = `/dashboard/applications/${interview.applicationId}/interviews/${interview.id}`;
  const linkClass = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "inline-flex",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span>Round {interview.round}</span>
          {interview.guideTitle && (
            <span className="font-normal text-muted-foreground">
              · {interview.guideTitle}
            </span>
          )}
        </CardTitle>
        <CardAction>
          <InterviewCardActions
            interview={{
              id: interview.id,
              scheduledAt: interview.scheduledAt,
              durationMinutes: interview.durationMinutes,
              meetingUrl: interview.meetingUrl,
              participants: interview.participants.map((participant) => ({
                userId: participant.userId,
                role: participant.role,
              })),
            }}
            status={interview.status}
            users={users}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>{formatInterviewDateTime(interview.scheduledAt)}</span>
          <span className="text-muted-foreground">
            · {interview.durationMinutes} min
          </span>
          <Badge className={status.badge}>{status.label}</Badge>
          {interview.kitStatus && (
            <Badge className={KIT_STATUS_PRESENTATION[interview.kitStatus].badge}>
              {KIT_STATUS_PRESENTATION[interview.kitStatus].label}
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Partecipanti</span>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {interview.participants.map((participant) => (
              <li key={participant.userId}>
                {participant.name}{" "}
                <span className="text-muted-foreground">
                  ({PARTICIPANT_ROLE_LABEL[participant.role]})
                </span>
              </li>
            ))}
          </ul>
        </div>

        {interview.submittedFeedback.length > 0 && (
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Feedback inviati</span>
            <ul className="flex flex-col gap-1">
              {interview.submittedFeedback.map((feedback) => (
                <li key={feedback.id}>
                  {feedback.interviewerName}
                  {feedback.hireRecommendation && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {HIRE_RECOMMENDATION_LABEL[feedback.hireRecommendation]}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Link href={`${basePath}/prepare` as never} className={linkClass}>
            <ClipboardList className="size-4" />
            Prepara
          </Link>
          <Link href={`${basePath}/live` as never} className={linkClass}>
            <Radio className="size-4" />
            Live
          </Link>
          <Link href={`${basePath}/feedback` as never} className={linkClass}>
            <NotebookPen className="size-4" />
            Feedback
          </Link>
        </div>

        <InterviewInvitePanel
          interviewId={interview.id}
          round={interview.round}
          candidateName={candidateName}
          positionTitle={positionTitle}
          scheduledAt={interview.scheduledAt}
          durationMinutes={interview.durationMinutes}
          meetingUrl={interview.meetingUrl}
          participants={interview.participants.map((participant) => ({
            name: participant.name,
            role: participant.role,
          }))}
          status={interview.status}
          sequence={interview.sequence}
        />
      </CardContent>
    </Card>
  );
}
