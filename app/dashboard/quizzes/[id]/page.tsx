import {
  CodeSnippetDisplay,
  MultipleChoiceDisplay,
  OpenQuestionDisplay,
} from "@/components/quiz/question-display";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteQuiz } from "@/lib/actions/quizzes";
import prisma from "@/lib/prisma";
import { Question } from "@/lib/schemas";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Clock, Edit, Link2, Send, Trash } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { QuizDetailSkeleton } from "./fallbacks";

type Position = {
  id: string;
  title: string;
  experience_level: string;
};

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

  const quizRecord = await prisma.quiz.findFirst({
    where: { id },
    include: {
      position: {
        select: {
          id: true,
          title: true,
          experienceLevel: true,
        },
      },
    },
  });

  if (!quizRecord) {
    return (
      <div className="flex flex-col justify-center items-center h-[400px]">
        <p className="font-medium text-lg">Quiz non trovato</p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard/quizzes">Torna ai quiz</Link>
        </Button>
      </div>
    );
  }

  const quiz = {
    id: quizRecord.id,
    title: quizRecord.title,
    position_id: quizRecord.positionId,
    time_limit: quizRecord.timeLimit,
    questions: Array.isArray(quizRecord.questions)
      ? (quizRecord.questions as Question[])
      : [],
    created_at: quizRecord.createdAt.toISOString(),
  };

  const position: Position | null = quizRecord.position
    ? {
        id: quizRecord.position.id,
        title: quizRecord.position.title,
        experience_level: quizRecord.position.experienceLevel,
      }
    : null;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/positions/${position.id}`}>
            <ArrowLeft className="mr-1 w-4 h-4" />
            Torna alla posizione
          </Link>
        </Button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-3xl">{quiz.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{position.title}</Badge>
            <Badge variant="outline">{position.experience_level}</Badge>
            {quiz.time_limit && (
              <Badge variant="secondary">
                <Clock className="mr-1 w-3 h-3" />
                {quiz.time_limit} minuti
              </Badge>
            )}
            <span className="text-muted-foreground text-sm">
              Creato il {formatDate(quiz.created_at)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/quizzes/${quiz.id}/edit`}>
              <Edit className="mr-2 w-4 h-4" />
              Modifica
            </Link>
          </Button>
          <Button variant="default" asChild>
            <Link href={`/dashboard/quizzes/${quiz.id}/invite`}>
              <Send className="mr-2 w-4 h-4" />
              Assicia a candidati
            </Link>
          </Button>
          {/* Delete button uses server action */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash className="mr-2 w-4 h-4" />
                Elimina
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Questa azione non può essere annullata. Il quiz verrà
                  eliminato permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <form action={deleteQuiz}>
                  <input type="hidden" name="quiz_id" value={quiz.id} />
                  <AlertDialogAction
                    type="submit"
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    Elimina
                  </AlertDialogAction>
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
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
                  <CardTitle className="flex items-center gap-2 text-lg">
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
                    {quiz.time_limit
                      ? `${quiz.time_limit} minuti`
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
                    {position.title} ({position.experience_level})
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
              <div className="flex flex-col justify-center items-center border border-dashed rounded-lg h-[200px]">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">
                    Nessun candidato ha ancora completato questo quiz
                  </p>
                  <Button className="mt-2" size="sm" asChild>
                    <Link href={`/dashboard/quizzes/${quiz.id}/invite`}>
                      <Link2 className="mr-2 w-4 h-4" />
                      Associa a candidati
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
