import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/services/logger";
import { CacheTags, entityTag } from "@/lib/utils/cache-utils";
import {
  getPositionSetup,
  type PositionSetup,
} from "@/lib/utils/position-setup";
import {
  computePositionCoverage,
  type PositionCoverage,
} from "@/lib/utils/position-coverage";
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

export type PositionCoverageView = PositionCoverage & {
  guides: { id: string; round: number }[];
};

/**
 * Coverage of the position's active criteria by the questions of its tests and
 * traces, plus its traces (lowest round first) for the fix link. Null when the
 * position does not exist. No session read.
 */
export async function getPositionCoverage(
  positionId: string,
): Promise<PositionCoverageView | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(
    CacheTags.POSITIONS,
    CacheTags.SCORECARDS,
    CacheTags.QUIZZES,
    CacheTags.QUESTIONS,
    CacheTags.INTERVIEW_GUIDES,
    entityTag.position(positionId),
  );

  const position = await prisma.position.findUnique({
    where: { id: positionId },
    select: {
      scorecard: {
        select: {
          criteria: {
            where: { archivedAt: null },
            orderBy: { order: "asc" },
            select: { id: true, name: true, priority: true, order: true },
          },
        },
      },
      quizzes: {
        select: {
          quizQuestions: { select: { criterionIds: true } },
        },
      },
      interviewGuides: {
        orderBy: [{ round: "asc" }, { id: "asc" }],
        select: {
          id: true,
          round: true,
          sections: {
            select: {
              questions: { select: { criterionIds: true } },
            },
          },
        },
      },
    },
  });

  if (!position) return null;

  const quizLinks = position.quizzes.flatMap(
    (quiz) => quiz.quizQuestions,
  );
  const guideQuestions = position.interviewGuides.flatMap((guide) =>
    guide.sections.flatMap((section) => section.questions),
  );
  const guides = position.interviewGuides.map(({ id, round }) => ({
    id,
    round,
  }));

  return {
    ...computePositionCoverage(
      position.scorecard?.criteria ?? [],
      quizLinks,
      guideQuestions,
    ),
    guides,
  };
}

/**
 * Returns all positions without pagination.
 * Use for dropdowns, static params, or other cases where you need the full list.
 */export const getAllPositions = async (): Promise<Position[]> => {
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

/** The fields of a position a visitor sees on the public apply pages. */
const publicPositionSelect = {
  id: true,
  title: true,
  description: true,
  experienceLevel: true,
  contractType: true,
  skills: true,
  softSkills: true,
} satisfies Prisma.PositionSelect;

export type PublicPosition = Prisma.PositionGetPayload<{
  select: typeof publicPositionSelect;
}>;

/**
 * Open positions with their public details, for the apply page
 * (/recruiting). Sorted alphabetically by title.
 */
export const getOpenPositionsForApply = cache(
  async (): Promise<PublicPosition[]> => {
    "use cache";
    cacheLife("hours");
    cacheTag(CacheTags.POSITIONS);

    return prisma.position.findMany({
      where: { status: "open" },
      select: publicPositionSelect,
      orderBy: { title: "asc" },
    });
  },
);

/**
 * A position for its own apply page (/recruiting/positions/[id]): the public
 * details plus the status, which decides whether it still accepts
 * applications. Null when it does not exist.
 */
export const getPublicPositionById = cache(
  async (
    positionId: string,
  ): Promise<(PublicPosition & { status: PositionStatus }) | null> => {
    "use cache";
    cacheLife("hours");
    cacheTag(CacheTags.POSITIONS, entityTag.position(positionId));

    return prisma.position.findUnique({
      where: { id: positionId },
      select: { ...publicPositionSelect, status: true },
    });
  },
);

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
