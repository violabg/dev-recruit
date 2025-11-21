import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getQuizzesForPosition } from "@/lib/data/quiz-data";
import { BrainCircuit, Plus } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";

export default async function Quizes({ id }: { id: string }) {
  "use cache";
  cacheLife("hours");
  cacheTag(`positions-${id}`);
  const quizzes = await getQuizzesForPosition(id);

  return (
    <>
      <div className="flex justify-between">
        <h2 className="font-semibold text-xl">Quiz</h2>
        <Button asChild>
          <Link href={`/dashboard/positions/${id}/quiz/new`}>
            New Quiz
            <Plus className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      </div>

      {quizzes.length > 0 ? (
        <div className="gap-4 grid md:grid-cols-2">
          {quizzes.map((quiz) => (
            <Card key={quiz.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{quiz.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {quiz.questions.length} domande
                    </span>
                    <span className="text-muted-foreground">
                      {quiz.time_limit
                        ? `${quiz.time_limit} minuti`
                        : "Nessun limite di tempo"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/quizzes/${quiz.id}`}>
                        Visualizza
                      </Link>
                    </Button>
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/dashboard/quizzes/${quiz.id}/invite`}>
                        Associa candidati
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col justify-center items-center border border-dashed rounded-lg h-[200px]">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              Nessun quiz creato per questa posizione
            </p>
            <Button className="mt-2" size="sm" asChild>
              <Link href={`/dashboard/positions/${id}/quiz/new`}>
                <BrainCircuit className="mr-2 w-4 h-4" />
                Genera Quiz AI
              </Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
