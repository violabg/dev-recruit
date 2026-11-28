import {
  GuideView,
  type GuideViewCriterion,
} from "@/components/interview-guides/guide-view";
import PageHeader from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import { deleteInterviewGuideAction } from "@/lib/actions/interview-guides";
import { getInterviewGuideById } from "@/lib/data/interview-guides";
import { getPositionById } from "@/lib/data/positions";
import { getScorecardByPositionId } from "@/lib/data/scorecards";
import { positionTrail } from "@/lib/utils/breadcrumbs";
import { cn } from "cn";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GuideViewSkeleton } from "../../fallbacks";

type GuidePageProps = {
  params: Promise<{ id: string; guideId: string }>;
};

/** Read-only interview guide; the editor is on /edit. */
export default function GuidePage({ params }: GuidePageProps) {
  return (
    <Suspense fallback={<GuideViewSkeleton />}>
      <GuideContent params={params} />
    </Suspense>
  );
}

async function GuideContent({ params }: GuidePageProps) {
  const { id, guideId } = await params;
  const guide = await getInterviewGuideById(guideId);

  // A guide is shown only under the route of its own position
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

  // Archived criteria are kept only where a question still uses them
  const usedIds = new Set(
    guide.sections.flatMap((section) =>
      section.questions.flatMap((question) => question.criterionIds),
    ),
  );
  const criteria: GuideViewCriterion[] = [
    ...(scorecard?.criteria ?? []).map((criterion) => ({
      id: criterion.id,
      name: criterion.name,
      priority: criterion.priority,
    })),
    ...(scorecard?.archivedCriteria ?? [])
      .filter((criterion) => usedIds.has(criterion.id))
      .map((criterion) => ({
        id: criterion.id,
        name: criterion.name,
        priority: criterion.priority,
        archived: true,
      })),
  ];

  return (
    <>
      <PageHeader
        title={guide.title}
        description={`${position.title} · Round ${guide.round} · ${guide.durationMinutes} min`}
        breadcrumbs={positionTrail(position, { label: guide.title })}
        actionBtns={
          <>
            <Link
              href={`/dashboard/positions/${id}/guides/${guide.id}/edit` as never}
              className={cn(buttonVariants({ size: "sm" }), "inline-flex")}
            >
              <Pencil className="mr-1 size-4" />
              Modifica traccia
            </Link>
            <DeleteWithConfirm
              deleteAction={deleteInterviewGuideAction.bind(null, guide.id)}
              description="Questa azione non può essere annullata. La traccia, le sue sezioni e le sue domande verranno eliminate."
              errorMessage="Errore durante l'eliminazione della traccia"
            />
          </>
        }
      />
      <GuideView guide={guide} criteria={criteria} />
    </>
  );
}
