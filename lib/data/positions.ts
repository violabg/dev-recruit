import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/services/logger";
import { CacheTags, entityTag } from "@/lib/utils/cache-utils";
import {
  getPositionSetup,
  type PositionSetup,
} from "@/lib/utils/position-setup";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { Position, Prisma } from "../prisma/client";
import type { PositionStatus } from "../schemas";

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
  status?: PositionStatus | "all";
  page?: number;
  pageSize?: number;
}): Promise<PaginatedPositions> => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.POSITIONS);

  const {
    search,
    status = "all",
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = params ?? {};
  const filter = search?.trim();
  // Avoid Math.max() which calls .valueOf() and fails with temporary client references
  const normalizedPage = typeof page === "number" && page > 0 ? page : 1;
  const normalizedPageSize =
    typeof pageSize === "number" && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;

  const where: Prisma.PositionWhereInput = {};

  if (filter) {
    where.title = {
      contains: filter,
      mode: "insensitive",
    };
  }

  if (status !== "all") {
    where.status = status;
  }

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
    "use cache";
    cacheLife("hours");
    cacheTag(CacheTags.POSITIONS, entityTag.position(positionId));
    return prisma.position.findFirst({
      where: {
        id: positionId,
      },
    });
  }
);

/**
 * Setup steps of a position (details, scorecard, quiz, guide) for the
 * checklist of the position page. Null when the position does not exist.
 */
export async function getPositionSetupStatus(
  positionId: string,
): Promise<PositionSetup | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(
    CacheTags.POSITIONS,
    CacheTags.SCORECARDS,
    CacheTags.QUIZZES,
    CacheTags.INTERVIEW_GUIDES,
    entityTag.position(positionId),
  );

  const position = await prisma.position.findUnique({
    where: { id: positionId },
    select: {
      id: true,
      _count: { select: { quizzes: true, interviewGuides: true } },
      scorecard: {
        select: {
          _count: { select: { criteria: { where: { archivedAt: null } } } },
        },
      },
    },
  });

  if (!position) return null;

  return getPositionSetup({
    activeCriteriaCount: position.scorecard?._count.criteria ?? 0,
    quizCount: position._count.quizzes,
    guideCount: position._count.interviewGuides,
  });
}

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

/**
 * Returns the open positions with only id and title, for the lists where a
 * candidate can apply (public form, candidate form).
 * Sorted alphabetically by title.
 */
export const getOpenPositionsForSelect = cache(async () => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.POSITIONS);

  return prisma.position.findMany({
    where: { status: "open" },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
});

/**
 * Returns positions formatted for Base UI Select items prop.
 * Format: { value: string, label: string }[]
 * Sorted alphabetically by title.
 */
export const getPositionItemsForSelect = cache(async () => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.POSITIONS);

  const positions = await prisma.position.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return positions.map((position) => ({
    value: position.id,
    label: position.title,
  }));
});

/**
 * Cached filter options for quiz list page
 */
export const getPositionLevelsForSelect = cache(async () => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.POSITIONS);
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
    logger.error("Failed to fetch filter options:", { error });
    return [];
  }
});
