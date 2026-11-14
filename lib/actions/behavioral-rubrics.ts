"use server";

import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { behavioralRubricSchema } from "@/lib/schemas";
import { invalidateBehavioralRubricCache } from "@/lib/utils/cache-utils";
import { runAction } from "./run-action";

export async function upsertBehavioralRubricAction(input: unknown) {
  return runAction("upsertBehavioralRubricAction", async () => {
    const user = await requireUser();
    const data = behavioralRubricSchema.parse(input);

    const rubric = await prisma.behavioralRubric.upsert({
      where: {
        candidateId_positionId: {
          candidateId: data.candidateId,
          positionId: data.positionId,
        },
      },
      create: {
        candidateId: data.candidateId,
        positionId: data.positionId,
        communicationScore: data.communicationScore,
        collaborationScore: data.collaborationScore,
        problemSolvingScore: data.problemSolvingScore,
        cultureFitScore: data.cultureFitScore,
        leadershipScore: data.leadershipScore ?? null,
        strengthExamples: data.strengthExamples ?? [],
        improvementAreas: data.improvementAreas ?? [],
        overallComments: data.overallComments,
        createdBy: user.id,
      },
      update: {
        communicationScore: data.communicationScore,
        collaborationScore: data.collaborationScore,
        problemSolvingScore: data.problemSolvingScore,
        cultureFitScore: data.cultureFitScore,
        leadershipScore: data.leadershipScore ?? null,
        strengthExamples: data.strengthExamples ?? [],
        improvementAreas: data.improvementAreas ?? [],
        overallComments: data.overallComments,
      },
    });

    invalidateBehavioralRubricCache({
      candidateId: data.candidateId,
      positionId: data.positionId,
    });

    return { rubricId: rubric.id };
  });
}
