import prisma from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

export const getCandidatesByPosition = async (positionId: string) => {
  "use cache";
  cacheLife({ stale: 1800, revalidate: 43200 });
  cacheTag("candidates");

  return prisma.candidate.findMany({
    where: {
      positionId,
    },
    orderBy: { createdAt: "desc" },
  });
};
