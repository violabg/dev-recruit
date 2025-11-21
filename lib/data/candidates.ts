import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import { cacheLife, cacheTag } from "next/cache";

type CandidateWithDetails = Prisma.CandidateGetPayload<{
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
      orderBy: {
        createdAt: "desc";
      };
    };
  };
}>;

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
): Promise<CandidateWithDetails | null> => {
  "use cache";
  cacheLife("hours");
  cacheTag("candidates");

  return prisma.candidate.findFirst({
    where: { id },
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
        orderBy: { createdAt: "desc" },
      },
    },
  });
};
