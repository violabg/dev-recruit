import { InterviewGuideEditor } from "@/components/interview-guides/interview-guide-editor";
import PageHeader from "@/components/page-header";
import { getInterviewGuidesByPosition } from "@/lib/data/interview-guides";
import { getAllPositions, getPositionById } from "@/lib/data/positions";
import { getScorecardByPositionId } from "@/lib/data/scorecards";
import { positionTrail } from "@/lib/utils/breadcrumbs";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GuideEditorSkeleton } from "../../fallbacks";

type NewGuidePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  const positions = await getAllPositions();

  // Pre-render only the last 100 positions for faster builds
  return positions.slice(0, 100).map((position) => ({
    id: position.id,
  }));
}

export default function NewGuidePage({ params }: NewGuidePageProps) {
  return (
    <Suspense fallback={<GuideEditorSkeleton />}>
      <NewGuideContent params={params} />
    </Suspense>
  );
}

async function NewGuideContent({ params }: NewGuidePageProps) {
  const { id } = await params;
  const position = await getPositionById(id);

  if (!position) {
    notFound();
  }

  const [scorecard, guides] = await Promise.all([
    getScorecardByPositionId(id),
    getInterviewGuidesByPosition(id),
  ]);

  const criteria = (scorecard?.criteria ?? []).map((criterion) => ({
    id: criterion.id,
    name: criterion.name,
    category: criterion.category,
    priority: criterion.priority,
  }));

  return (
    <>
      <PageHeader
        title="Nuova traccia del colloquio"
        description={position.title}
        breadcrumbs={positionTrail(position, { label: "Nuova traccia" })}
      />
      <InterviewGuideEditor
        mode="create"
        positionId={id}
        guide={{
          title: "",
          round: guides.length + 1,
          durationMinutes: 60,
          sections: [],
        }}
        criteria={criteria}
      />
    </>
  );
}
