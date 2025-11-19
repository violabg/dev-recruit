import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { CandidateSelectionForm } from "@/components/interview/candidate-selection-form";
import { InvitesList } from "@/components/interview/invites-list"; // Import AssignedInterview type
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getQuizAssignmentData } from "@/lib/data/interview-data";

export default async function InviteCandidatesPage({
  params,
}: {
  params: { id: string };
}) {
  const { id: quizId } = await params; // Destructure and rename id to quizId for clarity

  const data = await getQuizAssignmentData(quizId);

  if (!data || !data.quiz || !data.position) {
    return (
      <div className="flex flex-col justify-center items-center h-[400px]">
        <p className="font-medium text-lg">Quiz or Position not found</p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard/quizzes">Return to quizzes</Link>
        </Button>
      </div>
    );
  }

  const { quiz, position, assignedInterviews, unassignedCandidates } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/quizzes/${quizId}`}>
            <ArrowLeft className="mr-1 w-4 h-4" />
            Back to quiz
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="font-bold text-3xl">Assign quiz to candidates</h1>
        <p className="text-muted-foreground">
          Assign the quiz &quot;{quiz.title}&quot; for the position &quot;
          {position?.title}&quot; to candidates
        </p>
      </div>

      <Tabs defaultValue="candidates">
        <TabsList>
          <TabsTrigger value="candidates">Assign to candidates</TabsTrigger>
          <TabsTrigger value="interviews">Created interviews</TabsTrigger>
        </TabsList>

        <TabsContent value="candidates" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Assign quiz to candidates</CardTitle>
              <CardDescription>
                Select candidates and create interview links for this quiz
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

        <TabsContent value="interviews" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Created interviews</CardTitle>
              <CardDescription>
                Manage interviews created for this quiz
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
