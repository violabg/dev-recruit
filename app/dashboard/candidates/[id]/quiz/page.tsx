import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InvitesList } from "@/components/interview/invites-list";
import { QuizSelectionForm } from "@/components/quiz/quiz-selection-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCandidateQuizData } from "@/lib/data/interviews";

export default async function CandidateQuizPage({
  params,
}: {
  params: { id: string };
}) {
  const { id: candidateId } = await params;

  const data = await getCandidateQuizData(candidateId);

  if (!data) {
    return redirect(
      `/dashboard/candidates/${candidateId}?error=${encodeURIComponent(
        "Failed to load candidate data"
      )}` as Route
    );
  }

  const { candidate, position, availableQuizzes, assignedInterviews } = data;
  const normalizedAvailableQuizzes = availableQuizzes.map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    createdAt: quiz.createdAt,
    timeLimit: quiz.timeLimit,
  }));

  if (!candidate || !position) {
    return (
      <div className="flex flex-col justify-center items-center h-[400px]">
        <p className="font-medium text-lg">Candidate or Position not found</p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard/candidates">Return to candidates</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/candidates/${candidateId}`}>
            <ArrowLeft className="mr-1 w-4 h-4" />
            Back to candidate
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="font-bold text-3xl">Assign quizzes to candidate</h1>
        <p className="text-muted-foreground">
          Assign quizzes for the position &quot;{position.title}&quot; to &quot;
          {candidate.name}&quot; ({candidate.email})
        </p>
      </div>

      <Tabs defaultValue="quizzes">
        <TabsList>
          <TabsTrigger value="quizzes">Assign quizzes</TabsTrigger>
          <TabsTrigger value="interviews">Existing interviews</TabsTrigger>
        </TabsList>

        <TabsContent value="quizzes" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Assign quizzes to candidate</CardTitle>
              <CardDescription>
                Select quizzes and create interview links for this candidate
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

        <TabsContent value="interviews" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Existing interviews</CardTitle>
              <CardDescription>
                Manage interviews created for this candidate
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
