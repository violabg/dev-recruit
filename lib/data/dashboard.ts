import prisma from "@/lib/prisma";

export const getPositionsCount = async () => {
  return prisma.position.count();
};

export const getCandidatesCount = async () => {
  return prisma.candidate.count();
};

export const getCompletedInterviewsCount = async () => {
  return prisma.interview.count({
    where: {
      status: "completed",
    },
  });
};

export const getRecentPositions = async (limit = 5) => {
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
