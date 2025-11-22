import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import { cacheLife, cacheTag } from "next/cache";

// Prisma type for candidate with position and interviews
export type CandidateWithRelations = Prisma.CandidateGetPayload<{
  include: {
    position: {
      select: {
        id: true;
        title: true;
        experienceLevel: true;
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

export type CandidatePositionOption = { id: string; title: string };

// Reusable include pattern for candidate queries
const CANDIDATE_INCLUDE = {
  position: {
    select: {
      id: true,
      title: true,
      experienceLevel: true,
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
  search: string;
  status: string;
  positionId: string;
  sort: string;
};

const ORDER_BY_MAP: Record<string, Prisma.CandidateOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  name: { name: "asc" },
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
    where.positionId = positionId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
};

export async function getCandidateStats() {
  "use cache";
  cacheLife("hours");
  cacheTag("candidates");

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

export async function getCandidatePositions() {
  "use cache";
  cacheLife("hours");
  cacheTag("positions");

  return prisma.position.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}

export async function getFilteredCandidates({
  search,
  status,
  positionId,
  sort,
}: FetchCandidatesParams) {
  "use cache";
  cacheLife("hours");
  cacheTag("candidates");

  const candidates = await prisma.candidate.findMany({
    where: buildCandidateWhere({ search, status, positionId }),
    orderBy: ORDER_BY_MAP[sort] ?? ORDER_BY_MAP.newest,
    include: CANDIDATE_INCLUDE,
  });

  return candidates;
}

export const getCandidatesByPosition = async (positionId: string) => {
  "use cache";
  cacheLife("hours");
  cacheTag("candidates");

  return prisma.candidate.findMany({
    where: {
      positionId,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getCandidateWithDetails = async (
  id: string
): Promise<CandidateWithRelations | null> => {
  "use cache";
  cacheLife("hours");
  cacheTag("candidates");

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
