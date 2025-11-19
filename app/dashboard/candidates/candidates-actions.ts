import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import { cacheLife } from "next/cache";

type PrismaCandidateWithRelations = Prisma.CandidateGetPayload<{
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

export type CandidateWithRelations = {
  id: string;
  name: string;
  email: string;
  status: string;
  resumeUrl: string | null;
  positionId: string;
  createdAt: string;
  position: {
    id: string;
    title: string;
    experienceLevel: string | null;
  } | null;
  interviews: {
    id: string;
    status: string;
    score: number | null;
    createdAt: string | null;
  }[];
};

export type CandidateStatusSummary = {
  status: string;
  count: number;
};

export type CandidatePositionOption = { id: string; title: string };

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

const mapCandidate = (
  candidate: PrismaCandidateWithRelations
): CandidateWithRelations => ({
  id: candidate.id,
  name: candidate.name,
  email: candidate.email,
  status: candidate.status,
  resumeUrl: candidate.resumeUrl,
  positionId: candidate.positionId,
  createdAt: candidate.createdAt.toISOString(),
  position: candidate.position
    ? {
        id: candidate.position.id,
        title: candidate.position.title,
        experienceLevel: candidate.position.experienceLevel,
      }
    : null,
  interviews: candidate.interviews.map((interview) => ({
    id: interview.id,
    status: interview.status,
    score: interview.score,
    createdAt: interview.createdAt ? interview.createdAt.toISOString() : null,
  })),
});

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

export async function fetchCandidateStats() {
  "use cache";
  cacheLife("hours");

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

export async function fetchCandidatePositions() {
  "use cache";
  cacheLife("hours");

  return prisma.position.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}

export async function fetchFilteredCandidates({
  search,
  status,
  positionId,
  sort,
}: FetchCandidatesParams) {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });

  const candidates = await prisma.candidate.findMany({
    where: buildCandidateWhere({ search, status, positionId }),
    orderBy: ORDER_BY_MAP[sort] ?? ORDER_BY_MAP.newest,
    include: {
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
    },
  });

  return candidates.map(mapCandidate);
}
