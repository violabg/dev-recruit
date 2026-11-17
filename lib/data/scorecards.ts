import prisma from "@/lib/prisma";
import type {
  CriterionAnchors,
  CriterionCategory,
  CriterionPriority,
  CriterionSource,
} from "@/lib/schemas";
import { CacheTags, entityTag } from "@/lib/utils/cache-utils";
import { cacheLife, cacheTag } from "next/cache";

export type ScorecardCriterionView = {
  id: string;
  name: string;
  description: string | null;
  category: CriterionCategory;
  priority: CriterionPriority;
  weight: number;
  expectedLevel: number;
  anchors: CriterionAnchors;
  source: CriterionSource;
  order: number;
  archivedAt: Date | null;
};

export type ScorecardView = {
  id: string;
  positionId: string;
  criteria: ScorecardCriterionView[];
  archivedCriteria: ScorecardCriterionView[];
};

export type CriterionOption = {
  id: string;
  name: string;
  category: CriterionCategory;
  priority: CriterionPriority;
};

/** Anchors are stored as JSON: always return the full object. */
function toAnchors(value: unknown): CriterionAnchors {
  const anchors =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const text = (part: unknown) => (typeof part === "string" ? part : "");
  return {
    weak: text(anchors.weak),
    medium: text(anchors.medium),
    strong: text(anchors.strong),
  };
}

/**
 * The scorecard of a position, or null when it has none.
 * `criteria` are the active ones ordered by `order`; `archivedCriteria` the
 * archived ones, most recently archived first.
 */
export async function getScorecardByPositionId(
  positionId: string,
): Promise<ScorecardView | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(
    CacheTags.SCORECARDS,
    CacheTags.POSITIONS,
    entityTag.scorecard(positionId),
  );

  const scorecard = await prisma.scorecard.findUnique({
    where: { positionId },
    select: {
      id: true,
      positionId: true,
      criteria: { orderBy: { order: "asc" } },
    },
  });

  if (!scorecard) return null;

  const views: ScorecardCriterionView[] = scorecard.criteria.map(
    (criterion) => ({
      id: criterion.id,
      name: criterion.name,
      description: criterion.description,
      category: criterion.category,
      priority: criterion.priority,
      weight: criterion.weight,
      expectedLevel: criterion.expectedLevel,
      anchors: toAnchors(criterion.anchors),
      source: criterion.source,
      order: criterion.order,
      archivedAt: criterion.archivedAt,
    }),
  );

  return {
    id: scorecard.id,
    positionId: scorecard.positionId,
    criteria: views.filter((criterion) => criterion.archivedAt === null),
    archivedCriteria: views
      .filter((criterion) => criterion.archivedAt !== null)
      .sort(
        (a, b) =>
          (b.archivedAt?.getTime() ?? 0) - (a.archivedAt?.getTime() ?? 0),
      ),
  };
}

/**
 * Active criteria of every position that has them, ordered by `order` and
 * keyed by position id. Feeds the criteria selectors of the quiz and guide
 * editors, handed down from the server tree.
 */
export async function getCriterionOptionsByPosition(): Promise<
  Record<string, CriterionOption[]>
> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.SCORECARDS);

  const criteria = await prisma.scorecardCriterion.findMany({
    where: { archivedAt: null },
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      priority: true,
      scorecard: { select: { positionId: true } },
    },
  });

  const byPosition: Record<string, CriterionOption[]> = {};
  for (const criterion of criteria) {
    const positionId = criterion.scorecard.positionId;
    (byPosition[positionId] ??= []).push({
      id: criterion.id,
      name: criterion.name,
      category: criterion.category,
      priority: criterion.priority,
    });
  }
  return byPosition;
}
