import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/prisma/client";
import {
  HIRE_RECOMMENDATION_VALUES,
  INTERVIEW_MISSING_SOURCE_VALUES,
  kitChecklistItemSchema,
  kitHypothesisSchema,
  type CriterionAnchors,
  type CriterionPriority,
  type GuideSectionKind,
  type HireRecommendation,
  type InterviewMissingSource,
  type InterviewParticipantRole,
  type InterviewStatus,
  type KitChecklistItem,
  type KitHypothesis,
  type KitItemOrigin,
  type KitStatus,
} from "@/lib/schemas";
import { CacheTags, entityTag } from "@/lib/utils/cache-utils";
import type { OwnNote } from "@/lib/utils/interview-feedback";
import { cacheLife, cacheTag } from "next/cache";

// ====================
// TYPES
// ====================

export type InterviewListItem = {
  id: string;
  applicationId: string;
  round: number;
  status: InterviewStatus;
  scheduledAt: Date;
  durationMinutes: number;
  meetingUrl: string | null;
  sequence: number;
  kitStatus: KitStatus | null;
  guideTitle: string | null;
  participants: {
    userId: string;
    name: string;
    role: InterviewParticipantRole;
  }[];
  submittedFeedback: {
    id: string;
    interviewerId: string;
    interviewerName: string;
    hireRecommendation: HireRecommendation | null;
    submittedAt: Date;
  }[];
};

export type InterviewPreparation = InterviewListItem & {
  candidate: { id: string; firstName: string; lastName: string };
  position: { id: string; title: string };
  kit: {
    id: string;
    status: KitStatus;
    briefing: string[];
    hypotheses: KitHypothesis[];
    checklist: KitChecklistItem[];
    missingSources: InterviewMissingSource[];
    sections: {
      id: string;
      title: string;
      minutes: number;
      order: number;
      kind: GuideSectionKind;
    }[];
    items: {
      id: string;
      sectionId: string;
      text: string;
      followUps: string[];
      criterionIds: string[];
      anchors: CriterionAnchors;
      required: boolean;
      order: number;
      origin: KitItemOrigin;
      rationale: string | null;
      sourceRef: string | null;
      /** Round of the cited scorecard ("feedback:{id}"), otherwise null */
      sourceRound: number | null;
      edited: boolean;
      covered: boolean;
    }[];
  } | null;
  /** Whole scorecard of the position, active and archived */
  criteria: {
    id: string;
    name: string;
    priority: CriterionPriority;
    order: number;
    archived: boolean;
  }[];
};

export type AgendaInterview = {
  id: string;
  applicationId: string;
  round: number;
  status: "scheduled" | "in_progress";
  scheduledAt: Date;
  durationMinutes: number;
  kitStatus: KitStatus | null;
  candidateName: string;
  positionTitle: string;
  ownerId: string | null;
  participants: {
    userId: string;
    name: string;
    role: InterviewParticipantRole;
  }[];
};

export type InterviewLiveSession = InterviewPreparation & {
  viewerParticipantId: string | null;
  viewerRole: InterviewParticipantRole | null;
  ownNotes: {
    kitItemId: string;
    note: string | null;
    score: number | null;
    evidenceQuote: string | null;
    updatedAt: Date;
  }[];
  viewerSubmitted: boolean;
};

type FeedbackScore = {
  criterionId: string;
  score: number;
  evidence: string | null;
};

export type InterviewFeedbackPage = {
  interview: InterviewPreparation;
  viewerParticipant: { id: string; role: InterviewParticipantRole } | null;
  ownFeedback: {
    id: string;
    hireRecommendation: HireRecommendation | null;
    notes: string | null;
    redFlags: string[];
    standoutMoments: string[];
    submittedAt: Date | null;
    scores: FeedbackScore[];
  } | null;
  ownNotes: OwnNote[];
  /** Published with the submission: never a draft */
  othersSubmitted: {
    id: string;
    interviewerName: string;
    hireRecommendation: HireRecommendation | null;
    notes: string | null;
    redFlags: string[];
    standoutMoments: string[];
    submittedAt: Date;
    scores: FeedbackScore[];
    liveNotes: {
      kitItemId: string;
      itemText: string;
      note: string | null;
      score: number | null;
      evidenceQuote: string | null;
    }[];
  }[];
};

// ====================
// SELECTS AND MAPPERS
// ====================

// Never selects notes; feedback only once submitted
const interviewListSelect = {
  id: true,
  applicationId: true,
  round: true,
  status: true,
  scheduledAt: true,
  durationMinutes: true,
  meetingUrl: true,
  sequence: true,
  kit: { select: { status: true } },
  guide: { select: { title: true } },
  participants: {
    orderBy: { role: "asc" },
    select: {
      id: true,
      userId: true,
      role: true,
      user: { select: { id: true, name: true } },
    },
  },
  feedback: {
    where: { submittedAt: { not: null } },
    orderBy: { submittedAt: "asc" },
    select: {
      id: true,
      interviewerId: true,
      hireRecommendation: true,
      submittedAt: true,
      interviewer: { select: { name: true } },
    },
  },
} satisfies Prisma.InterviewSelect;

type InterviewListRow = Prisma.InterviewGetPayload<{
  select: typeof interviewListSelect;
}>;

function toHireRecommendation(value: string | null): HireRecommendation | null {
  return HIRE_RECOMMENDATION_VALUES.includes(value as HireRecommendation)
    ? (value as HireRecommendation)
    : null;
}

function toListItem(row: InterviewListRow): InterviewListItem {
  return {
    id: row.id,
    applicationId: row.applicationId,
    round: row.round,
    status: row.status,
    scheduledAt: row.scheduledAt,
    durationMinutes: row.durationMinutes,
    meetingUrl: row.meetingUrl,
    sequence: row.sequence,
    kitStatus: row.kit?.status ?? null,
    guideTitle: row.guide?.title ?? null,
    participants: row.participants.map((participant) => ({
      userId: participant.userId,
      name: participant.user.name,
      role: participant.role,
    })),
    submittedFeedback: row.feedback.flatMap((feedback) =>
      feedback.submittedAt
        ? [
            {
              id: feedback.id,
              interviewerId: feedback.interviewerId,
              interviewerName: feedback.interviewer.name,
              hireRecommendation: toHireRecommendation(
                feedback.hireRecommendation,
              ),
              submittedAt: feedback.submittedAt,
            },
          ]
        : [],
    ),
  };
}

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

/** Keeps the elements of a JSON array that pass the parser; anything else -> [] */
function parseJsonList<T>(
  value: Prisma.JsonValue | null,
  parse: (element: unknown) => T | null,
): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((element) => {
    const parsed = parse(element);
    return parsed === null ? [] : [parsed];
  });
}

const parseBriefing = (element: unknown) =>
  typeof element === "string" ? element : null;

const parseHypothesis = (element: unknown) => {
  const result = kitHypothesisSchema.safeParse(element);
  return result.success ? result.data : null;
};

const parseChecklistItem = (element: unknown) => {
  const result = kitChecklistItemSchema.safeParse(element);
  return result.success ? result.data : null;
};

const preparationSelect = {
  ...interviewListSelect,
  application: {
    select: {
      positionId: true,
      candidate: { select: { id: true, firstName: true, lastName: true } },
      position: { select: { id: true, title: true } },
    },
  },
  kit: {
    select: {
      id: true,
      status: true,
      briefing: true,
      hypotheses: true,
      checklist: true,
      missingSources: true,
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          minutes: true,
          order: true,
          kind: true,
        },
      },
      items: {
        orderBy: [{ section: { order: "asc" } }, { order: "asc" }],
        select: {
          id: true,
          sectionId: true,
          text: true,
          followUps: true,
          criterionIds: true,
          anchors: true,
          required: true,
          order: true,
          origin: true,
          rationale: true,
          sourceRef: true,
          edited: true,
          covered: true,
        },
      },
    },
  },
} satisfies Prisma.InterviewSelect;

/** One interview with its kit (never notes), uncached */
async function readInterviewPreparation(
  interviewId: string,
): Promise<InterviewPreparation | null> {
  const row = await prisma.interview.findUnique({
    where: { id: interviewId },
    select: preparationSelect,
  });

  if (!row) return null;

  const criteria = await prisma.scorecardCriterion.findMany({
    where: { scorecard: { positionId: row.application.positionId } },
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      priority: true,
      order: true,
      archivedAt: true,
    },
  });

  const { kit, application } = row;

  // Round of every scorecard cited by a question, in one query
  const FEEDBACK_PREFIX = "feedback:";
  const citedFeedbackIds = [
    ...new Set(
      (kit?.items ?? []).flatMap((item) =>
        item.sourceRef?.startsWith(FEEDBACK_PREFIX)
          ? [item.sourceRef.slice(FEEDBACK_PREFIX.length)]
          : [],
      ),
    ),
  ];
  const citedFeedback = citedFeedbackIds.length
    ? await prisma.interviewerFeedback.findMany({
        where: { id: { in: citedFeedbackIds } },
        select: { id: true, interview: { select: { round: true } } },
      })
    : [];
  const roundByFeedbackId = new Map(
    citedFeedback.map((feedback) => [feedback.id, feedback.interview.round]),
  );
  const sourceRoundOf = (sourceRef: string | null) =>
    sourceRef?.startsWith(FEEDBACK_PREFIX)
      ? (roundByFeedbackId.get(sourceRef.slice(FEEDBACK_PREFIX.length)) ?? null)
      : null;

  return {
    ...toListItem({ ...row, kit: kit ? { status: kit.status } : null }),
    candidate: application.candidate,
    position: application.position,
    kit: kit
      ? {
          id: kit.id,
          status: kit.status,
          briefing: parseJsonList(kit.briefing, parseBriefing),
          hypotheses: parseJsonList(kit.hypotheses, parseHypothesis),
          checklist: parseJsonList(kit.checklist, parseChecklistItem),
          missingSources: kit.missingSources.filter(
            (source): source is InterviewMissingSource =>
              INTERVIEW_MISSING_SOURCE_VALUES.includes(
                source as InterviewMissingSource,
              ),
          ),
          sections: kit.sections,
          items: kit.items.map((item) => ({
            ...item,
            anchors: toAnchors(item.anchors),
            sourceRound: sourceRoundOf(item.sourceRef),
          })),
        }
      : null,
    criteria: criteria.map((criterion) => ({
      id: criterion.id,
      name: criterion.name,
      priority: criterion.priority,
      order: criterion.order,
      archived: criterion.archivedAt !== null,
    })),
  };
}

// ====================
// CACHED READS
// ====================

/**
 * Interviews of one application, newest round first, with participants and
 * submitted scorecards only.
 */
export async function getInterviewsByApplication(
  applicationId: string,
): Promise<InterviewListItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(
    CacheTags.INTERVIEWS,
    CacheTags.CANDIDATES,
    CacheTags.POSITIONS,
    CacheTags.INTERVIEW_GUIDES,
  );

  const rows = await prisma.interview.findMany({
    where: { applicationId },
    orderBy: [{ round: "desc" }, { scheduledAt: "desc" }],
    select: interviewListSelect,
  });

  return rows.map(toListItem);
}

/** One interview for the preparation page (no notes); null when missing. */
export async function getInterviewForPreparation(
  interviewId: string,
): Promise<InterviewPreparation | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(
    CacheTags.INTERVIEWS,
    CacheTags.CANDIDATES,
    CacheTags.POSITIONS,
    CacheTags.SCORECARDS,
    CacheTags.INTERVIEW_GUIDES,
    entityTag.interview(interviewId),
  );

  return readInterviewPreparation(interviewId);
}

/**
 * Every interview scheduled or in progress of an open application, ordered
 * by date.
 */
export async function getAgendaInterviews(): Promise<AgendaInterview[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CacheTags.INTERVIEWS, CacheTags.CANDIDATES, CacheTags.POSITIONS);

  const rows = await prisma.interview.findMany({
    where: {
      status: { in: ["scheduled", "in_progress"] },
      application: { stage: { notIn: ["rejected", "withdrawn"] } },
    },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      applicationId: true,
      round: true,
      status: true,
      scheduledAt: true,
      durationMinutes: true,
      kit: { select: { status: true } },
      application: {
        select: {
          ownerId: true,
          candidate: { select: { firstName: true, lastName: true } },
          position: { select: { title: true } },
        },
      },
      participants: {
        orderBy: { role: "asc" },
        select: {
          userId: true,
          role: true,
          user: { select: { name: true } },
        },
      },
    },
  });

  return rows.flatMap((row) =>
    row.status === "scheduled" || row.status === "in_progress"
      ? [
          {
            id: row.id,
            applicationId: row.applicationId,
            round: row.round,
            status: row.status,
            scheduledAt: row.scheduledAt,
            durationMinutes: row.durationMinutes,
            kitStatus: row.kit?.status ?? null,
            candidateName:
              `${row.application.candidate.firstName} ${row.application.candidate.lastName}`.trim(),
            positionTitle: row.application.position.title,
            ownerId: row.application.ownerId,
            participants: row.participants.map((participant) => ({
              userId: participant.userId,
              name: participant.user.name,
              role: participant.role,
            })),
          },
        ]
      : [],
  );
}

// ====================
// UNCACHED READS (session-dependent)
// ====================

/** Live mode: current data, and the notes of userId only. */
export async function getInterviewLiveSession(
  interviewId: string,
  userId: string,
): Promise<InterviewLiveSession | null> {
  const interview = await readInterviewPreparation(interviewId);
  if (!interview) return null;

  const viewer = await prisma.interviewParticipant.findUnique({
    where: { interviewId_userId: { interviewId, userId } },
    select: { id: true, role: true },
  });

  const ownNotes = viewer
    ? await prisma.kitItemNote.findMany({
        where: { participantId: viewer.id },
        select: {
          kitItemId: true,
          note: true,
          score: true,
          evidenceQuote: true,
          updatedAt: true,
        },
      })
    : [];

  const ownFeedback = await prisma.interviewerFeedback.findUnique({
    where: { interviewId_interviewerId: { interviewId, interviewerId: userId } },
    select: { submittedAt: true },
  });

  return {
    ...interview,
    viewerParticipantId: viewer?.id ?? null,
    viewerRole: viewer?.role ?? null,
    ownNotes,
    viewerSubmitted: ownFeedback?.submittedAt != null,
  };
}

const feedbackSelect = {
  id: true,
  interviewerId: true,
  hireRecommendation: true,
  notes: true,
  redFlags: true,
  standoutMoments: true,
  submittedAt: true,
  interviewer: { select: { name: true } },
  scores: { select: { criterionId: true, score: true, evidence: true } },
} satisfies Prisma.InterviewerFeedbackSelect;

/**
 * Interviewer scorecard page: the own scorecard (draft or submitted) and the
 * own notes of userId, plus every other interviewer's SUBMITTED scorecard
 * with the live notes it published. Never another user's draft or notes
 * before their submission.
 */
export async function getInterviewFeedbackPage(
  interviewId: string,
  userId: string,
): Promise<InterviewFeedbackPage | null> {
  const interview = await readInterviewPreparation(interviewId);
  if (!interview) return null;

  const viewerParticipant = await prisma.interviewParticipant.findUnique({
    where: { interviewId_userId: { interviewId, userId } },
    select: { id: true, role: true },
  });

  const ownFeedbackRow = await prisma.interviewerFeedback.findUnique({
    where: { interviewId_interviewerId: { interviewId, interviewerId: userId } },
    select: feedbackSelect,
  });

  const ownNoteRows = viewerParticipant
    ? await prisma.kitItemNote.findMany({
        where: { participantId: viewerParticipant.id },
        select: {
          kitItemId: true,
          note: true,
          score: true,
          evidenceQuote: true,
          kitItem: { select: { criterionIds: true } },
        },
      })
    : [];

  const othersRows = await prisma.interviewerFeedback.findMany({
    where: {
      interviewId,
      interviewerId: { not: userId },
      submittedAt: { not: null },
    },
    orderBy: { submittedAt: "asc" },
    select: feedbackSelect,
  });

  // Live notes published with each submission: those of the submitting
  // interviewer's participant row on this interview
  const publishedNotes = othersRows.length
    ? await prisma.kitItemNote.findMany({
        where: {
          participant: {
            interviewId,
            userId: { in: othersRows.map((row) => row.interviewerId) },
          },
        },
        orderBy: [
          { kitItem: { section: { order: "asc" } } },
          { kitItem: { order: "asc" } },
        ],
        select: {
          kitItemId: true,
          note: true,
          score: true,
          evidenceQuote: true,
          participant: { select: { userId: true } },
          kitItem: { select: { text: true } },
        },
      })
    : [];

  return {
    interview,
    viewerParticipant,
    ownFeedback: ownFeedbackRow
      ? {
          id: ownFeedbackRow.id,
          hireRecommendation: toHireRecommendation(
            ownFeedbackRow.hireRecommendation,
          ),
          notes: ownFeedbackRow.notes,
          redFlags: ownFeedbackRow.redFlags,
          standoutMoments: ownFeedbackRow.standoutMoments,
          submittedAt: ownFeedbackRow.submittedAt,
          scores: ownFeedbackRow.scores,
        }
      : null,
    ownNotes: ownNoteRows.map((row) => ({
      kitItemId: row.kitItemId,
      criterionIds: row.kitItem.criterionIds,
      note: row.note,
      score: row.score,
      evidenceQuote: row.evidenceQuote,
    })),
    othersSubmitted: othersRows.flatMap((row) =>
      row.submittedAt
        ? [
            {
              id: row.id,
              interviewerName: row.interviewer.name,
              hireRecommendation: toHireRecommendation(row.hireRecommendation),
              notes: row.notes,
              redFlags: row.redFlags,
              standoutMoments: row.standoutMoments,
              submittedAt: row.submittedAt,
              scores: row.scores,
              liveNotes: publishedNotes
                .filter((note) => note.participant.userId === row.interviewerId)
                .map((note) => ({
                  kitItemId: note.kitItemId,
                  itemText: note.kitItem.text,
                  note: note.note,
                  score: note.score,
                  evidenceQuote: note.evidenceQuote,
                })),
            },
          ]
        : [],
    ),
  };
}
