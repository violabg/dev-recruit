import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "cn";
import PageHeader from "@/components/page-header";
import { CandidateForm } from "@/components/candidates/candidate-form";
import {
  Card,
  CardContent,
  } from "@/components/ui/card";
import { getOpenPositionsForSelect } from "@/lib/data/positions";
import { Suspense } from "react";
import { CandidateFormSkeleton } from "./fallbacks";

type NewCandidatePageProps = {
  searchParams: Promise<{ positionId?: string }>;
};

export default async function NewCandidatePage({
  searchParams,
}: NewCandidatePageProps) {
  return (
    <Suspense fallback={<CandidateFormSkeleton />}>
      <CandidateFormContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CandidateFormContent({ searchParams }: NewCandidatePageProps) {
  const params = await searchParams;
  const positionId = params.positionId;

  // A new candidate can apply only to open positions
  const positions = await getOpenPositionsForSelect();

  // Validate that the positionId exists if provided
  const validPositionId =
    positionId && positions.some((p) => p.id === positionId)
      ? positionId
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nuovo candidato"
        description="Inserisci i dati del candidato da aggiungere"
        actionBtns={
          <Link
            href={"/dashboard/candidates" as never}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex",
            )}
          >
            <ArrowLeft className="size-4" />
            Candidati
          </Link>
        }
      />
      <Card>
      <CardContent>
        <CandidateForm
          mode="new"
          positions={positions}
          defaultPositionId={validPositionId}
        />
      </CardContent>
      </Card>
    </div>
  );
}
