import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import {
  CandidatesRuntimeFallback,
  CandidatesRuntimeSection,
  type CandidatesSearchParams,
} from "./runtime-section";

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: CandidatesSearchParams;
}) {
  return (
    <div className="space-y-6">
      <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-4">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Candidati</h1>
          <p className="text-muted-foreground">
            Gestisci i candidati per le tue posizioni aperte
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/candidates/new">
            Nuovo Candidato
            <Plus className="mr-2 w-4 h-4" />
          </Link>
        </Button>
      </div>

      <Suspense fallback={<CandidatesRuntimeFallback />}>
        <CandidatesRuntimeSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
