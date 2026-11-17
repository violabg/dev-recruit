import { HIRE_RECOMMENDATION_LABEL } from "@/components/interviews/interview-presentation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { HireRecommendation } from "@/lib/schemas";
import type {
  LegacyHiringNotes,
  LegacyRubric,
} from "@/lib/services/application-decisions";

export type LegacyEvaluationHistoryProps = {
  rubric: LegacyRubric | null;
  hiringNotes: LegacyHiringNotes | null;
};

function TextList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium text-sm">{title}</span>
      <ul className="pl-5 text-sm list-disc">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium text-sm">{title}</span>
      <p className="text-sm whitespace-pre-wrap">{text}</p>
    </div>
  );
}

/**
 * Behavioral rubric and test hiring notes collected before the interviewer
 * scorecard: read-only history, no form, no score.
 */
export function LegacyEvaluationHistory({
  rubric,
  hiringNotes,
}: LegacyEvaluationHistoryProps) {
  if (!rubric && !hiringNotes) {
    return null;
  }

  const rubricScores = rubric
    ? [
        { label: "Comunicazione", value: rubric.communicationScore },
        { label: "Collaborazione", value: rubric.collaborationScore },
        { label: "Problem Solving", value: rubric.problemSolvingScore },
        { label: "Culture Fit", value: rubric.cultureFitScore },
        ...(rubric.leadershipScore !== null
          ? [{ label: "Leadership", value: rubric.leadershipScore }]
          : []),
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storico (sola lettura)</CardTitle>
        <CardDescription>
          Dati raccolti prima della scheda intervistatore: non sono modificabili
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {rubric && (
          <section className="flex flex-col gap-3">
            <h3 className="font-semibold">Rubrica comportamentale</h3>
            <dl className="gap-2 grid sm:grid-cols-2 lg:grid-cols-5">
              {rubricScores.map((score) => (
                <div key={score.label} className="flex flex-col">
                  <dt className="text-muted-foreground text-xs">
                    {score.label}
                  </dt>
                  <dd className="font-medium tabular-nums">{score.value}/5</dd>
                </div>
              ))}
            </dl>
            <TextList
              title="Esempi di punti di forza"
              items={rubric.strengthExamples}
            />
            <TextList
              title="Aree di miglioramento"
              items={rubric.improvementAreas}
            />
            <TextBlock
              title="Commento complessivo"
              text={rubric.overallComments}
            />
          </section>
        )}

        {hiringNotes && (
          <section className="flex flex-col gap-3">
            <h3 className="font-semibold">Note hiring del test</h3>
            {hiringNotes.hireRecommendation && (
              <div className="flex flex-col gap-1">
                <span className="font-medium text-sm">Raccomandazione</span>
                <span className="text-sm">
                  {HIRE_RECOMMENDATION_LABEL[
                    hiringNotes.hireRecommendation as HireRecommendation
                  ] ?? hiringNotes.hireRecommendation}
                </span>
              </div>
            )}
            <TextBlock
              title="Note colloquio"
              text={hiringNotes.interviewNotes}
            />
            <TextList title="Red flag" items={hiringNotes.redFlags} />
            <TextList
              title="Momenti positivi"
              items={hiringNotes.standoutMoments}
            />
            <TextBlock title="Prossimi passi" text={hiringNotes.nextSteps} />
          </section>
        )}
      </CardContent>
    </Card>
  );
}
