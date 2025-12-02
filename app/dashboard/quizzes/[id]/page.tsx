import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRecentQuizIds } from "@/lib/data/quizzes";
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

export default async function QuizDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="space-y-6">
      {/* Back button - static */}
      <Suspense fallback={<QuizHeaderSkeleton />}>
        <QuizHeader params={params} />
      </Suspense>

      {/* Tabs shell - static, content loaded via Suspense */}
      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Domande</TabsTrigger>
          <TabsTrigger value="settings">Impostazioni</TabsTrigger>
          <TabsTrigger value="results">Risultati</TabsTrigger>
        </TabsList>
        <TabsContent value="questions" className="space-y-6 pt-4">
          <Suspense fallback={<QuizQuestionsTabSkeleton />}>
            <QuizQuestionsContent params={params} />
          </Suspense>
        </TabsContent>
        <TabsContent value="settings" className="space-y-4 pt-4">
          <Suspense fallback={<QuizSettingsTabSkeleton />}>
            <QuizSettingsContent params={params} />
          </Suspense>
        </TabsContent>
        <TabsContent value="results" className="space-y-4 pt-4">
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
    </div>
  );
}
