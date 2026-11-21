/**
 * Read models of the MCP tools, built from the cached data layer with the
 * same visibility as the dashboard: submitted scorecards only, never another
 * user's live notes or unsubmitted scorecard; overall score and decision
 * matrix closed to a participant who has not submitted their scorecard; CV
 * text only on request; interview preparation without candidate identity.
 * Scores are read-only.
 */

import {
  getApplicationDecision,
  getApplicationDetail,
} from "@/lib/data/applications";
import {
  getAgendaInterviews,
  getInterviewForPreparation,
  getInterviewsByApplication,
} from "@/lib/data/interviews";
import type {
  ApplicationStage,
  InterviewParticipantRole,
  InterviewStatus,
  KitStatus,
} from "@/lib/schemas";
import type { Actor } from "@/lib/services/actor";
import type { StoredKit } from "@/lib/services/interview-kit-patch";
import { computeDecisionScore } from "@/lib/utils/decision-score";
import { links } from "./links";
import { loadCandidateCvText, wrapUntrusted } from "./untrusted";

export interface McpInterviewRow {
  id: string;
  applicationId: string;
  candidateName: string;
  positionTitle: string;
  status: InterviewStatus;
  scheduledAt: Date;
  round: number;
  kitStatus: KitStatus | null;
  participants: { userId: string; name: string; role: InterviewParticipantRole }[];
  url: string;
}

export interface McpApplicationView {
  id: string;
  candidate: { id: string; name: string; doNotContact: boolean };
  position: { id: string; title: string };
  stage: ApplicationStage;
  stageChangedAt: Date;
  owner: { id: string; name: string } | null;
  evaluations: {
    kind: "resume" | "assessment";
    fitScore: number | null;
    quizScore: number | null;
    recommendation: string | null;
    createdAt: Date;
    aiModel: string | null;
  }[];
  decision: {
    outcome: string | null;
    decidedAt: Date | null;
    overallScore: number | null;
    hidden: boolean;
  };
  interviews: McpInterviewRow[];
  /** Whether the CV text was asked for (cvText null then means unreadable or absent) */
  cvRequested: boolean;
  cvText: string | null;
  url: string;
  decisionUrl: string;
}

export interface McpInterviewPrepView {
  id: string;
  applicationId: string;
  positionTitle: string;
  status: InterviewStatus;
  scheduledAt: Date;
  durationMinutes: number;
  round: number;
  kitStatus: KitStatus | null;
  participantRoles: InterviewParticipantRole[];
  guideTitle: string | null;
  briefing: string[];
  sections: {
    title: string;
    kind: string;
    items: {
      text: string;
      followUps: string[];
      criteria: string[];
      required: boolean;
    }[];
  }[];
  hypotheses: { criterion: string; hypothesis: string; howToVerify: string }[];
  checklist: { category: string; text: string; done: boolean }[];
  url: string;
}

const fullName = (person: { firstName: string; lastName: string }) =>
  `${person.firstName} ${person.lastName}`.trim();

/**
 * One application as the actor may see it, or null when it does not exist.
 */
export async function buildApplicationView(
  actor: Actor,
  applicationId: string,
  options: { includeCv: boolean },
): Promise<McpApplicationView | null> {
  const detail = await getApplicationDetail(applicationId);
  if (!detail) return null;

  const decision = await getApplicationDecision(applicationId);

  // Same rule as the Decision page: a participant who has not submitted
  // their scorecard does not see the score (outcome stays visible)
  const hidden =
    decision?.interviews.some(
      (interview) =>
        interview.participantIds.includes(actor.userId) &&
        !interview.submittedInterviewerIds.includes(actor.userId),
    ) ?? false;

  const overallScore =
    decision && !hidden
      ? computeDecisionScore({
          criteria: decision.criteria,
          sources: decision.sources,
          decisionWeights: decision.recorded.decidedAt
            ? decision.recorded.weights
            : null,
        }).overall
      : null;

  const evaluations: McpApplicationView["evaluations"] = [];
  if (detail.resumeEvaluation) {
    evaluations.push({
      kind: "resume",
      fitScore: detail.resumeEvaluation.fitScore,
      quizScore: null,
      recommendation: detail.resumeEvaluation.recommendation,
      createdAt: detail.resumeEvaluation.createdAt,
      aiModel: null,
    });
  }
  for (const assessment of detail.assessments) {
    if (!assessment.evaluation) continue;
    evaluations.push({
      kind: "assessment",
      fitScore: assessment.evaluation.fitScore,
      quizScore: assessment.evaluation.quizScore,
      recommendation: null,
      createdAt: assessment.evaluation.createdAt,
      aiModel: null,
    });
  }

  let cvText: string | null = null;
  if (options.includeCv) {
    const text = await loadCandidateCvText(detail.candidate.id);
    cvText = text ? wrapUntrusted("cv", text) : null;
  }

  return {
    id: detail.id,
    candidate: {
      id: detail.candidate.id,
      name: fullName(detail.candidate),
      doNotContact: detail.candidate.doNotContact,
    },
    position: { id: detail.position.id, title: detail.position.title },
    stage: detail.stage,
    stageChangedAt: detail.stageChangedAt,
    owner: detail.owner,
    evaluations,
    decision: {
      outcome: decision?.recorded.outcome ?? null,
      decidedAt: decision?.recorded.decidedAt ?? null,
      overallScore,
      hidden,
    },
    interviews: await buildInterviewRows(actor, {
      applicationId: detail.id,
      mineOnly: false,
    }),
    cvRequested: options.includeCv,
    cvText,
    url: links.application(detail.id),
    decisionUrl: links.applicationDecision(detail.id),
  };
}

/**
 * Interviews of one application (any status) or of the agenda (scheduled
 * and in progress), optionally only the actor's (participant or owner of the
 * application), within [from, to].
 */
export async function buildInterviewRows(
  actor: Actor,
  filter: { applicationId?: string; mineOnly: boolean; from?: Date; to?: Date },
): Promise<(McpInterviewRow & { ownerId: string | null })[]> {
  let rows: (McpInterviewRow & { ownerId: string | null })[];

  if (filter.applicationId) {
    const detail = await getApplicationDetail(filter.applicationId);
    if (!detail) return [];
    const interviews = await getInterviewsByApplication(filter.applicationId);
    rows = interviews.map((interview) => ({
      id: interview.id,
      applicationId: interview.applicationId,
      candidateName: fullName(detail.candidate),
      positionTitle: detail.position.title,
      status: interview.status,
      scheduledAt: interview.scheduledAt,
      round: interview.round,
      kitStatus: interview.kitStatus,
      participants: interview.participants,
      ownerId: detail.owner?.id ?? null,
      url: links.interviewPrepare(interview.applicationId, interview.id),
    }));
  } else {
    const agenda = await getAgendaInterviews();
    rows = agenda.map((interview) => ({
      id: interview.id,
      applicationId: interview.applicationId,
      candidateName: interview.candidateName,
      positionTitle: interview.positionTitle,
      status: interview.status,
      scheduledAt: interview.scheduledAt,
      round: interview.round,
      kitStatus: interview.kitStatus,
      participants: interview.participants,
      ownerId: interview.ownerId,
      url: links.interviewPrepare(interview.applicationId, interview.id),
    }));
  }

  return rows.filter((row) => {
    if (
      filter.mineOnly &&
      row.ownerId !== actor.userId &&
      !row.participants.some((participant) => participant.userId === actor.userId)
    ) {
      return false;
    }
    const at = new Date(row.scheduledAt).getTime();
    if (filter.from && at < filter.from.getTime()) return false;
    if (filter.to && at > filter.to.getTime()) return false;
    return true;
  });
}

/**
 * Interview preparation without candidate identity, CV text, interviewer
 * names or notes; null when the interview does not exist.
 */
export async function buildInterviewPrepView(
  _actor: Actor,
  interviewId: string,
): Promise<McpInterviewPrepView | null> {
  const interview = await getInterviewForPreparation(interviewId);
  if (!interview) return null;

  const criterionName = new Map(
    interview.criteria.map((criterion) => [criterion.id, criterion.name]),
  );
  const names = (ids: string[]) =>
    ids.flatMap((id) => {
      const name = criterionName.get(id);
      return name ? [name] : [];
    });

  const kit = interview.kit;
  const sections = kit
    ? [...kit.sections]
        .sort((a, b) => a.order - b.order)
        .map((section) => ({
          title: section.title,
          kind: section.kind,
          items: kit.items
            .filter((item) => item.sectionId === section.id)
            .sort((a, b) => a.order - b.order)
            .map((item) => ({
              text: item.text,
              followUps: item.followUps,
              criteria: names(item.criterionIds),
              required: item.required,
            })),
        }))
    : [];

  return {
    id: interview.id,
    applicationId: interview.applicationId,
    positionTitle: interview.position.title,
    status: interview.status,
    scheduledAt: interview.scheduledAt,
    durationMinutes: interview.durationMinutes,
    round: interview.round,
    kitStatus: interview.kitStatus,
    participantRoles: interview.participants.map((participant) => participant.role),
    guideTitle: interview.guideTitle,
    briefing: kit?.briefing ?? [],
    sections,
    hypotheses: (kit?.hypotheses ?? []).map((hypothesis) => ({
      criterion: criterionName.get(hypothesis.criterionId) ?? "",
      hypothesis: hypothesis.hypothesis,
      howToVerify: hypothesis.howToVerify,
    })),
    checklist: (kit?.checklist ?? []).map((row) => ({
      category: row.category,
      text: row.text,
      done: row.done,
    })),
    url: links.interviewPrepare(interview.applicationId, interview.id),
  };
}

export interface McpInterviewKitView {
  interviewId: string;
  applicationId: string;
  positionTitle: string;
  round: number;
  scheduledAt: Date;
  status: InterviewStatus;
  kitStatus: KitStatus;
  /** Interview scheduled and kit in draft: save_interview_kit_draft accepts it */
  editable: boolean;
  sections: {
    id: string;
    title: string;
    kind: string;
    minutes: number;
    items: {
      id: string;
      text: string;
      followUps: string[];
      criterionIds: string[];
      required: boolean;
      origin: string;
    }[];
  }[];
  /** Active criteria only: the ones a question or hypothesis may cite */
  criteria: { id: string; name: string; priority: string }[];
  briefing: string[];
  hypotheses: { criterionId: string; criterion: string; hypothesis: string; howToVerify: string }[];
  checklist: { id: string; category: string; text: string; done: boolean }[];
  url: string;
}

/**
 * The editable structure of an interview kit (ids of sections, questions,
 * criteria and checklist entries) for save_interview_kit_draft. Same rule as
 * the preparation view: no candidate identity, no CV, no notes. Null when
 * the interview or its kit does not exist. With `stored` (the kit read fresh
 * right after a save) its content replaces the cached one; titles, criteria
 * and status come from the cached read, which a kit save does not change.
 */
export async function buildInterviewKitView(
  _actor: Actor,
  interviewId: string,
  stored?: StoredKit,
): Promise<McpInterviewKitView | null> {
  const interview = await getInterviewForPreparation(interviewId);
  if (!interview?.kit) return null;
  const kit = stored
    ? {
        ...interview.kit,
        briefing: stored.briefing,
        hypotheses: stored.hypotheses,
        checklist: stored.checklist,
        items: stored.items,
      }
    : interview.kit;

  const criterionName = new Map(
    interview.criteria.map((criterion) => [criterion.id, criterion.name]),
  );

  return {
    interviewId: interview.id,
    applicationId: interview.applicationId,
    positionTitle: interview.position.title,
    round: interview.round,
    scheduledAt: interview.scheduledAt,
    status: interview.status,
    kitStatus: kit.status,
    editable: interview.status === "scheduled" && kit.status === "draft",
    sections: [...kit.sections]
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        id: section.id,
        title: section.title,
        kind: section.kind,
        minutes: section.minutes,
        items: kit.items
          .filter((item) => item.sectionId === section.id)
          .sort((a, b) => a.order - b.order)
          .map((item) => ({
            id: item.id,
            text: item.text,
            followUps: item.followUps,
            criterionIds: item.criterionIds,
            required: item.required,
            origin: item.origin,
          })),
      })),
    criteria: interview.criteria
      .filter((criterion) => !criterion.archived)
      .sort((a, b) => a.order - b.order)
      .map((criterion) => ({
        id: criterion.id,
        name: criterion.name,
        priority: criterion.priority,
      })),
    briefing: kit.briefing,
    hypotheses: kit.hypotheses.map((hypothesis) => ({
      criterionId: hypothesis.criterionId,
      criterion: criterionName.get(hypothesis.criterionId) ?? "",
      hypothesis: hypothesis.hypothesis,
      howToVerify: hypothesis.howToVerify,
    })),
    checklist: kit.checklist.map((row) => ({
      id: row.id,
      category: row.category,
      text: row.text,
      done: row.done,
    })),
    url: links.interviewPrepare(interview.applicationId, interview.id),
  };
}
