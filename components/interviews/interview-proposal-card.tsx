import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InterviewProposalItem } from "@/lib/data/interview-proposals";
import { formatDate } from "@/lib/utils";
import { formatInterviewDateTime } from "@/lib/utils/interview-calendar";
import { InterviewProposalActions } from "./interview-proposal-actions";
import { PARTICIPANT_ROLE_LABEL } from "./interview-presentation";

/**
 * A pending interview proposal of the Colloqui tab, prepared with the
 * assistant: round, guide, date, participants, author, Pianifica and Scarta.
 */
export function InterviewProposalCard({
  proposal,
  canSchedule,
}: {
  proposal: InterviewProposalItem;
  canSchedule: boolean;
}) {
  return (
    <Card className="border-dashed border-stage-pending/60">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span>Round {proposal.round}</span>
          {proposal.guideTitle && (
            <span className="font-normal text-muted-foreground">· {proposal.guideTitle}</span>
          )}
          <Badge className="bg-stage-pending/10 text-stage-pending">Proposta</Badge>
        </CardTitle>
        <CardAction>
          <InterviewProposalActions proposalId={proposal.id} canSchedule={canSchedule} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>{formatInterviewDateTime(proposal.scheduledAt)}</span>
          <span className="text-muted-foreground">· {proposal.durationMinutes} min</span>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Partecipanti</span>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {proposal.participants.map((participant) => (
              <li key={participant.userId}>
                {participant.name}{" "}
                <span className="text-muted-foreground">
                  ({PARTICIPANT_ROLE_LABEL[participant.role]})
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-muted-foreground">
          Proposta da {proposal.createdByName} con l&apos;assistente il{" "}
          {formatDate(new Date(proposal.createdAt).toISOString())}: non è ancora pianificata.
          {!canSchedule && " La candidatura è chiusa: la proposta si può solo scartare."}
        </p>
      </CardContent>
    </Card>
  );
}
