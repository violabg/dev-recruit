import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getQuizById, getRecentQuizIds } from "@/lib/data/quizzes";
import { Suspense } from "react";
import {
  QuizHeaderSkeleton,
  QuizQuestionsTabSkeleton,
  QuizResultsSkeleton,
  QuizSettingsTabSkeleton,
} from "./fallbacks";
import { QuizHeader } from "./quiz-header";
import { QuizQuestionsContent } from "./quiz-questions-content";
import { QuizResultsContent } from "./quiz-results-content";
import { QuizSettingsContent } from "./quiz-settings-content";

export async function generateStaticParams() {
  const quizIds = await getRecentQuizIds(100);

  return quizIds.map((id) => ({ id }));
}

export default function QuizDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<QuizHeaderSkeleton />}>
        <QuizHeader params={params} />
      </Suspense>

      <Suspense fallback={<QuizSettingsTabSkeleton />}>
        <QuizSettingsContent params={params} />
      </Suspense>

      <Suspense fallback={<QuizQuestionsTabSkeleton />}>
        <QuizTabs params={params} />
      </Suspense>
    </div>
  );
}

/** The tabs; nothing is shown for a quiz that does not exist (the header already says so) */
async function QuizTabs({ params }: { params: Promise<{ id: string }> }) {
  const quiz = await getQuizById((await params).id);
  if (!quiz) return null;

  return (
    <Tabs defaultValue="questions">
      <TabsList variant="line">
        <TabsTrigger value="questions">Domande</TabsTrigger>
        <TabsTrigger value="results">Risultati</TabsTrigger>
      </TabsList>
      <TabsContent value="questions" className="flex flex-col gap-6 pt-4">
        <Suspense fallback={<QuizQuestionsTabSkeleton />}>
          <QuizQuestionsContent params={params} />
        </Suspense>
      </TabsContent>
      <TabsContent value="results" className="flex flex-col gap-4 pt-4">
        <Card>
          <CardHeader>
            <CardTitle>Risultati</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<QuizResultsSkeleton />}>
              <QuizResultsContent params={params} />
            </Suspense>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
