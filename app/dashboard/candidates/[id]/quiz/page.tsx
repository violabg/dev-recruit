import { cn } from "cn";
import PageHeader from "@/components/page-header";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { QuizSelectionForm } from "@/components/quiz/quiz-selection-form";
import { InvitesList } from "@/components/recruiting/invites-list";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCandidateQuizData } from "@/lib/data/assessments";
import { Suspense } from "react";
import { CandidateQuizSkeleton } from "../sub-page-fallbacks";

/**
 * Static shell: the route `params` are only read inside the Suspense
 * boundary, so navigations into this page are instant (see
 * https://nextjs.org/docs/messages/instant-shell-url-data).
 */
export default function CandidateQuizPage(
  props: Parameters<typeof CandidateQuizContent>[0]
) {
  return (
    <Suspense fallback={<CandidateQuizSkeleton />}>
      <CandidateQuizContent {...props} />
    </Suspense>
  );
}

async function CandidateQuizContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: candidateId } = await params;

  const data = await getCandidateQuizData(candidateId);

  if (!data) {
    return redirect(
      `/dashboard/candidates/${candidateId}?error=${encodeURIComponent(
        "Impossibile caricare i dati del candidato"
      )}` as Route
    );
  }

  const { candidate, availableQuizzes, assignedAssessments } = data;
  const normalizedAvailableQuizzes = availableQuizzes.map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    createdAt: quiz.createdAt,
    timeLimit: quiz.timeLimit,
    positionTitle: quiz.positionTitle,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Assegna quiz"
        description={`${candidate.name} · ${candidate.email}`}
        actionBtns={
          <Link
            href={`/dashboard/candidates/${candidateId}` as never}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex",
            )}
          >
            <ArrowLeft className="size-4" />
            Torna al candidato
          </Link>
        }
      />

      <Tabs defaultValue="quizzes">
        <TabsList variant="line">
          <TabsTrigger value="quizzes">Assegna quiz</TabsTrigger>
          <TabsTrigger value="assessments">Test esistenti</TabsTrigger>
        </TabsList>

        <TabsContent value="quizzes" className="flex flex-col gap-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Assegna quiz al candidato</CardTitle>
              <CardDescription>
                Seleziona i quiz e crea i link del test per questo candidato
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuizSelectionForm
                candidateId={candidate.id}
                availableQuizzes={normalizedAvailableQuizzes}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessments" className="flex flex-col gap-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Test esistenti</CardTitle>
              <CardDescription>
                Gestisci i test creati per questo candidato
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvitesList assignedAssessments={assignedAssessments} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
