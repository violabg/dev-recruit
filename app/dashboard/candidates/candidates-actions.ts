import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";

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

type FetchCandidatesParams = {
  search: string;
  status: string;
  positionId: string;
  sort: string;
};

export async function fetchCandidatesData({
  search,
  status,
  positionId,
  sort,
}: FetchCandidatesParams) {
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

  const orderByMap: Record<string, Prisma.CandidateOrderByWithRelationInput> = {
    newest: { createdAt: "desc" },
    oldest: { createdAt: "asc" },
    name: { name: "asc" },
    status: { status: "asc" },
  };

  const orderBy = orderByMap[sort] ?? orderByMap.newest;

  const candidates = await prisma.candidate.findMany({
    where,
    orderBy,
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

  const mappedCandidates: CandidateWithRelations[] = candidates.map(
    (candidate: PrismaCandidateWithRelations) => ({
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
        createdAt: interview.createdAt
          ? interview.createdAt.toISOString()
          : null,
      })),
    })
  );

  const positions = await prisma.position.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const statusCountsRaw = await prisma.candidate.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const statusCounts: CandidateStatusSummary[] = statusCountsRaw.map(
    (item) => ({
      status: item.status,
      count: item._count._all,
    })
  );

  const totalCandidates = await prisma.candidate.count({});

  return {
    candidates: mappedCandidates,
    positions,
    statusCounts,
    totalCandidates,
  };
}
