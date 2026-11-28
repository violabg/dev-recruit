import prisma from "../prisma";
import type { Prisma } from "../prisma/client";
import type {
  CriterionCategory,
  CriterionPriority,
  ScorecardCriterionInput,
} from "../schemas";
import { UserError } from "./user-error";

/** The single text of the foreign-criterion refusal, used by every criteria save. */
export const FOREIGN_CRITERIA_MESSAGE =
  "Uno o più criteri non appartengono a questa posizione";

/**
 * Scorecard write rules and criteria reads for server code (actions, services,
 * route handlers). Not a "use server" module: expected failures throw
 * UserError and the calling action turns them into a result.
 */

export type ActiveCriterion = {
  id: string;
  name: string;
  description: string | null;
  category: CriterionCategory;
  priority: CriterionPriority;
  weight: number;
  expectedLevel: number;
};

/**
 * Active (not archived) criteria of a position, ordered by `order`.
 * Uncached: for actions, services and route handlers.
 */
export async function getActiveCriteria(
  positionId: string,
): Promise<ActiveCriterion[]> {
  const criteria = await prisma.scorecardCriterion.findMany({
    where: { scorecard: { positionId }, archivedAt: null },
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      priority: true,
      weight: true,
      expectedLevel: true,
    },
  });

  return criteria.map((criterion) => ({
    id: criterion.id,
    name: criterion.name,
    description: criterion.description,
    category: criterion.category,
    priority: criterion.priority,
    weight: criterion.weight,
    expectedLevel: criterion.expectedLevel,
  }));
}

/**
 * Throws UserError when an id is not an active criterion of the position.
 * An empty list always passes.
 */
export async function assertActiveCriteria(
  positionId: string,
  criterionIds: string[],
): Promise<void> {
  if (criterionIds.length === 0) return;

  const activeIds = new Set(
    (await getActiveCriteria(positionId)).map((criterion) => criterion.id),
  );

  if (criterionIds.some((id) => !activeIds.has(id))) {
    throw new UserError(FOREIGN_CRITERIA_MESSAGE);
  }
}

/**
 * Whether a criterion has evidence, so that removing it archives it instead of
 * deleting it. This is the SINGLE place that decides delete versus archive.
 *
 * Evidence is, checked in this order: a saved CV evaluation of the position
 * (an Evaluation with no assessment) whose criteriaAssessment has an entry for
 * the criterion; an interviewer criterion score of the criterion (submitted or
 * not); a kit item of an interview of the position citing the criterion; a kit
 * hypothesis of an interview of the position citing the criterion. Any
 * interview status counts.
 */
export async function criterionHasEvidence(
  tx: Prisma.TransactionClient,
  params: { criterionId: string; positionId: string },
): Promise<boolean> {
  const evaluations = await tx.evaluation.findMany({
    where: { positionId: params.positionId, assessmentId: null },
    select: { criteriaAssessment: true },
  });

  const inCvAssessment = evaluations.some(({ criteriaAssessment }) => {
    if (
      !criteriaAssessment ||
      typeof criteriaAssessment !== "object" ||
      Array.isArray(criteriaAssessment)
    ) {
      return false;
    }
    return Object.prototype.hasOwnProperty.call(
      criteriaAssessment,
      params.criterionId,
    );
  });
  if (inCvAssessment) return true;

  const scores = await tx.criterionScore.count({
    where: { criterionId: params.criterionId },
  });
  if (scores > 0) return true;

  const positionInterviews = {
    interview: { application: { positionId: params.positionId } },
  };

  const kitItems = await tx.kitItem.count({
    where: {
      criterionIds: { has: params.criterionId },
      kit: positionInterviews,
    },
  });
  if (kitItems > 0) return true;

  const kits = await tx.interviewKit.findMany({
    where: positionInterviews,
    select: { hypotheses: true },
  });

  // Invalid JSON shapes are ignored
  return kits.some(
    ({ hypotheses }) =>
      Array.isArray(hypotheses) &&
      hypotheses.some(
        (hypothesis) =>
          hypothesis !== null &&
          typeof hypothesis === "object" &&
          !Array.isArray(hypothesis) &&
          (hypothesis as { criterionId?: unknown }).criterionId ===
            params.criterionId,
      ),
  );
}

function toCriterionData(row: ScorecardCriterionInput, order: number) {
  return {
    name: row.name,
    description:
      row.description && row.description.trim() !== ""
        ? row.description
        : null,
    category: row.category,
    priority: row.priority,
    weight: row.weight,
    expectedLevel: row.expectedLevel,
    anchors: {
      weak: row.anchors.weak,
      medium: row.anchors.medium,
      strong: row.anchors.strong,
    },
    source: row.source,
    order,
  };
}

/**
 * Make `criteria` the complete, ordered list of ACTIVE criteria of the
 * position scorecard. Runs inside the caller's transaction.
 *
 * - The Scorecard row is created on the first save.
 * - A row whose id is a stored active criterion is updated; any other row is
 *   created. `order` is the index in the input.
 * - A stored active criterion missing from the input is archived when it has
 *   evidence (criterionHasEvidence); otherwise its id is removed from the guide
 *   questions of the position and the criterion is deleted.
 *
 * It NEVER writes QuizQuestion: syncQuizQuestions is the only writer of that
 * table. An id of a deleted criterion left on a quiz link is ignored by every
 * read and dropped at the next save of that quiz.
 * A weight change updates only the criterion row: Application.decisionWeights
 * is never touched, so decided applications keep the weights of their
 * decision. Archived criteria are never read or written here.
 */
export async function saveScorecard(
  tx: Prisma.TransactionClient,
  params: {
    positionId: string;
    criteria: ScorecardCriterionInput[];
    userId: string;
  },
): Promise<{
  scorecardId: string;
  created: number;
  updated: number;
  deleted: number;
  archived: number;
  guidesUnlinked: boolean;
}> {
  const { positionId, criteria, userId } = params;

  const scorecard = await tx.scorecard.upsert({
    where: { positionId },
    create: { positionId, createdBy: userId },
    update: {},
    select: { id: true },
  });

  const stored = await tx.scorecardCriterion.findMany({
    where: { scorecardId: scorecard.id, archivedAt: null },
    select: { id: true },
  });
  const storedIds = new Set(stored.map((criterion) => criterion.id));

  let created = 0;
  let updated = 0;
  const keptIds = new Set<string>();

  for (const [index, row] of criteria.entries()) {
    const data = toCriterionData(row, index);

    if (row.id && storedIds.has(row.id)) {
      await tx.scorecardCriterion.update({ where: { id: row.id }, data });
      keptIds.add(row.id);
      updated++;
    } else {
      await tx.scorecardCriterion.create({
        data: { ...data, scorecardId: scorecard.id },
      });
      created++;
    }
  }

  let deleted = 0;
  let archived = 0;
  let guidesUnlinked = false;

  for (const { id } of stored) {
    if (keptIds.has(id)) continue;

    if (await criterionHasEvidence(tx, { criterionId: id, positionId })) {
      await tx.scorecardCriterion.update({
        where: { id },
        data: { archivedAt: new Date() },
      });
      archived++;
      continue;
    }

    const linkedQuestions = await tx.guideQuestion.findMany({
      where: {
        criterionIds: { has: id },
        section: { guide: { positionId } },
      },
      select: { id: true, criterionIds: true },
    });

    for (const question of linkedQuestions) {
      await tx.guideQuestion.update({
        where: { id: question.id },
        data: {
          criterionIds: question.criterionIds.filter(
            (criterionId) => criterionId !== id,
          ),
        },
      });
    }
    if (linkedQuestions.length > 0) guidesUnlinked = true;

    await tx.scorecardCriterion.delete({ where: { id } });
    deleted++;
  }

  return {
    scorecardId: scorecard.id,
    created,
    updated,
    deleted,
    archived,
    guidesUnlinked,
  };
}
