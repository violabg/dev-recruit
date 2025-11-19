import prisma from "@/lib/prisma";
import { cache } from "react";

export const getPositions = cache(async (search?: string) => {
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
});

export const getUserPositions = cache(
  async (userId: string, search?: string) => {
    const filter = search?.trim();

    return prisma.position.findMany({
      where: {
        createdBy: userId,
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
  }
);

export const getPositionById = cache(async (positionId: string) => {
  return prisma.position.findFirst({
    where: {
      id: positionId,
    },
  });
});
