"use server";
import { redirect } from "next/navigation";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import {
  baseSchemas,
  generateInterviewGuideSchema,
  saveInterviewGuideSchema,
  type GenerateInterviewGuideInput,
  type SaveInterviewGuideInput,
} from "../schemas";
import { generateInterviewGuide } from "../services/ai/guide-generation";
import { syncInterviewGuide } from "../services/interview-guides";
import {
  assertActiveCriteria,
  getActiveCriteria,
} from "../services/scorecards";
import { invalidateInterviewGuideCache } from "../utils/cache-utils";
import { runAction, UserError } from "./run-action";

/**
 * Create or update an interview guide with its sections and questions.
 * With `guideId` it updates that guide; without it, it creates one for
 * `positionId`. Always returns the guide id.
 */
export async function upsertInterviewGuideAction(
  input: SaveInterviewGuideInput,
) {
  return runAction("upsertInterviewGuideAction", async () => {
    const user = await requireUser();
    const {
      guideId,
      positionId: inputPositionId,
      ...data
    } = saveInterviewGuideSchema.parse(input);

    let positionId: string;
    const alreadyStored = new Set<string>();

    if (guideId) {
      const guide = await prisma.interviewGuide.findUnique({
        where: { id: guideId },
        select: {
          id: true,
          positionId: true,
          sections: {
            select: { questions: { select: { criterionIds: true } } },
          },
        },
      });
      if (!guide) throw new UserError("Traccia non trovata");

      positionId = guide.positionId;
      for (const section of guide.sections) {
        for (const question of section.questions) {
          for (const id of question.criterionIds) alreadyStored.add(id);
        }
      }
    } else {
      const position = await prisma.position.findUnique({
        where: { id: inputPositionId },
        select: { id: true },
      });
      if (!position) throw new UserError("Posizione non trovata");
      positionId = position.id;
    }

    // New links must point to active criteria of the position; a criterion
    // already linked on this guide stays even when archived
    const requested = new Set(
      data.sections.flatMap((section) =>
        section.questions.flatMap((question) => question.criterionIds),
      ),
    );
    await assertActiveCriteria(
      positionId,
      [...requested].filter((id) => !alreadyStored.has(id)),
    );

    const { id } = await prisma.$transaction((tx) =>
      syncInterviewGuide(tx, { guideId, positionId, data, userId: user.id }),
    );

    invalidateInterviewGuideCache({ guideId: id, positionId });

    return { id };
  });
}

/**
 * Delete an interview guide (sections and questions cascade), then go back
 * to the guides tab of the position.
 */
export async function deleteInterviewGuideAction(guideId: string) {
  return runAction("deleteInterviewGuideAction", async () => {
    await requireUser();
    const id = baseSchemas.id.parse(guideId);

    const guide = await prisma.interviewGuide.findUnique({
      where: { id },
      select: { positionId: true },
    });
    if (!guide) throw new UserError("Traccia non trovata");

    await prisma.interviewGuide.delete({ where: { id } });

    invalidateInterviewGuideCache({ guideId: id, positionId: guide.positionId });

    redirect(`/dashboard/positions/${guide.positionId}?tab=criteri`);
  });
}

/**
 * Ask the AI for the sections and questions of a guide, generated from the
 * scorecard of the position. Nothing is saved: the editor shows the result as
 * unsaved changes and upsertInterviewGuideAction stores it.
 */
export async function generateInterviewGuideAction(
  input: GenerateInterviewGuideInput,
) {
  return runAction("generateInterviewGuideAction", async () => {
    await requireUser();
    const {
      positionId,
      title,
      round,
      durationMinutes,
      instructions,
      specificModel,
    } = generateInterviewGuideSchema.parse(input);

    const position = await prisma.position.findUnique({
      where: { id: positionId },
      select: { title: true, experienceLevel: true, description: true },
    });
    if (!position) throw new UserError("Posizione non trovata");

    const criteria = await getActiveCriteria(positionId);
    if (criteria.length === 0) {
      throw new UserError(
        "Aggiungi prima i criteri della posizione",
      );
    }

    return generateInterviewGuide({
      positionTitle: position.title,
      experienceLevel: position.experienceLevel,
      description: position.description || undefined,
      title,
      round,
      durationMinutes,
      instructions: instructions || undefined,
      criteria,
      specificModel,
    });
  });
}
