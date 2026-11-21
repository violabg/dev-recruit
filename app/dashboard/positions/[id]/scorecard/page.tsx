import PageHeader from "@/components/page-header";
import { ScorecardEditor } from "@/components/scorecard/scorecard-editor";
import { buttonVariants } from "@/components/ui/button";
import { getAllPositions, getPositionById } from "@/lib/data/positions";
import { getScorecardByPositionId } from "@/lib/data/scorecards";
import { cn } from "cn";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
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
        title="Scheda di valutazione"
        description={position.title}
        actionBtns={
          <Link
            href={`/dashboard/positions/${id}?tab=scheda`}
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
      <ScorecardEditor
        positionId={id}
        criteria={scorecard?.criteria ?? []}
        archivedCriteria={scorecard?.archivedCriteria ?? []}
      />
    </>
  );
}
