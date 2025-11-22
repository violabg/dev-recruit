import { SearchAndFilterCandidates } from "@/components/candidates/search-and-filter-candidates";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCandidatePositions } from "@/lib/data/candidates";

export const CandidateFiltersSection = async () => {
  const positions = await getCandidatePositions();

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
