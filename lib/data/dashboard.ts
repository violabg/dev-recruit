import { getCandidatesCount } from "./candidates";
import { getCompletedInterviewsCount } from "./interviews";
import { getPositionsCount, getRecentPositions } from "./positions";

/**
 * Dashboard data layer
 * Re-exports count and aggregation functions from entity-specific data layers
 * for convenience in dashboard pages
 */

export {
  getCandidatesCount,
  getCompletedInterviewsCount,
  getPositionsCount,
  getRecentPositions,
};
