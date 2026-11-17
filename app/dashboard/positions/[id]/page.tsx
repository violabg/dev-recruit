import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllPositions, getPositionById } from "@/lib/data/positions";
import { POSITION_TABS, type PositionTab } from "@/lib/utils/position-setup";
import { Suspense } from "react";
import { Guides } from "./components/guides";
import Quizzes from "./components/quizzes";
import { ScorecardSummary } from "./components/scorecard-summary";
import Selection from "./components/selection";
import { SetupChecklist } from "./components/setup-checklist";

import {
  PositionDetailsSkeleton,
  PositionGuidesSkeleton,
  PositionHeaderSkeleton,
  PositionQuizzesSkeleton,
  PositionScorecardSkeleton,
  PositionSelectionSkeleton,
  SetupChecklistSkeleton,
} from "./fallbacks";
import { PositionDetailsContent } from "./position-details-content";
import { PositionHeader } from "./position-header";

type PositionParams = Promise<{ id: string }>;
type PositionSearchParams = Promise<{ tab?: string }>;

export async function generateStaticParams() {
  const positions = await getAllPositions();

  // Pre-render only the last 100 positions for faster builds
  return positions.slice(0, 100).map((position) => ({
    id: position.id,
  }));
}

export default async function PositionDetailPage({
  params,
  searchParams,
}: {
  params: PositionParams;
  searchParams: PositionSearchParams;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<PositionHeaderSkeleton />}>
        <PositionHeader params={params} />
      </Suspense>

      <Suspense fallback={<SetupChecklistSkeleton />}>
        <SetupChecklist params={params} />
      </Suspense>

      <Suspense fallback={<PositionDetailsSkeleton />}>
        <PositionTabs params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** The five tabs; the URL param `tab` chooses the one opened first. */
async function PositionTabs({
  params,
  searchParams,
}: {
  params: PositionParams;
  searchParams: PositionSearchParams;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: PositionTab = POSITION_TABS.includes(rawTab as PositionTab)
    ? (rawTab as PositionTab)
    : "dettagli";

  // The header already renders "Posizione non trovata": no tabs for a
  // position that does not exist
  const position = await getPositionById((await params).id);
  if (!position) return null;

  return (
    <Tabs key={tab} defaultValue={tab}>
      <TabsList variant="line">
        <TabsTrigger value="dettagli">Dettagli</TabsTrigger>
        <TabsTrigger value="scheda">Scheda di valutazione</TabsTrigger>
        <TabsTrigger value="selezione">Selezione</TabsTrigger>
        <TabsTrigger value="quiz">Quiz</TabsTrigger>
        <TabsTrigger value="guide">Guide colloquio</TabsTrigger>
      </TabsList>
      <TabsContent value="dettagli" className="flex flex-col gap-4 pt-4">
        <Suspense fallback={<PositionDetailsSkeleton />}>
          <PositionDetailsContent params={params} />
        </Suspense>
      </TabsContent>
      <TabsContent value="scheda" className="flex flex-col gap-4 pt-4">
        <Suspense fallback={<PositionScorecardSkeleton />}>
          <ScorecardSummary params={params} />
        </Suspense>
      </TabsContent>
      <TabsContent value="selezione" className="flex flex-col gap-4 pt-4">
        <Suspense fallback={<PositionSelectionSkeleton />}>
          <Selection params={params} />
        </Suspense>
      </TabsContent>
      <TabsContent value="quiz" className="flex flex-col gap-4 pt-4">
        <Suspense fallback={<PositionQuizzesSkeleton />}>
          <Quizzes params={params} />
        </Suspense>
      </TabsContent>
      <TabsContent value="guide" className="flex flex-col gap-4 pt-4">
        <Suspense fallback={<PositionGuidesSkeleton />}>
          <Guides params={params} />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
