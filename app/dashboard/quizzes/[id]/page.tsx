import {
  CodeSnippetDisplay,
  MultipleChoiceDisplay,
  OpenQuestionDisplay,
} from "@/components/quiz/question-display";
import { SaveFavoriteButton } from "@/components/quiz/save-favorite-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getInterviewsByQuiz } from "@/lib/data/interviews";
import { getAllPositions } from "@/lib/data/positions";
import { getQuizById, getRecentQuizIds } from "@/lib/data/quizzes";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Clock, Eye, Link2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { QuizDetailSkeleton } from "./fallbacks";
import { QuizDetailActionsClient } from "./quiz-detail-actions-client";

export async function generateStaticParams() {
  const quizIds = await getRecentQuizIds(100);

  return quizIds.map((id) => ({ id }));
}

export default async function QuizDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<QuizDetailSkeleton />}>
      <QuizDetailContent params={params} />
    </Suspense>
  );
}

async function QuizDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const quiz = await getQuizById(id);

  if (!quiz) {
    return (
      <div className="flex flex-col justify-center items-center h-[400px]">
        <p className="font-medium text-lg">Quiz non trovato</p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard/quizzes">Torna ai quiz</Link>
        </Button>
      </div>
    );
  }

  const position = quiz.position;

  if (!position) {
    return (
      <div className="flex flex-col justify-center items-center h-[400px]">
        <p className="font-medium text-lg">Posizione non trovata</p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard/quizzes">Torna ai quiz</Link>
        </Button>
      </div>
    );
  }

  // Fetch all positions for duplicate dialog, excluding current position
  const allPositions = await getAllPositions();
  const positionsForDialog = allPositions.map((pos) => ({
    id: pos.id,
    title: pos.title,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/positions/${position.id}`}>
            <ArrowLeft className="mr-1 size-4" />
            Vai alla posizione
          </Link>
        </Button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-3xl">{quiz.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{position.title}</Badge>
            <Badge variant="outline">{position.experienceLevel}</Badge>
            {quiz.timeLimit && (
              <Badge variant="secondary">
                <Clock className="mr-1 w-3 h-3" />
                {quiz.timeLimit} minuti
              </Badge>
            )}
            <span className="text-muted-foreground text-sm">
              Creato il {formatDate(quiz.createdAt)}
            </span>
          </div>
        </div>
        <QuizDetailActionsClient
          quizId={quiz.id}
          quizTitle={quiz.title}
          positions={positionsForDialog}
        />
      </div>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Domande</TabsTrigger>
          <TabsTrigger value="settings">Impostazioni</TabsTrigger>
          <TabsTrigger value="results">Risultati</TabsTrigger>
        </TabsList>
        <TabsContent value="questions" className="space-y-4 pt-4">
          <div className="space-y-4">
            {quiz.questions.map((question, index) => (
              <Card key={index}>
                <CardHeader>
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
                    <h3 className="font-medium">Domanda:</h3>
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
          </div>
        </TabsContent>
        <TabsContent value="settings" className="space-y-4 pt-4">
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
                    {quiz.timeLimit
                      ? `${quiz.timeLimit} minuti`
                      : "Nessun limite"}
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
                    {position.title} ({position.experienceLevel})
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="results" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Risultati</CardTitle>
            </CardHeader>
            <CardContent>
              <QuizResultsContent quizId={quiz.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function QuizResultsContent({ quizId }: { quizId: string }) {
  const interviews = await getInterviewsByQuiz(quizId);

  if (interviews.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center border border-dashed rounded-lg h-[200px]">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            Nessun candidato ha ancora completato questo quiz
          </p>
          <Button className="mt-2" size="sm" asChild>
            <Link href={`/dashboard/quizzes/${quizId}/invite`}>
              <Link2 className="mr-1 size-4" />
              Associa a candidati
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              <th className="p-2 font-semibold text-left">Candidato</th>
              <th className="p-2 font-semibold text-left">Email</th>
              <th className="p-2 font-semibold text-left">Stato</th>
              <th className="p-2 font-semibold text-left">Data Creazione</th>
              <th className="p-2 font-semibold text-left">Data Inizio</th>
              <th className="p-2 font-semibold text-left">
                Data Completamento
              </th>
              <th className="p-2 font-semibold text-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {interviews.map((interview) => (
              <tr
                key={interview.id}
                className="hover:bg-muted/50 border-b transition-colors"
              >
                <td className="p-2">
                  <Link
                    href={`/dashboard/interviews/${interview.id}`}
                    className="text-primary hover:underline"
                  >
                    {interview.candidateName}
                  </Link>
                </td>
                <td className="p-2 text-muted-foreground">
                  {interview.candidateEmail}
                </td>
                <td className="p-2">
                  <Badge
                    variant={
                      interview.status === "completed"
                        ? "default"
                        : interview.status === "started"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {interview.status === "completed"
                      ? "Completato"
                      : interview.status === "started"
                      ? "Iniziato"
                      : "Assegnato"}
                  </Badge>
                </td>
                <td className="p-2 text-muted-foreground text-xs">
                  {formatDate(interview.createdAt)}
                </td>
                <td className="p-2 text-muted-foreground text-xs">
                  {interview.startedAt ? formatDate(interview.startedAt) : "—"}
                </td>
                <td className="p-2 text-muted-foreground text-xs">
                  {interview.completedAt
                    ? formatDate(interview.completedAt)
                    : "—"}
                </td>
                <td className="p-2 text-center">
                  <Button variant="ghost" size="icon" asChild>
                    <Link
                      href={`/dashboard/candidates/${interview.candidateId}`}
                    >
                      <Eye className="size-4 text-primary" />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
