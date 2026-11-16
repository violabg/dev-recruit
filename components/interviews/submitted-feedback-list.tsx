import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { InterviewFeedbackPage } from "@/lib/data/interviews";
import { formatInterviewDateTime } from "@/lib/utils/interview-calendar";
import { ChevronDown } from "lucide-react";
import { HIRE_RECOMMENDATION_LABEL } from "./interview-presentation";

type SubmittedFeedbackListProps = {
  items: InterviewFeedbackPage["othersSubmitted"];
  /** Whole scorecard of the position: unknown criterion ids are ignored */
  criteria: { id: string; name: string; archived: boolean }[];
  /** Closed by default for an interviewer who has not submitted yet */
  collapsed: boolean;
};

/**
 * Scorecards already submitted by the other interviewers, with the live
 * notes their submission published. Never filtered: only presented.
 */
export function SubmittedFeedbackList({
  items,
  criteria,
  collapsed,
}: SubmittedFeedbackListProps) {
  if (items.length === 0) return null;

  const list = (
    <div className="flex flex-col gap-4">
      {items.map((feedback) => (
        <SubmittedFeedbackCard
          key={feedback.id}
          feedback={feedback}
          criteria={criteria}
        />
      ))}
    </div>
  );

  if (!collapsed) {
    return (
      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-lg">
          Schede già inviate ({items.length})
        </h2>
        {list}
      </section>
    );
  }

  return (
    <Collapsible defaultOpen={false} className="flex flex-col gap-4">
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="group flex justify-between items-center w-full text-left"
          />
        }
      >
        <span className="font-semibold text-lg">
          Schede già inviate ({items.length})
        </span>
        <ChevronDown className="size-4 text-muted-foreground group-data-[panel-open]:rotate-180 transition-transform" />
      </CollapsibleTrigger>
      <p className="text-muted-foreground text-sm">
        Per un giudizio indipendente, leggile dopo aver inviato la tua
      </p>
      <CollapsibleContent>{list}</CollapsibleContent>
    </Collapsible>
  );
}

function SubmittedFeedbackCard({
  feedback,
  criteria,
}: {
  feedback: InterviewFeedbackPage["othersSubmitted"][number];
  criteria: SubmittedFeedbackListProps["criteria"];
}) {
  const byId = new Map(criteria.map((criterion) => [criterion.id, criterion]));
  const scores = feedback.scores.flatMap((score) => {
    const criterion = byId.get(score.criterionId);
    return criterion ? [{ ...score, criterion }] : [];
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span>{feedback.interviewerName}</span>
          {feedback.hireRecommendation && (
            <span className="font-normal text-muted-foreground">
              · {HIRE_RECOMMENDATION_LABEL[feedback.hireRecommendation]}
            </span>
          )}
        </CardTitle>
        <p className="text-muted-foreground text-xs">
          Inviata il {formatInterviewDateTime(feedback.submittedAt)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {scores.length > 0 && (
          <ul className="flex flex-col gap-2">
            {scores.map((score) => (
              <li key={score.criterionId}>
                <span className="font-medium">
                  {score.criterion.name}
                  {score.criterion.archived ? " (archiviato)" : ""}
                </span>{" "}
                <span className="tabular-nums">{score.score}/5</span>
                {score.evidence && (
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {score.evidence}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {feedback.notes && (
          <div className="flex flex-col gap-1">
            <span className="font-medium">Note</span>
            <p className="whitespace-pre-wrap">{feedback.notes}</p>
          </div>
        )}

        {feedback.redFlags.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="font-medium">Segnali d&apos;allarme</span>
            <ul className="pl-5 list-disc">
              {feedback.redFlags.map((flag, index) => (
                <li key={index}>{flag}</li>
              ))}
            </ul>
          </div>
        )}

        {feedback.standoutMoments.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="font-medium">Momenti di rilievo</span>
            <ul className="pl-5 list-disc">
              {feedback.standoutMoments.map((moment, index) => (
                <li key={index}>{moment}</li>
              ))}
            </ul>
          </div>
        )}

        {feedback.liveNotes.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="font-medium">Note durante il colloquio</span>
            <ul className="flex flex-col gap-2">
              {feedback.liveNotes.map((note) => (
                <li
                  key={note.kitItemId}
                  className="bg-muted/40 p-3 border rounded-md"
                >
                  <p className="font-medium">{note.itemText}</p>
                  {note.score !== null && (
                    <p className="tabular-nums">Voto {note.score}/5</p>
                  )}
                  {note.note && (
                    <p className="whitespace-pre-wrap">{note.note}</p>
                  )}
                  {note.evidenceQuote && (
                    <p className="text-muted-foreground italic">
                      «{note.evidenceQuote}»
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
