import { QuizCard } from "@/components/quiz/quiz-card";
import { SearchAndFilterQuizzes } from "@/components/quiz/search-and-filter-quizzes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { fetchQuizzesData } from "./quizzes-actions";

export default async function QuizzesPage({
  searchParams,
}: {
  searchParams: any;
}) {
  const params = await searchParams;

  const search = params?.search || "";
  const sort = params?.sort || "newest";
  const filter = params?.filter || "all";

  const { quizzes, fetchError, uniqueLevels, positionCounts } =
    await fetchQuizzesData({ search, sort, filter });

  return (
    <div className="space-y-6">
      <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-2">
        <h1 className="font-bold text-3xl">Quiz</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/positions">Posizioni</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/candidates">Candidati</Link>
          </Button>
        </div>
      </div>

      {/* Outer container for the main two-column layout. Enables container queries for its children. */}
      <div className="@container">
        {/* Main grid: 1 column by default, 2 columns when container width is >= 700px. */}
        {/* The second column (stats/actions) will flow below the first on narrower container widths. */}
        <div className="gap-4 grid grid-cols-1 @[700px]:grid-cols-[1fr_250px]">
          <div className="space-y-4">
            <SearchAndFilterQuizzes uniqueLevels={uniqueLevels} />

            {fetchError ? (
              <div className="bg-destructive/15 p-4 rounded-md text-destructive">
                <p>
                  Si è verificato un errore nel caricamento dei quiz:{" "}
                  {fetchError}
                </p>
              </div>
            ) : quizzes && quizzes.length > 0 ? (
              // Quiz items grid:
              // - 1 column by default.
              // - 2 columns when its container (the div above) is >= 1060px wide.
              // - 3 columns when its container is >= 1470px wide.
              <div className="gap-4 grid grid-cols-1 @[1060px]:grid-cols-2 @[1470px]:grid-cols-3">
                {quizzes.map((quiz) => (
                  <QuizCard key={quiz.id} quiz={quiz} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center border border-dashed rounded-lg h-[300px]">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">
                    {search || filter !== "all"
                      ? "Nessun quiz trovato con i criteri di ricerca specificati."
                      : "Nessun quiz creato. Crea un quiz per una posizione."}
                  </p>
                  <Button className="mt-4" size="sm" asChild>
                    <Link href="/dashboard/positions">Vai alle posizioni</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* This is the second column (statistics, actions). */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Statistiche</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Quiz totali:</span>
                    <span className="font-medium">{quizzes?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quiz inviati:</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quiz completati:</span>
                    <span className="font-medium">0</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quiz per posizione</CardTitle>
              </CardHeader>
              <CardContent>
                {positionCounts && positionCounts.length > 0 ? (
                  <div className="space-y-2">
                    {positionCounts.map((item) => (
                      <div
                        key={item.position_id}
                        className="flex justify-between"
                      >
                        <span className="truncate">{item.position_title}</span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Nessun dato disponibile
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Azioni rapide</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button
                    className="justify-start w-full"
                    variant="outline"
                    asChild
                  >
                    <Link href="/dashboard/positions">Crea nuovo quiz</Link>
                  </Button>
                  <Button
                    className="justify-start w-full"
                    variant="outline"
                    asChild
                  >
                    <Link href="/dashboard/candidates">Gestisci candidati</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
