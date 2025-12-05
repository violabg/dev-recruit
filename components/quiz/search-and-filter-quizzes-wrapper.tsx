import {
  getPositionLevelsForSelect,
  getPositionsForSelect,
} from "@/lib/data/positions";
import { CacheTags } from "@/lib/utils/cache-utils";
import { cacheLife, cacheTag } from "next/cache";
import { SearchAndFilterQuizzes } from "./search-and-filter-quizzes";

/**
 * Server component wrapper that fetches cached filter data
 * and passes it to the client SearchAndFilterQuizzes component.
 */
export const SearchAndFilterQuizzesWrapper = async () => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.POSITIONS);

  const [levels, positions] = await Promise.all([
    getPositionLevelsForSelect(),
    getPositionsForSelect(),
  ]);

  return <SearchAndFilterQuizzes levels={levels} positions={positions} />;
};
