import {
  CodeSnippetDisplay,
  MultipleChoiceDisplay,
  OpenQuestionDisplay,
} from "@/components/quiz/question-display";
import { SaveFavoriteButton } from "@/components/quiz/save-favorite-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getQuizById } from "@/lib/data/quizzes";

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

  return (
    <>
      {quiz.questions.map((question, index) => (
        <Card
          key={index}
          className="shadow-md hover:shadow-lg pt-0 border-primary/20 ring-1 ring-primary/5 overflow-hidden transition-all"
        >
          <CardHeader className="gap-0 bg-primary/10 pt-4 [.border-b]:pb-4 border-b">
            <CardTitle className="flex justify-between items-center gap-2 text-lg">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="flex justify-center items-center p-0 rounded-full w-6 h-6"
                >
                  {index + 1}
                </Badge>
                <span>
                  {question.type === "multiple_choice"
                    ? "Risposta multipla"
                    : question.type === "open_question"
                    ? "Domanda aperta"
                    : "Snippet di codice"}
                </span>
              </div>
              <SaveFavoriteButton question={question} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <h3 className="font-bold dark:text-primary text-sm">Domanda:</h3>
              <p className="mt-1">{question.question}</p>
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
          </CardContent>
        </Card>
      ))}
    </>
  );
}
