import prisma from "@/lib/prisma";
import { cache } from "react";

export const getCandidatesByPosition = cache(async (positionId: string) => {
  return prisma.candidate.findMany({
    where: {
      positionId,
    },
    orderBy: { createdAt: "desc" },
  });
});
