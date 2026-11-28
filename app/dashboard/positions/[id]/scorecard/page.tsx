import PageHeader from "@/components/page-header";
import { ScorecardEditor } from "@/components/scorecard/scorecard-editor";
import { getAllPositions, getPositionById } from "@/lib/data/positions";
import { getScorecardByPositionId } from "@/lib/data/scorecards";
import { positionTrail } from "@/lib/utils/breadcrumbs";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ScorecardEditorSkeleton } from "../fallbacks";

type ScorecardPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  const positions = await getAllPositions();

  // Pre-render only the last 100 positions for faster builds
  return positions.slice(0, 100).map((position) => ({
    id: position.id,
  }));
}

export default function ScorecardPage({ params }: ScorecardPageProps) {
  return (
    <Suspense fallback={<ScorecardEditorSkeleton />}>
      <ScorecardContent params={params} />
    </Suspense>
  );
}

async function ScorecardContent({ params }: ScorecardPageProps) {
  const { id } = await params;
  const position = await getPositionById(id);

  if (!position) {
    notFound();
  }

  const scorecard = await getScorecardByPositionId(id);

  return (
    <>
      <PageHeader
        title="Criteri della posizione"
        description={position.title}
        breadcrumbs={positionTrail(position, { label: "Criteri" })}
      />
      <ScorecardEditor
        positionId={id}
        criteria={scorecard?.criteria ?? []}
        archivedCriteria={scorecard?.archivedCriteria ?? []}
      />
    </>
  );
}
