import prisma from "@/lib/prisma";
import { cache } from "react";

export const getPositionsCount = cache(async () => {
  return prisma.position.count();
});

export const getCandidatesCount = cache(async () => {
  return prisma.candidate.count();
});

export const getCompletedInterviewsCount = cache(async () => {
  return prisma.interview.count({
    where: {
      status: "completed",
    },
  });
});

export const getRecentPositions = cache(async (limit = 5) => {
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
});
