import prisma from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

export const getPositionsCount = async () => {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 86400 });
  cacheTag("dashboard");

  return prisma.position.count();
};

export const getCandidatesCount = async () => {
  "use cache";
  cacheLife({ stale: 1800, revalidate: 43200 });
  cacheTag("dashboard");

  return prisma.candidate.count();
};

export const getCompletedInterviewsCount = async () => {
  "use cache";
  cacheLife({ stale: 1800, revalidate: 43200 });
  cacheTag("dashboard");

  return prisma.interview.count({
    where: {
      status: "completed",
    },
  });
};

export const getRecentPositions = async (limit = 5) => {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 86400 });
  cacheTag("dashboard");

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
