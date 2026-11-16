import type { ApplicationStage, AssessmentStatus } from "@/lib/schemas";
import { isOpenStage, nextStage, STAGE_LABELS } from "./application-stage";

/**
 * Next action of an application. Pure function, no clock: the rows are
 * evaluated in order and the first one that holds wins.
 */

export type ApplicationFacts = {
  stage: ApplicationStage;
  hasResume: boolean;
  hasResumeEvaluation: boolean;
  assessments: readonly {
    id: string;
    status: AssessmentStatus;
    hasEvaluation: boolean;
    createdAt: Date | string;
  }[];
  /** Filled from Phase 3 on; omitted in Phase 1 */
  interviews?: readonly {
    status: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show";
    kitReady: boolean;
    feedbackMissing: boolean;
  }[];
  /** Filled from Phase 3 on; omitted in Phase 1 */
  allFeedbackSubmitted?: boolean;
};

export type NextActionKind =
  | "evaluate_cv"
  | "send_assessment"
  | "generate_evaluation"
  | "schedule_interview"
  | "prepare_interview"
  | "fill_feedback"
  | "go_to_decision"
  | "advance_stage"
  | "closed";

export type NextAction = {
  kind: NextActionKind;
  /** Italian text of the card title */
  label: string;
  /** advance_stage only */
  targetStage?: ApplicationStage;
  /** generate_evaluation only */
  assessmentId?: string;
  /** closed only */
  canReopen?: boolean;
  missingResume: boolean;
};

const toTime = (value: Date | string) =>
  (typeof value === "string" ? new Date(value) : value).getTime();

export function getNextAction(facts: ApplicationFacts): NextAction {
  const { stage } = facts;
  const open = isOpenStage(stage);
  const missingResume = !facts.hasResume && open;

  // 1) The CV is there but has not been evaluated
  if (open && facts.hasResume && !facts.hasResumeEvaluation) {
    return { kind: "evaluate_cv", label: "Valuta CV", missingResume };
  }

  // 2) In stage Test with no test sent (cancelled ones do not count)
  if (
    stage === "assessment" &&
    !facts.assessments.some((a) => a.status !== "cancelled")
  ) {
    return { kind: "send_assessment", label: "Invia test", missingResume };
  }

  // 3) A completed test without evaluation: the oldest first
  const toEvaluate = facts.assessments
    .filter((a) => a.status === "completed" && !a.hasEvaluation)
    .sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt));
  if (toEvaluate.length > 0) {
    return {
      kind: "generate_evaluation",
      label: "Genera valutazione",
      assessmentId: toEvaluate[0].id,
      missingResume,
    };
  }

  const interviews = facts.interviews ?? [];

  // 4) In stage Colloquio with no conversation planned or held
  if (
    stage === "interview" &&
    !interviews.some((i) =>
      ["scheduled", "in_progress", "completed"].includes(i.status),
    )
  ) {
    return {
      kind: "schedule_interview",
      label: "Pianifica colloquio",
      missingResume,
    };
  }

  // 5) A planned conversation whose kit is not ready
  if (interviews.some((i) => i.status === "scheduled" && !i.kitReady)) {
    return {
      kind: "prepare_interview",
      label: "Prepara colloquio",
      missingResume,
    };
  }

  // 6) A held conversation without its feedback
  if (interviews.some((i) => i.status === "completed" && i.feedbackMissing)) {
    return { kind: "fill_feedback", label: "Compila scheda", missingResume };
  }

  // 7) Every feedback is in
  if (
    facts.allFeedbackSubmitted === true &&
    (stage === "interview" || stage === "decision")
  ) {
    return {
      kind: "go_to_decision",
      label: "Vai alla decisione",
      missingResume,
    };
  }

  // Fallback: move on, or the closed state
  const target = nextStage(stage);
  if (open && target) {
    return {
      kind: "advance_stage",
      label: `Passa a ${STAGE_LABELS[target]}`,
      targetStage: target,
      missingResume,
    };
  }

  return {
    kind: "closed",
    label: "Candidatura chiusa",
    canReopen: stage === "rejected" || stage === "withdrawn",
    missingResume,
  };
}
