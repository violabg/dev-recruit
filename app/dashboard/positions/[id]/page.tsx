import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllPositions } from "@/lib/data/positions";
import { Suspense } from "react";
import Candidates from "./components/candidates";
import Quizzes from "./components/quizzes";

import {
  PositionCandidatesSkeleton,
  PositionDetailsSkeleton,
  PositionHeaderSkeleton,
  PositionQuizzesSkeleton,
} from "./fallbacks";
import { PositionDetailsContent } from "./position-details-content";
import { PositionHeader } from "./position-header";

export async function generateStaticParams() {
  const positions = await getAllPositions();

  // Pre-render only the last 100 positions for faster builds
  return positions.slice(0, 100).map((position) => ({
    id: position.id,
  }));
}

export default async function PositionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<PositionHeaderSkeleton />}>
        <PositionHeader params={params} />
      </Suspense>

      <Tabs defaultValue="details">
        <TabsList variant="line">
          <TabsTrigger value="details">Dettagli</TabsTrigger>
          <TabsTrigger value="quizzes">Quiz</TabsTrigger>
          <TabsTrigger value="candidates">Candidati</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="flex flex-col gap-4 pt-4">
          <Suspense fallback={<PositionDetailsSkeleton />}>
            <PositionDetailsContent params={params} />
          </Suspense>
        </TabsContent>
        <TabsContent value="quizzes" className="flex flex-col gap-4 pt-4">
          <Suspense fallback={<PositionQuizzesSkeleton />}>
            <Quizzes params={params} />
          </Suspense>
        </TabsContent>

        <TabsContent value="candidates" className="flex flex-col gap-4 pt-4">
          <Suspense fallback={<PositionCandidatesSkeleton />}>
            <Candidates params={params} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
