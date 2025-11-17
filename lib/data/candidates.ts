import prisma from "@/lib/prisma";
import { cache } from "react";

export const getCandidatesByPosition = cache(
  async (userId: string, positionId: string) => {
    return prisma.candidate.findMany({
      where: {
        positionId,
        createdBy: userId,
      },
      orderBy: { createdAt: "desc" },
    });
  }
);
