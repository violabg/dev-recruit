import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { CandidateSelectionForm } from "@/components/recruiting/candidate-selection-form";
import { InvitesList } from "@/components/recruiting/invites-list"; // Import AssignedInterview type
import { buttonVariants } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getQuizAssignmentData } from "@/lib/data/interviews";
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

  const { quiz, position, assignedInterviews, unassignedCandidates } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/quizzes/${quizId}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="mr-1 size-4" />
          Torna al quiz
        </Link>
      </div>

      <div>
        <h1 className="font-display font-extrabold text-heading text-[2.125rem] lg:text-[2.5rem] text-balance leading-[2.5rem] lg:leading-[2.875rem] tracking-[-0.03em]">Assegna il quiz ai candidati</h1>
        <p className="text-muted-foreground">
          Assegna il quiz &quot;{quiz.title}&quot; per la posizione &quot;
          {position?.title}&quot; ai candidati
        </p>
      </div>

      <Tabs defaultValue="candidates">
        <TabsList variant="line">
          <TabsTrigger value="candidates">Assegna ai candidati</TabsTrigger>
          <TabsTrigger value="interviews">Colloqui creati</TabsTrigger>
        </TabsList>

        <TabsContent value="candidates" className="flex flex-col gap-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Assegna il quiz ai candidati</CardTitle>
              <CardDescription>
                Seleziona i candidati e crea i link di colloquio per questo quiz
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

        <TabsContent value="interviews" className="flex flex-col gap-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Colloqui creati</CardTitle>
              <CardDescription>
                Gestisci i colloqui creati per questo quiz
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvitesList assignedInterviews={assignedInterviews} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
