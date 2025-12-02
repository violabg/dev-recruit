import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getQuizById } from "@/lib/data/quizzes";

export async function QuizSettingsContent({ quizId }: { quizId: string }) {
  const quiz = await getQuizById(quizId);

  if (!quiz) {
    return null;
  }

  const position = quiz.position;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Impostazioni del quiz</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="gap-4 grid md:grid-cols-2">
          <div>
            <h3 className="font-medium">Titolo</h3>
            <p className="text-muted-foreground text-sm">{quiz.title}</p>
          </div>
          <div>
            <h3 className="font-medium">Limite di tempo</h3>
            <p className="text-muted-foreground text-sm">
              {quiz.timeLimit ? `${quiz.timeLimit} minuti` : "Nessun limite"}
            </p>
          </div>
          <div>
            <h3 className="font-medium">Numero di domande</h3>
            <p className="text-muted-foreground text-sm">
              {quiz.questions.length}
            </p>
          </div>
          <div>
            <h3 className="font-medium">Posizione</h3>
            <p className="text-muted-foreground text-sm">
              {position?.title} ({position?.experienceLevel})
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
