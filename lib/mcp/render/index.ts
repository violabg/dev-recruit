/**
 * Italian plain-text results of the MCP tools: usable without any widget.
 * Labels come from the presentation modules only; every text ends with the
 * dashboard link.
 */

import { getApplicationStagePresentation } from "@/components/applications/application-stage";
import { DECISION_OUTCOME_LABEL } from "@/components/applications/decision/decision-presentation";
import { QUEUE_TITLES } from "@/components/dashboard/action-center";
import { GUIDE_SECTION_KIND_LABEL } from "@/components/interview-guides/guide-section-kind";
import {
  getInterviewStatusPresentation,
  KIT_STATUS_PRESENTATION,
  PARTICIPANT_ROLE_LABEL,
} from "@/components/interviews/interview-presentation";
import { getPositionStatusPresentation } from "@/components/positions/position-status";
import type {
  ActionCenterForUser,
  ApplicationCard,
} from "@/lib/data/applications";
import type { PaginatedPositions } from "@/lib/data/positions";
import type { Position } from "@/lib/prisma/client";
import type {
  DecisionOutcomeValue,
  GuideSectionKind,
  KitStatus,
} from "@/lib/schemas";
import {
  SETUP_STEP_LABEL,
  type PositionSetup,
} from "@/lib/utils/position-setup";
import { APP_URL } from "../config";
import { links } from "../links";
import type {
  McpApplicationView,
  McpInterviewPrepView,
  McpInterviewRow,
} from "../views";

export const HIDDEN_DECISION_TEXT =
  "Punteggio e decisione nascosti finché non invii la tua scheda";

const dateTimeFormat = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(date: Date | string): string {
  return dateTimeFormat.format(new Date(date));
}

const openLink = (url: string) => `Apri in dev-recruit: ${url}`;

const kitLabel = (status: KitStatus | null) =>
  status ? KIT_STATUS_PRESENTATION[status].label : "Nessun kit";

const outcomeLabel = (outcome: string) =>
  DECISION_OUTCOME_LABEL[outcome as DecisionOutcomeValue] ?? outcome;

const sectionKindLabel = (kind: string) =>
  GUIDE_SECTION_KIND_LABEL[kind as GuideSectionKind] ?? kind;

function block(title: string, lines: string[], empty: string): string[] {
  return [`${title} (${lines.length})`, ...(lines.length ? lines : [`- ${empty}`]), ""];
}

export function renderActionCenter(result: ActionCenterForUser): string {
  const { data, staleApplications } = result;

  const lines = [
    "Le mie azioni",
    "",
    ...block(
      QUEUE_TITLES.setup,
      data.positionsWithIncompleteSetup.map(
        (position) =>
          `- ${position.title} (${getPositionStatusPresentation(position.status).label}): manca ${position.missing
            .map((part) => SETUP_STEP_LABEL[part])
            .join(", ")} · ${links.position(position.positionId)}`,
      ),
      "Tutte pronte",
    ),
    ...block(
      QUEUE_TITLES.tests,
      data.assessmentsToEvaluate.map(
        (row) =>
          `- ${row.candidateName} · ${row.positionTitle} · ${row.quizTitle} · ${links.application(row.applicationId)}`,
      ),
      "Nessuno",
    ),
    ...block(
      QUEUE_TITLES.kits,
      data.interviewsWithoutKit.map(
        (row) =>
          `- ${row.candidateName} · ${row.positionTitle} · Round ${row.round}, ${formatDateTime(row.scheduledAt)} · ${links.interviewPrepare(row.applicationId, row.interviewId)}`,
      ),
      "Kit pronti per oggi e domani",
    ),
    ...block(
      QUEUE_TITLES.scorecards,
      data.feedbackToFill.map(
        (row) =>
          `- ${row.candidateName} · ${row.positionTitle} · Round ${row.round}, ${row.interviewerName} · ${links.application(row.applicationId)}`,
      ),
      "Tutte compilate",
    ),
    ...block(
      QUEUE_TITLES.stale,
      staleApplications.map(
        (row) =>
          `- ${row.candidateName} · ${row.positionTitle} · ${getApplicationStagePresentation(row.stage).label} dal ${formatDateTime(row.stageChangedAt)} · ${links.application(row.applicationId)}`,
      ),
      "Nessuna",
    ),
    openLink(links.actionCenter()),
  ];

  return lines.join("\n");
}

export function renderPositionList(page: PaginatedPositions): string {
  const header = `Posizioni: ${page.totalCount} (pagina ${page.currentPage} di ${page.totalPages})`;
  const rows = page.positions.map(
    (position) =>
      `- ${position.title} · ${getPositionStatusPresentation(position.status).label} · ${position.experienceLevel} · ${links.position(position.id)}`,
  );
  return [
    header,
    ...(rows.length ? rows : ["- Nessuna posizione trovata"]),
    ...(page.hasNextPage ? [`Altre posizioni alla pagina ${page.currentPage + 1}.`] : []),
    "",
    openLink(`${APP_URL}/dashboard/positions`),
  ].join("\n");
}

export function renderPosition(
  position: Position,
  setup: PositionSetup | null,
  applications: ApplicationCard[],
): string {
  const stageCounts = new Map<string, number>();
  for (const application of applications) {
    const label = getApplicationStagePresentation(application.stage).label;
    stageCounts.set(label, (stageCounts.get(label) ?? 0) + 1);
  }

  const lines = [
    `Posizione: ${position.title}`,
    `Stato: ${getPositionStatusPresentation(position.status).label}`,
    `Livello: ${position.experienceLevel}`,
    ...(position.contractType ? [`Contratto: ${position.contractType}`] : []),
    `Competenze: ${position.skills.join(", ") || "nessuna"}`,
    ...(position.softSkills.length
      ? [`Soft skill: ${position.softSkills.join(", ")}`]
      : []),
    ...(position.description ? ["", "Descrizione:", position.description] : []),
    "",
    setup
      ? setup.complete
        ? "Setup completo"
        : `Setup da completare: manca ${setup.missing.map((part) => SETUP_STEP_LABEL[part]).join(", ")}`
      : "Setup non disponibile",
    "",
    `Candidature: ${applications.length}`,
    ...[...stageCounts.entries()].map(([label, count]) => `- ${label}: ${count}`),
    "",
    openLink(links.position(position.id)),
  ];
  return lines.join("\n");
}

function interviewLine(row: McpInterviewRow): string {
  return `- ${formatDateTime(row.scheduledAt)} · ${row.candidateName} · ${row.positionTitle} · Round ${row.round} · ${getInterviewStatusPresentation(row.status).label} · ${kitLabel(row.kitStatus)} · ${row.url}`;
}

export function renderApplication(view: McpApplicationView): string {
  const lines = [
    `Candidatura: ${view.candidate.name} · ${view.position.title}`,
    ...(view.candidate.doNotContact ? ["Attenzione: candidato da non contattare"] : []),
    `Fase: ${getApplicationStagePresentation(view.stage).label} dal ${formatDateTime(view.stageChangedAt)}`,
    `Responsabile: ${view.owner?.name ?? "nessuno"}`,
    "",
    "Valutazioni (indicative, la decisione è di una persona):",
    ...(view.evaluations.length
      ? view.evaluations.map((evaluation) =>
          evaluation.kind === "resume"
            ? `- CV: ${evaluation.fitScore ?? "–"}/10${evaluation.recommendation ? ` · ${evaluation.recommendation}` : ""}`
            : `- Test: ${evaluation.quizScore ?? "–"}%${evaluation.fitScore !== null ? ` · adeguatezza ${evaluation.fitScore}/10` : ""}`,
        )
      : ["- Nessuna valutazione"]),
    "",
    "Decisione:",
    ...(view.decision.outcome
      ? [`- Esito registrato: ${outcomeLabel(view.decision.outcome)}${view.decision.decidedAt ? ` (${formatDateTime(view.decision.decidedAt)})` : ""}`]
      : ["- Nessun esito registrato"]),
    view.decision.hidden
      ? `- ${HIDDEN_DECISION_TEXT}`
      : `- Punteggio complessivo: ${view.decision.overallScore ?? "non disponibile"}`,
    "",
    `Colloqui (${view.interviews.length}):`,
    ...(view.interviews.length ? view.interviews.map(interviewLine) : ["- Nessun colloquio"]),
  ];

  if (view.cvRequested) {
    lines.push("", "CV:", view.cvText ?? "CV non leggibile");
  }

  lines.push("", `Decisione: ${view.decisionUrl}`, openLink(view.url));
  return lines.join("\n");
}

export function renderInterviewList(rows: McpInterviewRow[]): string {
  return [
    `Colloqui: ${rows.length}`,
    ...(rows.length ? rows.map(interviewLine) : ["- Nessun colloquio"]),
    "",
    openLink(links.agenda()),
  ].join("\n");
}

export function renderInterview(view: McpInterviewPrepView): string {
  const lines = [
    `Colloquio: ${view.positionTitle} · Round ${view.round}`,
    `Quando: ${formatDateTime(view.scheduledAt)} · ${view.durationMinutes} minuti`,
    `Stato: ${getInterviewStatusPresentation(view.status).label} · ${kitLabel(view.kitStatus)}`,
    `Partecipanti: ${view.participantRoles.map((role) => PARTICIPANT_ROLE_LABEL[role]).join(", ") || "nessuno"}`,
    ...(view.guideTitle ? [`Guida: ${view.guideTitle}`] : []),
  ];

  if (view.briefing.length) {
    lines.push("", "Briefing:", ...view.briefing.map((point) => `- ${point}`));
  }

  for (const section of view.sections) {
    lines.push("", `${section.title} (${sectionKindLabel(section.kind)})`);
    for (const item of section.items) {
      lines.push(
        `- ${item.text}${item.required ? " (obbligatoria)" : ""}${item.criteria.length ? ` · criteri: ${item.criteria.join(", ")}` : ""}`,
        ...item.followUps.map((followUp) => `  - ${followUp}`),
      );
    }
  }

  if (view.hypotheses.length) {
    lines.push(
      "",
      "Ipotesi da verificare:",
      ...view.hypotheses.map(
        (hypothesis) =>
          `- ${hypothesis.criterion ? `${hypothesis.criterion}: ` : ""}${hypothesis.hypothesis} · come verificarla: ${hypothesis.howToVerify}`,
      ),
    );
  }

  if (view.checklist.length) {
    lines.push(
      "",
      "Checklist:",
      ...view.checklist.map((row) => `- [${row.done ? "x" : " "}] ${row.text}`),
    );
  }

  lines.push("", openLink(view.url));
  return lines.join("\n");
}
