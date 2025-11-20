import prisma from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

export type Position = {
  id: string;
  title: string;
  experienceLevel: string | null;
  skills: string[];
  createdAt: Date;
};

/**
 * Fetch all positions from database (uncached)
 */
export async function fetchAllPositions(): Promise<Position[]> {
  return prisma.position.findMany({
    orderBy: { createdAt: "desc" },
  });
}

/**
 * CachedPositionsContent - Server component that caches all positions data with Cache Components
 * - Uses "use cache" directive to cache full positions result set
 * - Tagged with "positions" for manual revalidation via updateTag()
 * - Revalidates every hour with cacheLife("hours")
 * - Search/filtering handled dynamically by client-side component
 * - Note: Caches full dataset, not filtered results (filtering happens client-side)
 */
export async function CachedPositionsContent(): Promise<Position[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("positions");

  return await fetchAllPositions();
}
