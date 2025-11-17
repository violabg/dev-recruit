import { CandidateGrid } from "@/components/candidates/candidate-grid";
import { CandidateTable } from "@/components/candidates/candidate-table";
import { SearchAndFilterCandidates } from "@/components/candidates/search-and-filter-candidates";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import Link from "next/link";
import { fetchCandidatesData } from "./candidates-actions";

// Define the search params type
type SearchParams = {
  search?: string;
  status?: string;
  position?: string;
  sort?: string;
  view?: string;
};

// Main candidates page component
export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const search = params?.search || "";
  const status = params?.status || "all";
  const positionId = params?.position || "all";
  const sort = params?.sort || "newest";
  const view = params?.view || "table";

  const { user, candidates, positions, statusCounts, totalCandidates } =
    await fetchCandidatesData({
      search,
      status,
      positionId,
      sort,
    });

  if (!user) {
    return null;
  }

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
            <Plus className="mr-2 w-4 h-4" />
            Nuovo Candidato
          </Link>
        </Button>
      </div>

      {/* Stats cards */}
      <div className="gap-4 grid md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <CardTitle className="font-medium text-sm">
              Totale Candidati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{totalCandidates}</div>
          </CardContent>
        </Card>
        {statusCounts?.map((status) => (
          <Card key={status.status}>
            <CardHeader className="flex flex-row justify-between items-center pb-2">
              <CardTitle className="font-medium text-sm">
                {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{status.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtri</CardTitle>
          <CardDescription>Filtra e cerca i candidati</CardDescription>
        </CardHeader>
        <CardContent>
          <SearchAndFilterCandidates positions={positions || []} />
        </CardContent>
      </Card>

      {/* Candidates list */}
      <Card>
        <CardContent>
          {candidates?.length === 0 ? (
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
            <Tabs defaultValue={view} className="w-full">
              <div className="flex justify-between items-center">
                <TabsList>
                  <TabsTrigger value="table">Tabella</TabsTrigger>
                  <TabsTrigger value="grid">Griglia</TabsTrigger>
                </TabsList>
                <div className="text-muted-foreground text-sm">
                  {candidates?.length} candidati trovati
                </div>
              </div>
              <TabsContent value="table" className="pt-4">
                <CandidateTable candidates={candidates || []} />
              </TabsContent>
              <TabsContent value="grid" className="pt-4">
                <CandidateGrid candidates={candidates || []} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
