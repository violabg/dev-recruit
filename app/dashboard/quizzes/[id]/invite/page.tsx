import PageHeader from "@/components/page-header";
import { cn } from "cn";
import Link from "next/link";
import { Suspense } from "react";

import { CandidateSelectionForm } from "@/components/recruiting/candidate-selection-form";
import { InvitesList } from "@/components/recruiting/invites-list";
import { SECTIONS } from "@/components/dashboard/sections";
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
import { sectionTrail } from "@/lib/utils/breadcrumbs";
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
        <p className="font-medium text-lg">Test o posizione non trovati</p>
        <Link
          href="/dashboard/quizzes"
          className={cn("mt-4", buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Vai ai test
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
        breadcrumbs={sectionTrail(
          SECTIONS.quizzes,
          { label: quiz.title, href: `/dashboard/quizzes/${quizId}` },
          { label: "Assegna" },
        )}
      />

      <Tabs defaultValue="candidates">
        <TabsList variant="line">
          <TabsTrigger value="candidates">Assegna ai candidati</TabsTrigger>
          <TabsTrigger value="assessments">Test creati</TabsTrigger>
        </TabsList>

        <TabsContent value="candidates" className="flex flex-col gap-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Assegna il test ai candidati</CardTitle>
              <CardDescription>
                Seleziona i candidati e crea i link per questo test
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
                Gestisci i test inviati per questo test
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
