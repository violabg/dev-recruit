import prisma from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

export const getCandidatesByPosition = async (positionId: string) => {
  "use cache";
  cacheLife("hours");
  cacheTag("candidates");

  return prisma.candidate.findMany({
    where: {
      positionId,
    },
    orderBy: { createdAt: "desc" },
  });
};
