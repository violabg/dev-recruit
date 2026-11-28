import { TabsContent } from "@/components/ui/tabs";
import {
  getAllPositions,
  getPositionById,
  getPositionSetupStatus,
} from "@/lib/data/positions";
import { resolvePositionTab } from "@/lib/utils/position-setup";
import { Suspense } from "react";
import { CriteriaAndQuestions } from "./components/criteria-and-questions";
import Selection from "./components/selection";
import {
  CriteriaAndQuestionsSkeleton,
  PositionDetailsSkeleton,
  PositionHeaderSkeleton,
  PositionSelectionSkeleton,
} from "./fallbacks";
import { PositionDetailsContent } from "./position-details-content";
import { PositionHeader } from "./position-header";
import { PositionTabs } from "./position-tabs";

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

      <Suspense fallback={<PositionDetailsSkeleton />}>
        <PositionTabsSection
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </div>
  );
}

/** The three tabs; the URL param `tab` chooses the one opened first. */
async function PositionTabsSection({
  params,
  searchParams,
}: {
  params: PositionParams;
  searchParams: PositionSearchParams;
}) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;

  const [position, setup] = await Promise.all([
    getPositionById(id),
    getPositionSetupStatus(id),
  ]);

  // The header already renders "Posizione non trovata": no tabs for a
  // position that does not exist
  if (!position) return null;

  const tab = resolvePositionTab(rawTab, setup?.complete ?? true);

  return (
    <PositionTabs tab={tab} incomplete={!!setup && !setup.complete}>
      <TabsContent value="candidati" className="flex flex-col gap-4 pt-4">
        <Suspense fallback={<PositionSelectionSkeleton />}>
          <Selection params={params} />
        </Suspense>
      </TabsContent>
      <TabsContent value="criteri" className="flex flex-col gap-4 pt-4">
        <Suspense fallback={<CriteriaAndQuestionsSkeleton />}>
          <CriteriaAndQuestions params={params} />
        </Suspense>
      </TabsContent>
      <TabsContent value="dettagli" className="flex flex-col gap-4 pt-4">
        <Suspense fallback={<PositionDetailsSkeleton />}>
          <PositionDetailsContent params={params} />
        </Suspense>
      </TabsContent>
    </PositionTabs>
  );
}
