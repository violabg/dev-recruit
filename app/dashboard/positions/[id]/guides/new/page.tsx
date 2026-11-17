import { InterviewGuideEditor } from "@/components/interview-guides/interview-guide-editor";
import PageHeader from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getInterviewGuidesByPosition } from "@/lib/data/interview-guides";
import { getAllPositions, getPositionById } from "@/lib/data/positions";
import { getScorecardByPositionId } from "@/lib/data/scorecards";
import { cn } from "cn";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
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
        section="positions"
        title="Nuova guida colloquio"
        description={position.title}
        actionBtns={
          <Link
            href={`/dashboard/positions/${id}?tab=guide`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex",
            )}
          >
            <ArrowLeft className="mr-1 size-4" />
            Torna alla posizione
          </Link>
        }
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
