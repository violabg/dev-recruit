import prisma from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

export const getPositions = async (search?: string) => {
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

export const getPositionById = async (positionId: string) => {
  "use cache";
  cacheLife("hours");
  cacheTag(`positions-${positionId}`);
  return prisma.position.findFirst({
    where: {
      id: positionId,
    },
  });
};
