"use server";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import {
  generateScorecardCriteriaSchema,
  saveScorecardSchema,
  type GenerateScorecardCriteriaInput,
  type SaveScorecardInput,
} from "../schemas";
import { generateScorecardCriteria } from "../services/ai/scorecard-generation";
import { getActiveCriteria, saveScorecard } from "../services/scorecards";
import {
  invalidateInterviewGuideCache,
  invalidateScorecardCache,
} from "../utils/cache-utils";
import { runAction, UserError } from "./run-action";

/**
 * Save the whole scorecard of a position: the criteria in the given order.
 * Criteria removed from the list are archived when they have evidence,
 * otherwise deleted (see saveScorecard).
 */
export async function saveScorecardAction(input: SaveScorecardInput) {
  return runAction("saveScorecardAction", async () => {
    const user = await requireUser();
    const { positionId, criteria } = saveScorecardSchema.parse(input);

    const position = await prisma.position.findUnique({
      where: { id: positionId },
      select: { id: true },
    });
    if (!position) throw new UserError("Posizione non trovata");

    const activeIds = new Set(
      (await getActiveCriteria(positionId)).map((criterion) => criterion.id),
    );
    if (criteria.some((row) => row.id && !activeIds.has(row.id))) {
      throw new UserError("Uno o più criteri non appartengono a questa scheda");
    }

    const result = await prisma.$transaction((tx) =>
      saveScorecard(tx, { positionId, criteria, userId: user.id }),
    );

    invalidateScorecardCache({ positionId });
    if (result.guidesUnlinked) {
      invalidateInterviewGuideCache({ positionId });
    }

    return {
      scorecardId: result.scorecardId,
      created: result.created,
      updated: result.updated,
      deleted: result.deleted,
      archived: result.archived,
    };
  });
}

/**
 * Ask the AI for scorecard criteria for a position. Nothing is saved: the
 * editor shows the proposal as unsaved rows and saveScorecardAction stores it.
 */
export async function generateScorecardCriteriaAction(
  input: GenerateScorecardCriteriaInput,
) {
  return runAction("generateScorecardCriteriaAction", async () => {
    await requireUser();
    const { positionId, specificModel } =
      generateScorecardCriteriaSchema.parse(input);

    const position = await prisma.position.findUnique({
      where: { id: positionId },
      select: {
        title: true,
        experienceLevel: true,
        skills: true,
        softSkills: true,
        description: true,
      },
    });
    if (!position) throw new UserError("Posizione non trovata");

    const existingNames = (await getActiveCriteria(positionId)).map(
      (criterion) => criterion.name.toLowerCase(),
    );

    return generateScorecardCriteria({
      positionTitle: position.title,
      experienceLevel: position.experienceLevel,
      skills: position.skills,
      softSkills: position.softSkills,
      description: position.description || undefined,
      existingNames,
      specificModel,
    });
  });
}
