import prisma from "@/lib/prisma";
import { CacheTags, entityTag } from "@/lib/utils/cache-utils";
import { cacheLife, cacheTag } from "next/cache";

export async function getBehavioralRubricByCandidatePosition(
  candidateId: string,
  positionId: string,
) {
  "use cache";
  cacheLife("hours");
  cacheTag(
    CacheTags.BEHAVIORAL_RUBRICS,
    entityTag.behavioralRubric(candidateId, positionId),
  );

  return prisma.behavioralRubric.findUnique({
    where: {
      candidateId_positionId: {
        candidateId,
        positionId,
      },
    },
  });
}
