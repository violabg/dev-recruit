import {
  BehavioralScenarioDisplay,
  CodeSnippetDisplay,
  MultipleChoiceDisplay,
  OpenQuestionDisplay,
} from "@/components/quiz/question-display";
import { SaveFavoriteButton } from "@/components/quiz/save-favorite-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BlockLabel } from "@/components/detail-blocks";
import { getQuizById } from "@/lib/data/quizzes";
import { getScorecardByPositionId } from "@/lib/data/scorecards";

type Props = {
  params: Promise<{ id: string }>;
};

export async function QuizQuestionsContent({ params }: Props) {
  const { id } = await params;
  const quiz = await getQuizById(id);

  if (!quiz || !quiz.questions.length) {
    return (
      <div className="flex flex-col justify-center items-center py-8">
        <p className="text-muted-foreground">Nessuna domanda disponibile</p>
      </div>
    );
  }

  // Names of the criteria of the quiz position; ids of deleted criteria are
  // not found and skipped
  const scorecard = await getScorecardByPositionId(quiz.positionId);
  const criterionLabels = new Map<string, string>([
    ...(scorecard?.criteria ?? []).map(
      (criterion) => [criterion.id, criterion.name] as const,
    ),
    ...(scorecard?.archivedCriteria ?? []).map(
      (criterion) => [criterion.id, `${criterion.name} (archiviato)`] as const,
    ),
  ]);
  const criterionNamesOf = (criterionIds: string[] | undefined) =>
    (criterionIds ?? []).flatMap((criterionId) => {
      const label = criterionLabels.get(criterionId);
      return label ? [{ id: criterionId, label }] : [];
    });

  const TYPE_LABEL: Record<string, string> = {
    multiple_choice: "Risposta multipla",
    open_question: "Domanda aperta",
    behavioral_scenario: "Scenario comportamentale",
    code_snippet: "Snippet di codice",
  };

  return (
    <>
      {quiz.questions.map((question, index) => {
        const criteria = criterionNamesOf(question.criterionIds);
        return (
          <Card key={index}>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 font-display font-bold text-muted-foreground text-sm tabular-nums">
                  {index + 1}.
                </span>
                <div className="flex flex-col flex-1 gap-2 min-w-0">
                  <BlockLabel>{TYPE_LABEL[question.type] ?? question.type}</BlockLabel>
                  <p className="font-semibold text-foreground text-base leading-snug whitespace-pre-wrap">
                    {question.question}
                  </p>
                </div>
                <SaveFavoriteButton question={question} />
              </div>

              {question.type === "multiple_choice" && (
                <MultipleChoiceDisplay question={question} />
              )}

              {question.type === "open_question" && (
                <OpenQuestionDisplay question={question} />
              )}

              {question.type === "code_snippet" && (
                <CodeSnippetDisplay question={question} />
              )}

              {question.type === "behavioral_scenario" && (
                <BehavioralScenarioDisplay question={question} />
              )}

              {criteria.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
                  <BlockLabel>Criteri</BlockLabel>
                  {criteria.map((criterion) => (
                    <Badge key={criterion.id} variant="secondary">
                      {criterion.label}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}
