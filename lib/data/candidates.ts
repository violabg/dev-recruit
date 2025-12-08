import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import { CacheTags, entityTag } from "@/lib/utils/cache-utils";
import { cacheLife, cacheTag } from "next/cache";

// Prisma type for candidate with position and interviews
export type CandidateWithRelations = Prisma.CandidateGetPayload<{
  include: {
    positions: {
      include: {
        position: {
          select: {
            id: true;
            title: true;
            experienceLevel: true;
          };
        };
      };
    };
    interviews: {
      select: {
        id: true;
        status: true;
        score: true;
        createdAt: true;
      };
    };
  };
}>;

export type CandidateStatusSummary = {
  status: string;
  count: number;
};

// Reusable include pattern for candidate queries
const CANDIDATE_INCLUDE = {
  positions: {
    include: {
      position: {
        select: {
          id: true,
          title: true,
          experienceLevel: true,
        },
      },
    },
    orderBy: {
      isPrimary: "desc" as const, // Primary position first
    },
  },
  interviews: {
    select: {
      id: true,
      status: true,
      score: true,
      createdAt: true,
    },
  },
} as const;

export type FetchCandidatesParams = {
  search?: string;
  status?: string;
  positionId?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

export type PaginatedCandidates = {
  candidates: CandidateWithRelations[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

const ORDER_BY_MAP: Record<string, Prisma.CandidateOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  name: { lastName: "asc" },
  status: { status: "asc" },
};

const buildCandidateWhere = ({
  search,
  status,
  positionId,
}: Pick<
  FetchCandidatesParams,
  "search" | "status" | "positionId"
>): Prisma.CandidateWhereInput => {
  const where: Prisma.CandidateWhereInput = {};

  if (status !== "all") {
    where.status = status;
  }

  if (positionId !== "all") {
    where.positions = {
      some: {
        positionId: positionId,
      },
    };
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
};

export async function getCandidateStats() {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.CANDIDATES);

  const [statusCountsRaw, totalCandidates] = await Promise.all([
    prisma.candidate.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.candidate.count(),
  ]);

  const statusCounts: CandidateStatusSummary[] = statusCountsRaw.map(
    (item) => ({
      status: item.status,
      count: item._count._all,
    })
  );

  return { statusCounts, totalCandidates };
}

export async function getFilteredCandidates(
  params?: FetchCandidatesParams
): Promise<PaginatedCandidates> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.CANDIDATES);

  const {
    search = "",
    status = "all",
    positionId = "all",
    sort = "newest",
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = params ?? {};

  // Ensure page and pageSize are valid positive numbers
  const normalizedPage = typeof page === "number" && page > 0 ? page : 1;
  const normalizedPageSize =
    typeof pageSize === "number" && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
  const where = buildCandidateWhere({ search, status, positionId });

  const [candidates, totalCount] = await Promise.all([
    prisma.candidate.findMany({
      where,
      orderBy: ORDER_BY_MAP[sort] ?? ORDER_BY_MAP.newest,
      include: CANDIDATE_INCLUDE,
      skip: (normalizedPage - 1) * normalizedPageSize,
      take: normalizedPageSize,
    }),
    prisma.candidate.count({ where }),
  ]);

  const totalPages =
    totalCount > 0 ? Math.ceil(totalCount / normalizedPageSize) : 1;

  return {
    candidates,
    totalCount,
    currentPage: normalizedPage,
    totalPages,
    hasNextPage: normalizedPage < totalPages,
    hasPrevPage: normalizedPage > 1,
  };
}

export const getCandidatesByPosition = async (positionId: string) => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.CANDIDATES, entityTag.position(positionId));

  return prisma.candidate.findMany({
    where: {
      positions: {
        some: {
          positionId,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getCandidateWithDetails = async (
  id: string
): Promise<CandidateWithRelations | null> => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.CANDIDATES);

  return prisma.candidate.findFirst({
    where: { id },
    include: {
      ...CANDIDATE_INCLUDE,
      interviews: {
        ...CANDIDATE_INCLUDE.interviews,
        orderBy: { createdAt: "desc" },
      },
    },
  });
};

export const getCandidatesCount = async () => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.CANDIDATES);

  return prisma.candidate.count();
};

/**
 * Returns last N candidates for generateStaticParams.
 * Used to pre-render most recent candidate detail pages at build time.
 */
export const getRecentCandidateIds = async (limit = 100): Promise<string[]> => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.CANDIDATES);

  const candidates = await prisma.candidate.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true },
  });

  return candidates.map((c) => c.id);
};
