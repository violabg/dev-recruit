import { CandidateGrid } from "@/components/candidates/candidate-grid";
import { CandidateTable } from "@/components/candidates/candidate-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import Link from "next/link";
import { fetchFilteredCandidates } from "./candidates-actions";

type CandidateListSectionProps = {
  search: string;
  status: string;
  positionId: string;
  sort: string;
  view: string;
};

export const CandidateListSection = async ({
  search,
  status,
  positionId,
  sort,
  view,
}: CandidateListSectionProps) => {
  const candidates = await fetchFilteredCandidates({
    search,
    status,
    positionId,
    sort,
  });

  const hasCandidates = candidates.length > 0;
  const activeView = view || "table";

  return (
    <Card>
      <CardContent>
        {!hasCandidates ? (
          <div className="flex flex-col justify-center items-center p-8 border border-dashed rounded-lg h-[200px] text-center">
            <div className="flex flex-col justify-center items-center mx-auto max-w-[420px] text-center">
              <h3 className="mt-4 font-semibold text-lg">
                Nessun candidato trovato
              </h3>
              <p className="mt-2 mb-4 text-muted-foreground text-sm">
                {search
                  ? `Nessun candidato trovato per "${search}". Prova a modificare i filtri.`
                  : "Non hai ancora aggiunto candidati. Aggiungi il tuo primo candidato per iniziare."}
              </p>
              <Button asChild>
                <Link href="/dashboard/candidates/new">
                  <Plus className="mr-2 w-4 h-4" />
                  Nuovo Candidato
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue={activeView} className="w-full">
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="table">Tabella</TabsTrigger>
                <TabsTrigger value="grid">Griglia</TabsTrigger>
              </TabsList>
              <div className="text-muted-foreground text-sm">
                {candidates.length} candidati trovati
              </div>
            </div>
            <TabsContent value="table" className="pt-4">
              <CandidateTable candidates={candidates} />
            </TabsContent>
            <TabsContent value="grid" className="pt-4">
              <CandidateGrid candidates={candidates} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
