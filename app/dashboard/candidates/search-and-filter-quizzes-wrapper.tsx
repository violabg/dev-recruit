import { SearchAndFilterCandidates } from "@/components/candidates/search-and-filter-candidates";
import { getPositionsForSelect } from "@/lib/data/positions";
import { CacheTags } from "@/lib/utils/cache-utils";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Server component wrapper that fetches cached filter data
 * and passes it to the client SearchAndFilterQuizzes component.
 */
export const SearchAndFilterQuizzesWrapper = async () => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.POSITIONS);

  const positions = await getPositionsForSelect();

  return <SearchAndFilterCandidates positions={positions} />;
};
