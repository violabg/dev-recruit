import { SearchAndFilterCandidates } from "@/components/candidates/search-and-filter-candidates";
import { getCandidatePositions } from "@/lib/data/candidates";

export const CandidateFiltersSection = async () => {
  const positions = await getCandidatePositions();

  return <SearchAndFilterCandidates positions={positions || []} />;
};
