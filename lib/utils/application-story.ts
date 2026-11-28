import { DECISION_OUTCOME_LABEL } from "@/components/applications/decision/decision-presentation";
import { getAssessmentStatePresentation } from "@/components/assessments/assessment-status";
import {
  INTERVIEW_STATUS_PRESENTATION,
  KIT_STATUS_PRESENTATION,
} from "@/components/interviews/interview-presentation";
import type {
  ApplicationStage,
  AssessmentStatus,
  InterviewStatus,
  KitStatus,
} from "@/lib/schemas";
import { assessmentState } from "@/lib/utils/assessment-utils";
import type { NextAction } from "@/lib/utils/next-action";
import { format } from "date-fns";
import { it } from "date-fns/locale";

/**
 * Vertical story of an application: the single rule that turns the application
 * facts and its next action into ordered stops. Pure: no clock reads (the
 * caller passes `now`), no local state→label map (the labels come from the
 * presentation modules).
 */

export type StoryStopKind = "cv" | "test" | "interview" | "decision";
export type StoryStopState = "done" | "current" | "future";

export type StoryStop = {
  key: string;
  kind: StoryStopKind;
  title: string;
  state: StoryStopState;
  outcomeText?: string;
  unlockText?: string;
  assessmentId?: string;
  interviewId?: string;
  pending?: boolean;
};

export type StoryFacts = {
  stage: ApplicationStage;
  hasResume: boolean;
  resumeEvaluation: { fitScore: number | null } | null;
  assessments: {
    id: string;
    status: AssessmentStatus;
    quizTitle: string;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    timeLimit: number | null;
    quizScore: number | null;
  }[];
  interviews: {
    id: string;
    round: number;
    status: InterviewStatus;
    scheduledAt: Date;
    kitStatus: KitStatus | null;
    submittedCount: number;
    participantCount: number;
  }[];
  decision: { outcome: string; decidedAt: Date } | null;
};

const DAY = "d MMM";
const DAY_TIME = "d MMM HH:mm";
const dateLabel = (date: Date, pattern: string = DAY) =>
  format(date, pattern, { locale: it });

const CV_UNLOCK = "Si apre quando c'è il CV";
const DECISION_UNLOCK = "Si apre quando tutti i feedback dei colloqui sono inviati";

function cvOutcome(facts: StoryFacts): string {
  const fitScore = facts.resumeEvaluation?.fitScore;
  return fitScore != null ? `Valutato · ${fitScore}/10` : "Valutato";
}

function assessmentOutcome(
  assessment: StoryFacts["assessments"][number],
  now: Date,
): string {
  const state = assessmentState(
    {
      status: assessment.status,
      startedAt: assessment.startedAt,
      timeLimit: assessment.timeLimit,
    },
    now,
  );
  const label = getAssessmentStatePresentation(state).label;
  let outcome = `${assessment.quizTitle} · ${label}`;

  if (state === "pending") {
    outcome += ` · ${dateLabel(assessment.createdAt)}`;
  }
  if (assessment.quizScore != null) {
    outcome += ` · ${assessment.quizScore}/100`;
  } else if (state === "completed") {
    outcome += " · da valutare";
  }

  return outcome;
}

function interviewOutcome(
  interview: StoryFacts["interviews"][number],
): string {
  let outcome = `${INTERVIEW_STATUS_PRESENTATION[interview.status].label} · ${dateLabel(interview.scheduledAt, DAY_TIME)}`;

  if (interview.status === "scheduled" && interview.kitStatus === "ready") {
    outcome += ` · ${KIT_STATUS_PRESENTATION.ready.label}`;
  }
  if (interview.status === "completed") {
    outcome += ` · feedback ${interview.submittedCount}/${interview.participantCount}`;
  }

  return outcome;
}

function decisionOutcome(facts: StoryFacts): string {
  const decision = facts.decision;
  if (!decision) return "";
  const label =
    DECISION_OUTCOME_LABEL[
      decision.outcome as keyof typeof DECISION_OUTCOME_LABEL
    ] ?? decision.outcome;
  return `${label} · ${dateLabel(decision.decidedAt)}`;
}

function advanceStageStop(
  facts: StoryFacts,
  stops: StoryStop[],
): string {
  const testKeys = stops
    .filter((stop) => stop.kind === "test")
    .map((stop) => stop.key);
  const interviewKeys = stops
    .filter((stop) => stop.kind === "interview")
    .map((stop) => stop.key);

  switch (facts.stage) {
    case "applied":
    case "screening":
      return "cv";
    case "assessment":
      return testKeys[testKeys.length - 1] ?? "cv";
    case "interview":
      return (
        interviewKeys[interviewKeys.length - 1] ??
        testKeys[testKeys.length - 1] ??
        "cv"
      );
    default:
      return "decision";
  }
}

function currentStopKey(
  facts: StoryFacts,
  action: NextAction,
  stops: StoryStop[],
): string {
  switch (action.kind) {
    case "evaluate_cv":
      return "cv";
    case "send_assessment":
      return "test-new";
    case "generate_evaluation":
      return `test-${action.assessmentId}`;
    case "schedule_interview":
      return "interview-new";
    case "prepare_interview":
    case "fill_feedback":
      return `interview-${action.interviewId}`;
    case "go_to_decision":
    case "closed":
      return "decision";
    case "advance_stage":
      return advanceStageStop(facts, stops);
  }
}

/**
 * The ordered stops of an application: CV, its tests (oldest first), a pending
 * test when the next action sends one, its interviews (by round), a pending
 * interview when the next action schedules one, then Decisione. Exactly one
 * stop is current.
 */
export function buildApplicationStory(
  facts: StoryFacts,
  action: NextAction,
  now: Date,
): StoryStop[] {
  const assessments = [...facts.assessments].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const interviews = [...facts.interviews].sort((a, b) => a.round - b.round);

  const stops: StoryStop[] = [
    {
      key: "cv",
      kind: "cv",
      title: "CV",
      state: facts.resumeEvaluation != null ? "done" : "future",
      outcomeText:
        facts.resumeEvaluation != null ? cvOutcome(facts) : undefined,
      unlockText: facts.resumeEvaluation != null ? undefined : CV_UNLOCK,
    },
    ...assessments.map(
      (assessment): StoryStop => ({
        key: `test-${assessment.id}`,
        kind: "test",
        title: "Test",
        state: "done",
        outcomeText: assessmentOutcome(assessment, now),
        assessmentId: assessment.id,
      }),
    ),
    ...interviews.map(
      (interview): StoryStop => ({
        key: `interview-${interview.id}`,
        kind: "interview",
        title: `Colloquio ${interview.round}`,
        state: "done",
        outcomeText: interviewOutcome(interview),
        interviewId: interview.id,
      }),
    ),
    {
      key: "decision",
      kind: "decision",
      title: "Decisione",
      state: facts.decision ? "done" : "future",
      outcomeText: facts.decision ? decisionOutcome(facts) : undefined,
      unlockText: facts.decision ? undefined : DECISION_UNLOCK,
    },
  ];

  if (action.kind === "send_assessment") {
    stops.splice(1 + assessments.length, 0, {
      key: "test-new",
      kind: "test",
      title: "Test",
      state: "future",
      pending: true,
    });
  }

  if (action.kind === "schedule_interview") {
    const maxRound = interviews.reduce(
      (max, interview) => Math.max(max, interview.round),
      0,
    );
    stops.splice(1 + assessments.length + interviews.length, 0, {
      key: "interview-new",
      kind: "interview",
      title: `Colloquio ${maxRound + 1}`,
      state: "future",
      pending: true,
    });
  }

  const currentKey = currentStopKey(facts, action, stops);

  return stops.map((stop) => {
    if (stop.key === currentKey) {
      return { ...stop, state: "current" };
    }
    return stop;
  });
}

/**
 * Stop keys a legacy application `?tab=` value opens: `cv` the CV, `test` the
 * latest Test, `colloqui` every Colloquio, `decisione` the Decisione. Any
 * other value opens nothing (the current stop is always open).
 */
export function resolveOpenStops(
  rawTab: string | undefined,
  stops: StoryStop[],
): string[] {
  switch (rawTab) {
    case "cv":
      return ["cv"];
    case "test": {
      const testKeys = stops
        .filter((stop) => stop.kind === "test")
        .map((stop) => stop.key);
      return testKeys.length > 0 ? [testKeys[testKeys.length - 1]] : [];
    }
    case "colloqui":
      return stops
        .filter((stop) => stop.kind === "interview")
        .map((stop) => stop.key);
    case "decisione":
      return ["decision"];
    default:
      return [];
  }
}
