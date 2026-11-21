import PageHeader from "@/components/page-header";
import { cn } from "cn";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { CandidateSelectionForm } from "@/components/recruiting/candidate-selection-form";
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
import { getQuizAssignmentData } from "@/lib/data/assessments";
import { InviteCandidatesSkeleton } from "./fallbacks";

export default async function InviteCandidatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<InviteCandidatesSkeleton />}>
      <InviteCandidatesContent params={params} />
    </Suspense>
  );
}

async function InviteCandidatesContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: quizId } = await params; // Destructure and rename id to quizId for clarity

  const data = await getQuizAssignmentData(quizId);

  if (!data || !data.quiz || !data.position) {
    return (
      <div className="flex flex-col justify-center items-center h-100">
        <p className="font-medium text-lg">Quiz o posizione non trovati</p>
        <Link
          href="/dashboard/quizzes"
          className={cn("mt-4", buttonVariants({ variant: "default" }))}
        >
          Torna ai quiz
        </Link>
      </div>
    );
  }

  const { quiz, position, assignedAssessments, unassignedCandidates } = data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Associa a candidati"
        description={`${quiz.title} · ${position?.title ?? "Senza posizione"}`}
        actionBtns={
          <Link
            href={`/dashboard/quizzes/${quizId}` as never}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex",
            )}
          >
            <ArrowLeft className="size-4" />
            Torna al quiz
          </Link>
        }
      />

      <Tabs defaultValue="candidates">
        <TabsList variant="line">
          <TabsTrigger value="candidates">Assegna ai candidati</TabsTrigger>
          <TabsTrigger value="assessments">Test creati</TabsTrigger>
        </TabsList>

        <TabsContent value="candidates" className="flex flex-col gap-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Assegna il quiz ai candidati</CardTitle>
              <CardDescription>
                Seleziona i candidati e crea i link del test per questo quiz
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CandidateSelectionForm
                quizId={quiz.id}
                unassignedCandidates={unassignedCandidates}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessments" className="flex flex-col gap-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Test creati</CardTitle>
              <CardDescription>
                Gestisci i test creati per questo quiz
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
