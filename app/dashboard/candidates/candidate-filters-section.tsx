import { SearchAndFilterCandidates } from "@/components/candidates/search-and-filter-candidates";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchCandidatePositions } from "@/lib/data/candidates";

export const CandidateFiltersSection = async () => {
  const positions = await fetchCandidatePositions();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtri</CardTitle>
        <CardDescription>Filtra e cerca i candidati</CardDescription>
      </CardHeader>
      <CardContent>
        <SearchAndFilterCandidates positions={positions || []} />
      </CardContent>
    </Card>
  );
};
