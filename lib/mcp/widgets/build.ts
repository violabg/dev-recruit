/**
 * Builders of the widget models (see ./types). They reuse the presentation
 * maps of the dashboard (labels, stage colours) and the MCP deep links, so a
 * widget shows the same words and colours as the app.
 */

import { getApplicationStagePresentation } from "@/components/applications/application-stage";
import { DECISION_OUTCOME_LABEL } from "@/components/applications/decision/decision-presentation";
import { QUEUE_TITLES } from "@/components/dashboard/action-center";
import {
  getInterviewStatusPresentation,
  KIT_STATUS_PRESENTATION,
} from "@/components/interviews/interview-presentation";
import { getPositionStatusPresentation } from "@/components/positions/position-status";
import type {
  ActionCenterForUser,
  ApplicationCard,
} from "@/lib/data/applications";
import type { Position } from "@/lib/prisma/client";
import type { DecisionOutcomeValue, KitStatus } from "@/lib/schemas";
import { CLOSED_STAGES, OPEN_STAGES, STAGE_ORDER } from "@/lib/utils/application-stage";
import {
  SETUP_STEP_LABEL,
  SETUP_STEP_TAB,
  type PositionSetup,
} from "@/lib/utils/position-setup";
import { formatDateTime, HIDDEN_DECISION_TEXT } from "../render";
import { links } from "../links";
import type { McpApplicationView, McpInterviewRow } from "../views";
import type {
  ActionCenterWidget,
  ApplicationFlowWidget,
  PositionWidget,
  WidgetBadge,
  WidgetRow,
  WidgetStation,
  WidgetTone,
} from "./types";

const TONES: readonly WidgetTone[] = [
  "pending",
  "progress",
  "done",
  "cancelled",
  "expired",
  "warning",
];

/**
 * Tone of a presentation class list: `bg-stage-progress` → progress,
 * `bg-success/10` → done, `bg-warning/10` → warning, otherwise muted. The
 * colour of a stage or status stays defined once, in its presentation map.
 */
export function toneOf(classes: string): WidgetTone {
  const stage = /\bbg-stage-([a-z]+)/.exec(classes)?.[1];
  if (stage && TONES.includes(stage as WidgetTone)) return stage as WidgetTone;
  if (/\bbg-success\b|\bbg-success\//.test(classes)) return "done";
  if (/\bbg-warning\b|\bbg-warning\//.test(classes)) return "warning";
  return "muted";
}

const stageBadge = (stage: string): WidgetBadge => {
  const presentation = getApplicationStagePresentation(stage);
  return { label: presentation.label, tone: toneOf(presentation.dot) };
};

const positionStatusBadge = (status: string): WidgetBadge => {
  const presentation = getPositionStatusPresentation(status);
  return { label: presentation.label, tone: toneOf(presentation.badge) };
};

const kitLabel = (status: KitStatus | null) =>
  status ? KIT_STATUS_PRESENTATION[status].label : "Nessun kit";

const join = (...parts: (string | null | undefined | false)[]) =>
  parts.filter(Boolean).join(" · ");

const askApplication = (candidateName: string, positionTitle: string, id: string) =>
  `Mostrami la candidatura di ${candidateName} per ${positionTitle} (applicationId ${id}).`;

// ====================
// ACTION CENTER
// ====================

const SUMMARY: Record<ActionCenterWidget["queues"][number]["key"], string> = {
  setup: "Posizioni",
  tests: "Test",
  kits: "Kit",
  scorecards: "Schede",
  stale: "Ferme",
};

export function buildActionCenterWidget(
  result: ActionCenterForUser,
  mineOnly: boolean,
): ActionCenterWidget {
  const { data, staleApplications } = result;

  return {
    kind: "action-center",
    title: "Le mie azioni",
    mineOnly,
    queues: [
      {
        key: "setup",
        title: QUEUE_TITLES.setup,
        short: SUMMARY.setup,
        empty: "Tutte pronte",
        rows: data.positionsWithIncompleteSetup.map((position) => ({
          title: position.title,
          meta: `Manca: ${position.missing.map((part) => SETUP_STEP_LABEL[part]).join(", ")}`,
          badge: positionStatusBadge(position.status),
          url: links.position(position.positionId),
          ask: `Mostrami la posizione ${position.title} (positionId ${position.positionId}).`,
        })),
      },
      {
        key: "tests",
        title: QUEUE_TITLES.tests,
        short: SUMMARY.tests,
        empty: "Nessuno",
        rows: data.assessmentsToEvaluate.map((row) => ({
          title: row.candidateName,
          meta: join(
            row.positionTitle,
            row.quizTitle,
            row.completedAt && `completato ${formatDateTime(row.completedAt)}`,
          ),
          url: links.application(row.applicationId),
          ask: askApplication(row.candidateName, row.positionTitle, row.applicationId),
        })),
      },
      {
        key: "kits",
        title: QUEUE_TITLES.kits,
        short: SUMMARY.kits,
        empty: "Kit pronti per oggi e domani",
        rows: data.interviewsWithoutKit.map((row) => ({
          title: row.candidateName,
          meta: join(row.positionTitle, `Round ${row.round}`, formatDateTime(row.scheduledAt)),
          url: links.interviewPrepare(row.applicationId, row.interviewId),
        })),
      },
      {
        key: "scorecards",
        title: QUEUE_TITLES.scorecards,
        short: SUMMARY.scorecards,
        empty: "Tutte compilate",
        rows: data.feedbackToFill.map((row) => ({
          title: row.candidateName,
          meta: join(row.positionTitle, `Round ${row.round}`, row.interviewerName),
          url: links.application(row.applicationId),
          ask: askApplication(row.candidateName, row.positionTitle, row.applicationId),
        })),
      },
      {
        key: "stale",
        title: QUEUE_TITLES.stale,
        short: SUMMARY.stale,
        empty: "Nessuna",
        rows: staleApplications.map((row) => ({
          title: row.candidateName,
          meta: join(row.positionTitle, `dal ${formatDateTime(row.stageChangedAt)}`),
          badge: stageBadge(row.stage),
          url: links.application(row.applicationId),
          ask: askApplication(row.candidateName, row.positionTitle, row.applicationId),
        })),
      },
    ],
    url: links.actionCenter(),
  };
}

// ====================
// POSITION
// ====================

export function buildPositionWidget(
  position: Position,
  setup: PositionSetup | null,
  applications: ApplicationCard[],
): PositionWidget {
  const counts = new Map<string, number>();
  for (const application of applications) {
    counts.set(application.stage, (counts.get(application.stage) ?? 0) + 1);
  }

  const pipeline: WidgetStation[] = OPEN_STAGES.map((stage) => ({
    label: getApplicationStagePresentation(stage).label,
    state: (counts.get(stage) ?? 0) > 0 ? "current" : "todo",
    count: counts.get(stage) ?? 0,
  }));

  const closedCount = CLOSED_STAGES.reduce(
    (sum, stage) => sum + (counts.get(stage) ?? 0),
    0,
  );

  // Stage order, closed stages (outside STAGE_ORDER) last
  const rank = (stage: ApplicationCard["stage"]) => {
    const index = STAGE_ORDER.indexOf(stage);
    return index === -1 ? STAGE_ORDER.length : index;
  };

  const rows: WidgetRow[] = [...applications]
    .sort((a, b) => rank(a.stage) - rank(b.stage))
    .map((application) => {
      const name =
        `${application.candidate.firstName} ${application.candidate.lastName}`.trim();
      return {
        title: name,
        meta: join(
          `dal ${formatDateTime(application.stageChangedAt)}`,
          application.owner?.name && `responsabile ${application.owner.name}`,
        ),
        badge: stageBadge(application.stage),
        url: links.application(application.id),
        ask: askApplication(name, position.title, application.id),
      };
    });

  return {
    kind: "position",
    title: position.title,
    status: positionStatusBadge(position.status),
    facts: [
      { label: "Livello", value: position.experienceLevel },
      ...(position.contractType
        ? [{ label: "Contratto", value: position.contractType }]
        : []),
      { label: "Candidature", value: String(applications.length) },
    ],
    skills: position.skills,
    softSkills: position.softSkills,
    setup: setup
      ? {
          complete: setup.complete,
          steps: setup.steps.map((step) => ({
            label: SETUP_STEP_LABEL[step.key],
            done: step.done,
            url: `${links.position(position.id)}?tab=${SETUP_STEP_TAB[step.key]}`,
          })),
        }
      : null,
    pipeline,
    closedCount,
    applications: rows,
    url: links.position(position.id),
  };
}

// ====================
// APPLICATION FLOW
// ====================

function interviewRow(row: McpInterviewRow): WidgetRow {
  const status = getInterviewStatusPresentation(row.status);
  return {
    title: `Round ${row.round} · ${formatDateTime(row.scheduledAt)}`,
    meta: join(kitLabel(row.kitStatus), row.participants.map((p) => p.name).join(", ")),
    badge: { label: status.label, tone: toneOf(status.badge ?? "") },
    url: row.url,
    ask: `Aiutami a preparare il colloquio round ${row.round} (interviewId ${row.id}).`,
  };
}

export function buildApplicationFlowWidget(
  view: McpApplicationView,
): ApplicationFlowWidget {
  const closed = CLOSED_STAGES.includes(view.stage);
  const current = STAGE_ORDER.indexOf(view.stage);

  const track: WidgetStation[] = closed
    ? []
    : STAGE_ORDER.map((stage, index) => ({
        label: getApplicationStagePresentation(stage).label,
        state: index < current ? "done" : index === current ? "current" : "todo",
      }));

  return {
    kind: "application-flow",
    candidateName: view.candidate.name,
    positionTitle: view.position.title,
    doNotContact: view.candidate.doNotContact,
    stage: stageBadge(view.stage),
    stageSince: formatDateTime(view.stageChangedAt),
    owner: view.owner?.name ?? "Nessuno",
    track,
    evaluations: view.evaluations.map((evaluation) =>
      evaluation.kind === "resume"
        ? {
            label: "CV",
            value: evaluation.fitScore !== null ? `${evaluation.fitScore}/10` : "–",
            note: evaluation.recommendation ?? "",
          }
        : {
            label: "Test",
            value: evaluation.quizScore !== null ? `${evaluation.quizScore}%` : "–",
            note:
              evaluation.fitScore !== null
                ? `adeguatezza ${evaluation.fitScore}/10`
                : "",
          },
    ),
    decision: {
      outcome: view.decision.outcome
        ? (DECISION_OUTCOME_LABEL[view.decision.outcome as DecisionOutcomeValue] ??
          view.decision.outcome)
        : "Nessun esito registrato",
      score: view.decision.hidden
        ? HIDDEN_DECISION_TEXT
        : view.decision.overallScore !== null
          ? `Punteggio complessivo ${view.decision.overallScore}`
          : "Punteggio non disponibile",
      hidden: view.decision.hidden,
      url: view.decisionUrl,
    },
    interviews: view.interviews.map(interviewRow),
    url: view.url,
  };
}
