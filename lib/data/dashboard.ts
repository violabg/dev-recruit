import prisma from "@/lib/prisma";
import { cache } from "react";

export const getPositionsCount = cache(async (userId: string) => {
  return prisma.position.count({
    where: {
      createdBy: userId,
    },
  });
});

export const getCandidatesCount = cache(async (userId: string) => {
  return prisma.candidate.count({
    where: {
      createdBy: userId,
    },
  });
});

export const getCompletedInterviewsCount = cache(async (userId: string) => {
  return prisma.interview.count({
    where: {
      status: "completed",
      candidate: {
        createdBy: userId,
      },
    },
  });
});

export const getRecentPositions = cache(async (userId: string, limit = 5) => {
  return prisma.position.findMany({
    where: {
      createdBy: userId,
    },
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
