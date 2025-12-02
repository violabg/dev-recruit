import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRecentQuizIds } from "@/lib/data/quizzes";
import { Suspense } from "react";
import {
  QuizHeaderSkeleton,
  QuizQuestionsTabSkeleton,
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
  const { id } = await params;

  return (
    <div className="space-y-6">
      {/* Back button - static */}
      <Suspense fallback={<QuizHeaderSkeleton />}>
        <QuizHeader quizId={id} />
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
            <QuizQuestionsContent quizId={id} />
          </Suspense>
        </TabsContent>
        <TabsContent value="settings" className="space-y-4 pt-4">
          <Suspense fallback={<QuizSettingsTabSkeleton />}>
            <QuizSettingsContent quizId={id} />
          </Suspense>
        </TabsContent>
        <TabsContent value="results" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Risultati</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<QuizResultsSkeleton />}>
                <QuizResultsContent quizId={id} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuizResultsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="space-y-3">
          <div className="flex gap-4 pb-2 border-b">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-20 h-4" />
            <Skeleton className="w-28 h-4" />
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-28 h-4" />
            <Skeleton className="w-16 h-4" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 py-2 border-b">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-32 h-4" />
              <Skeleton className="rounded-full w-20 h-6" />
              <Skeleton className="w-28 h-4" />
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-28 h-4" />
              <Skeleton className="size-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
