import { InterviewGuideEditor } from "@/components/interview-guides/interview-guide-editor";
import PageHeader from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getInterviewGuideById } from "@/lib/data/interview-guides";
import { getPositionById } from "@/lib/data/positions";
import { getScorecardByPositionId } from "@/lib/data/scorecards";
import { positionTrail } from "@/lib/utils/breadcrumbs";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GuideEditorSkeleton } from "../../../fallbacks";

type GuidePageProps = {
  params: Promise<{ id: string; guideId: string }>;
};

/** Editor of an interview guide; the read-only view is the parent route. */
export default function EditGuidePage({ params }: GuidePageProps) {
  return (
    <Suspense fallback={<GuideEditorSkeleton />}>
      <GuideContent params={params} />
    </Suspense>
  );
}

async function GuideContent({ params }: GuidePageProps) {
  const { id, guideId } = await params;
  const guide = await getInterviewGuideById(guideId);

  // A guide is edited only from the route of its own position
  if (!guide || guide.positionId !== id) {
    notFound();
  }

  const [position, scorecard] = await Promise.all([
    getPositionById(id),
    getScorecardByPositionId(id),
  ]);

  if (!position) {
    notFound();
  }

  // Active criteria are selectable; archived ones are kept only where a
  // question of this guide still uses them
  const usedIds = new Set(
    guide.sections.flatMap((section) =>
      section.questions.flatMap((question) => question.criterionIds),
    ),
  );
  const criteria = [
    ...(scorecard?.criteria ?? []).map((criterion) => ({
      id: criterion.id,
      name: criterion.name,
      category: criterion.category,
      priority: criterion.priority,
    })),
    ...(scorecard?.archivedCriteria ?? [])
      .filter((criterion) => usedIds.has(criterion.id))
      .map((criterion) => ({
        id: criterion.id,
        name: criterion.name,
        category: criterion.category,
        priority: criterion.priority,
        archived: true,
      })),
  ];

  return (
    <>
      <PageHeader
        title="Modifica traccia"
        description={`${guide.title} · ${position.title}`}
        breadcrumbs={positionTrail(
          position,
          {
            label: guide.title,
            href: `/dashboard/positions/${id}/guides/${guide.id}`,
          },
          { label: "Modifica" },
        )}
      />
      <InterviewGuideEditor
        mode="edit"
        positionId={id}
        guide={{
          id: guide.id,
          title: guide.title,
          round: guide.round,
          durationMinutes: guide.durationMinutes,
          sections: guide.sections,
        }}
        criteria={criteria}
      />
    </>
  );
}
