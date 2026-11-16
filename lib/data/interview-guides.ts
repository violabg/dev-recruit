import prisma from "@/lib/prisma";
import type { CriterionAnchors, GuideSectionKind } from "@/lib/schemas";
import { CacheTags, entityTag } from "@/lib/utils/cache-utils";
import { cacheLife, cacheTag } from "next/cache";

export type InterviewGuideListItem = {
  id: string;
  title: string;
  round: number;
  durationMinutes: number;
  sectionCount: number;
  questionCount: number;
  updatedAt: Date;
};

export type InterviewGuideDetail = {
  id: string;
  positionId: string;
  title: string;
  round: number;
  durationMinutes: number;
  sections: {
    id: string;
    title: string;
    minutes: number;
    kind: GuideSectionKind;
    questions: {
      id: string;
      text: string;
      followUps: string[];
      criterionIds: string[];
      anchors: CriterionAnchors;
      required: boolean;
    }[];
  }[];
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
 * Interview guides of a position, by round and then by creation date, with
 * the number of sections and questions.
 */
export async function getInterviewGuidesByPosition(
  positionId: string,
): Promise<InterviewGuideListItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(
    CacheTags.INTERVIEW_GUIDES,
    CacheTags.POSITIONS,
    entityTag.position(positionId),
  );

  const guides = await prisma.interviewGuide.findMany({
    where: { positionId },
    orderBy: [{ round: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      round: true,
      durationMinutes: true,
      updatedAt: true,
      sections: { select: { _count: { select: { questions: true } } } },
    },
  });

  return guides.map((guide) => ({
    id: guide.id,
    title: guide.title,
    round: guide.round,
    durationMinutes: guide.durationMinutes,
    sectionCount: guide.sections.length,
    questionCount: guide.sections.reduce(
      (total, section) => total + section._count.questions,
      0,
    ),
    updatedAt: guide.updatedAt,
  }));
}

/**
 * One interview guide with its sections and questions in their order, or
 * null when it does not exist.
 */
export async function getInterviewGuideById(
  guideId: string,
): Promise<InterviewGuideDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.INTERVIEW_GUIDES, entityTag.interviewGuide(guideId));

  const guide = await prisma.interviewGuide.findUnique({
    where: { id: guideId },
    select: {
      id: true,
      positionId: true,
      title: true,
      round: true,
      durationMinutes: true,
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          minutes: true,
          kind: true,
          questions: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              text: true,
              followUps: true,
              criterionIds: true,
              anchors: true,
              required: true,
            },
          },
        },
      },
    },
  });

  if (!guide) return null;

  return {
    id: guide.id,
    positionId: guide.positionId,
    title: guide.title,
    round: guide.round,
    durationMinutes: guide.durationMinutes,
    sections: guide.sections.map((section) => ({
      id: section.id,
      title: section.title,
      minutes: section.minutes,
      kind: section.kind,
      questions: section.questions.map((question) => ({
        id: question.id,
        text: question.text,
        followUps: question.followUps,
        criterionIds: question.criterionIds,
        anchors: toAnchors(question.anchors),
        required: question.required,
      })),
    })),
  };
}
