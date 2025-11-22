import prisma from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";
import { Position } from "../prisma/client";

export const getPositions = async (search?: string): Promise<Position[]> => {
  "use cache";
  cacheLife("hours");
  cacheTag("positions");
  const filter = search?.trim();

  return prisma.position.findMany({
    where: {
      ...(filter
        ? {
            title: {
              contains: filter,
              mode: "insensitive",
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getPositionById = async (
  positionId: string
): Promise<Position | null> => {
  "use cache";
  cacheLife("hours");
  cacheTag(`positions-${positionId}`);
  return prisma.position.findFirst({
    where: {
      id: positionId,
    },
  });
};

export const getPositionsCount = async () => {
  "use cache";
  cacheLife("hours");
  cacheTag("positions");

  return prisma.position.count();
};

export const getRecentPositions = async (limit = 5) => {
  "use cache";
  cacheLife("hours");
  cacheTag("positions");

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
