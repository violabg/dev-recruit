import { AddExistingQuizzesDialog } from "@/components/positions/add-existing-quizzes-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getQuizPickerOptions, getQuizzesForPosition } from "@/lib/data/quizzes";
import { cn } from "cn";
import { Plus } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Quizzes({ params }: Props) {
  const { id } = await params;
  const quizzes = await getQuizzesForPosition(id);
  // Not awaited: the dialog resolves it with use()
  const quizzesPromise = getQuizPickerOptions().catch(() => []);
  const positionQuizTitles = quizzes.map((quiz) => quiz.title);

  const renderActions = (className?: string) => (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Link
        href={`/dashboard/positions/${id}/quiz/new`}
        className={buttonVariants({ variant: "default", size: "sm" })}
      >
        <Plus className="mr-1 size-4" />
        Nuovo quiz
      </Link>
      <AddExistingQuizzesDialog
        positionId={id}
        quizzesPromise={quizzesPromise}
        positionQuizTitles={positionQuizTitles}
      />
    </div>
  );

  return (
    <>
      <div className="flex justify-between">
        <h2 className="font-display font-bold text-heading text-xl tracking-[-0.02em]">Quiz</h2>
        {renderActions()}
      </div>

      {quizzes.length > 0 ? (
        <div className="gap-4 grid md:grid-cols-2">
          {quizzes.map((quiz) => (
            <Card key={quiz.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{quiz.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {quiz.questions.length} domande
                    </span>
                    <span className="text-muted-foreground">
                      {quiz.timeLimit
                        ? `${quiz.timeLimit} minuti`
                        : "Nessun limite di tempo"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <Link
                      href={`/dashboard/quizzes/${quiz.id}`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      Visualizza
                    </Link>

                    <Link
                      href={`/dashboard/quizzes/${quiz.id}/invite`}
                      className={buttonVariants({
                        variant: "secondary",
                        size: "sm",
                      })}
                    >
                      Associa candidati
                    </Link>
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
              Nessun quiz per questa posizione
            </p>
            {renderActions("mt-2 justify-center")}
          </div>
        </div>
      )}
    </>
  );
}
