import type { ApplicationDetail } from "@/lib/data/applications";
import { STAGE_LABELS } from "./application-stage";

/**
 * Evidence timeline of an application, built from the rows it already has
 * (no history table exists). Pure: newest first, facts without a date skipped.
 */

export type TimelineEntryKind =
  | "applied"
  | "resume_evaluated"
  | "assessment_sent"
  | "assessment_started"
  | "assessment_completed"
  | "assessment_evaluated"
  | "stage_changed";

export type TimelineEntry = {
  kind: TimelineEntryKind;
  at: Date;
  label: string;
  href?: string;
};

const toDate = (value: Date | string) =>
  typeof value === "string" ? new Date(value) : value;

export function buildApplicationTimeline(
  application: ApplicationDetail,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  const add = (
    kind: TimelineEntryKind,
    at: Date | string | null | undefined,
    label: string,
    href?: string,
  ) => {
    if (!at) return;
    entries.push({ kind, at: toDate(at), label, ...(href ? { href } : {}) });
  };

  add("applied", application.createdAt, "Candidatura ricevuta");

  if (application.resumeEvaluation) {
    add("resume_evaluated", application.resumeEvaluation.createdAt, "CV valutato");
  }

  for (const assessment of application.assessments) {
    const quizTitle = assessment.quiz.title;
    const href = `/dashboard/assessments/${assessment.id}`;

    add("assessment_sent", assessment.createdAt, `Test inviato: ${quizTitle}`, href);
    add(
      "assessment_started",
      assessment.startedAt,
      `Test iniziato: ${quizTitle}`,
      href,
    );
    add(
      "assessment_completed",
      assessment.completedAt,
      `Test completato: ${quizTitle}`,
      href,
    );
    add(
      "assessment_evaluated",
      assessment.evaluation?.createdAt,
      `Test valutato: ${quizTitle}`,
      href,
    );
  }

  // The stage changed after the application was received
  if (
    toDate(application.stageChangedAt).getTime() !==
    toDate(application.createdAt).getTime()
  ) {
    add(
      "stage_changed",
      application.stageChangedAt,
      `Fase attuale: ${STAGE_LABELS[application.stage]}`,
    );
  }

  return entries.sort((a, b) => b.at.getTime() - a.at.getTime());
}
