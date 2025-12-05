import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { CacheTags } from "@/lib/utils/cache-utils";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { Position } from "../prisma/client";

export type PaginatedPositions = {
  positions: Position[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export const getPositions = async (params?: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedPositions> => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.POSITIONS);

  const { search, page = 1, pageSize = DEFAULT_PAGE_SIZE } = params ?? {};
  const filter = search?.trim();
  // Avoid Math.max() which calls .valueOf() and fails with temporary client references
  const normalizedPage = typeof page === "number" && page > 0 ? page : 1;
  const normalizedPageSize =
    typeof pageSize === "number" && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;

  const where = filter
    ? {
        title: {
          contains: filter,
          mode: "insensitive" as const,
        },
      }
    : {};

  const [positions, totalCount] = await Promise.all([
    prisma.position.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (normalizedPage - 1) * normalizedPageSize,
      take: normalizedPageSize,
    }),
    prisma.position.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / normalizedPageSize));

  return {
    positions,
    totalCount,
    currentPage: normalizedPage,
    totalPages,
    hasNextPage: normalizedPage < totalPages,
    hasPrevPage: normalizedPage > 1,
  };
};

export const getPositionById = cache(
  async (positionId: string): Promise<Position | null> => {
    return prisma.position.findFirst({
      where: {
        id: positionId,
      },
    });
  }
);

export const getPositionsCount = async () => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.POSITIONS);

  return prisma.position.count();
};

/**
 * Returns all positions without pagination.
 * Use for dropdowns, static params, or other cases where you need the full list.
 */
export const getAllPositions = async (): Promise<Position[]> => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.POSITIONS);

  return prisma.position.findMany({
    orderBy: { createdAt: "desc" },
  });
};

export const getRecentPositions = async (limit = 5) => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.POSITIONS);

  return prisma.position.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    select: {
      id: true,
      title: true,
      experienceLevel: true,
    },
  });
};

/**
 * Returns positions with only id and title for select/dropdown components.
 * Sorted alphabetically by title.
 */
export const getPositionsForSelect = cache(async () => {
  return prisma.position.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
});

/**
 * Cached filter options for quiz list page
 */
export const getPositionLevelsForSelect = cache(async () => {
  try {
    const positions = await prisma.position.findMany({
      where: {},
      select: { experienceLevel: true },
    });

    const uniqueLevels = Array.from(
      new Set(
        positions
          .map((item) => item.experienceLevel)
          .filter((level): level is string => Boolean(level))
      )
    );

    return uniqueLevels;
  } catch (error) {
    console.error("Failed to fetch filter options:", error);
    return [];
  }
});
