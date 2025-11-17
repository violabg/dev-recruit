import prisma from "@/lib/prisma";
import { cache } from "react";

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

export const getUserPositionById = cache(
  async (userId: string, positionId: string) => {
    return prisma.position.findFirst({
      where: {
        id: positionId,
        createdBy: userId,
      },
    });
  }
);
