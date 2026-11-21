/**
 * Widget model of get_interview: the preparation of an interview, with the
 * same content as the text result (no candidate identity, no CV).
 */

import { GUIDE_SECTION_KIND_LABEL } from "@/components/interview-guides/guide-section-kind";
import {
  CHECKLIST_GROUPS,
  getInterviewStatusPresentation,
  KIT_STATUS_PRESENTATION,
  PARTICIPANT_ROLE_LABEL,
} from "@/components/interviews/interview-presentation";
import type { GuideSectionKind, InterviewParticipantRole } from "@/lib/schemas";
import { formatDateTime } from "../render";
import type { McpInterviewPrepView } from "../views";
import { toneOf } from "./build";
import { CONFIRM_TOOLS } from "./drafts";
import type { InterviewPrepWidget } from "./types";

const sectionTitle = (section: McpInterviewPrepView["sections"][number]) => {
  const kind = GUIDE_SECTION_KIND_LABEL[section.kind as GuideSectionKind];
  return kind && kind !== section.title ? `${section.title} · ${kind}` : section.title;
};

const ROLE_PLURAL: Record<InterviewParticipantRole, string> = {
  lead: "Conduttori",
  observer: "Osservatori",
};

/** "1 Conduttore, 2 Osservatori" */
function rolesLine(roles: InterviewParticipantRole[]): string {
  const counts = new Map<InterviewParticipantRole, number>();
  for (const role of roles) counts.set(role, (counts.get(role) ?? 0) + 1);
  return [...counts.entries()]
    .map(([role, count]) => `${count} ${count === 1 ? PARTICIPANT_ROLE_LABEL[role] : ROLE_PLURAL[role]}`)
    .join(", ");
}

export function buildInterviewPrepWidget(view: McpInterviewPrepView): InterviewPrepWidget {
  const status = getInterviewStatusPresentation(view.status);
  const kit = view.kitStatus ? KIT_STATUS_PRESENTATION[view.kitStatus] : null;
  const editable = view.status === "scheduled" && view.kitStatus === "draft";

  return {
    kind: "interview-prep",
    title: `${view.positionTitle} · Round ${view.round}`,
    status: { label: status.label, tone: toneOf(status.badge) },
    kit: kit
      ? { label: kit.label, tone: toneOf(kit.badge) }
      : { label: "Nessun kit", tone: "muted" },
    facts: [
      { label: "Quando", value: formatDateTime(view.scheduledAt) },
      { label: "Durata", value: `${view.durationMinutes} minuti` },
      ...(view.guideTitle ? [{ label: "Guida", value: view.guideTitle }] : []),
      ...(view.participantRoles.length
        ? [{ label: "Partecipanti", value: rolesLine(view.participantRoles) }]
        : []),
    ],
    outline: view.sections.map((section) => ({
      title: sectionTitle(section),
      questions: section.items.length,
      required: section.items.filter((item) => item.required).length,
    })),
    briefing: view.briefing,
    sections: view.sections.map((section) => ({
      title: sectionTitle(section),
      items: section.items,
    })),
    hypotheses: view.hypotheses,
    checklist: CHECKLIST_GROUPS.map((group) => ({
      title: group.title,
      items: view.checklist
        .filter((row) => row.category === group.category)
        .map((row) => ({ text: row.text, done: row.done })),
    })).filter((group) => group.items.length > 0),
    improve: editable
      ? `Aiutami a migliorare il kit del colloquio round ${view.round} (interviewId ${view.id}).`
      : null,
    markReady: editable
      ? {
          label: "Segna il kit come pronto",
          tool: CONFIRM_TOOLS.publish,
          arguments: { kind: "kit", id: view.id },
        }
      : null,
    url: view.url,
  };
}
