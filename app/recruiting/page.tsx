import { ApplyFlow } from "@/components/recruiting/apply-flow";
import { PublicBody, PublicHeader } from "@/components/recruiting/public-header";
import { getOpenPositionsForApply } from "@/lib/data/positions";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ApplyFlowSkeleton } from "./fallbacks";

type PageProps = {
  searchParams: Promise<{ positionId?: string }>;
};

export default function ApplyPage({ searchParams }: PageProps) {
  return (
    <div className="bg-background min-h-dvh">
      <PublicHeader
        title="Lavora con noi"
        description="Scegli una o più posizioni, inserisci i tuoi dati e allega il CV. Ti rispondiamo via email."
      />
      <PublicBody>
        <Suspense fallback={<ApplyFlowSkeleton />}>
          <ApplyContent searchParams={searchParams} />
        </Suspense>
      </PublicBody>
    </div>
  );
}

async function ApplyContent({ searchParams }: PageProps) {
  // A link to one position has its own page
  const { positionId } = await searchParams;
  if (positionId) {
    redirect(`/recruiting/positions/${encodeURIComponent(positionId)}`);
  }

  const positions = await getOpenPositionsForApply();

  if (positions.length === 0) {
    return (
      <div className="bg-card mx-auto px-6 py-10 border rounded-xl max-w-3xl text-center">
        <p className="font-display font-bold text-heading text-lg">
          Al momento non ci sono posizioni aperte
        </p>
        <p className="mt-2 text-muted-foreground text-sm">
          Le nuove posizioni compaiono qui appena vengono aperte.
        </p>
      </div>
    );
  }

  return <ApplyFlow positions={positions} />;
}
