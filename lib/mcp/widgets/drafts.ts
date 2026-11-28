/**
 * Draft-preview widget models: a position draft, a quiz preview and an
 * interview slot proposal, each with the confirmation a person gives in the
 * widget (an app-only tool). After the confirmation the same builders show
 * the confirmed state, without a confirm button.
 */

import { PARTICIPANT_ROLE_LABEL } from "@/components/interviews/interview-presentation";
import { getPositionStatusPresentation } from "@/components/positions/position-status";
import type {
  PositionFormData,
  QuizDraftInput,
  ScheduleInterviewInput,
} from "@/lib/schemas";
import { getQuestionTypeLabel } from "@/lib/utils/quiz-form-utils";
import { links } from "../links";
import { formatDateTime } from "../render";
import type { McpProposalContext } from "../scheduling";
import type { McpInterviewKitView } from "../views";
import { toneOf } from "./build";
import type { DraftPreviewWidget } from "./types";

/** Tool names of the confirmations (app-only tools) */
export const CONFIRM_TOOLS = {
  publish: "publish_draft",
  saveQuiz: "save_quiz",
} as const;

/** Questions listed in a quiz preview before "e altre N" */
const MAX_PREVIEW_QUESTIONS = 20;

// ====================
// POSITION
// ====================

export function positionDraftWidget(
  positionId: string,
  position: PositionFormData,
  status: "draft" | "open",
): DraftPreviewWidget {
  const presentation = getPositionStatusPresentation(status);
  const sections: DraftPreviewWidget["sections"] = [
    { title: "Competenze", items: position.skills },
  ];
  if (position.softSkills?.length) {
    sections.push({ title: "Soft skill", items: position.softSkills });
  }
  if (position.description?.trim()) {
    sections.push({ title: "Descrizione", items: [position.description.trim()] });
  }

  return {
    kind: "draft-preview",
    draft: "position",
    eyebrow: "Bozza di posizione",
    title: position.title,
    status: { label: presentation.label, tone: toneOf(presentation.badge) },
    facts: [
      { label: "Livello", value: position.experienceLevel },
      ...(position.contractType?.trim()
        ? [{ label: "Contratto", value: position.contractType.trim() }]
        : []),
    ],
    sections,
    note:
      status === "draft"
        ? "La posizione è salvata in bozza. Pubblica la apre: completa prima criteri, test e traccia dalla dashboard, se servono."
        : "La posizione è aperta.",
    confirm:
      status === "draft"
        ? {
            label: "Pubblica la posizione",
            tool: CONFIRM_TOOLS.publish,
            arguments: { kind: "position", id: positionId },
          }
        : null,
    url: links.position(positionId),
  };
}

// ====================
// QUIZ
// ====================

export function quizPreviewWidget(
  input: QuizDraftInput,
  positionTitle: string,
  saved: { quizId: string } | null,
): DraftPreviewWidget {
  const shown = input.questions.slice(0, MAX_PREVIEW_QUESTIONS);
  const items = shown.map(
    (question, index) =>
      `${index + 1}. [${getQuestionTypeLabel(question.type)}] ${question.question}`,
  );
  if (input.questions.length > shown.length) {
    items.push(`e altre ${input.questions.length - shown.length} domande`);
  }

  return {
    kind: "draft-preview",
    draft: "quiz",
    eyebrow: saved ? "Test salvato" : "Anteprima test",
    title: input.title,
    status: saved
      ? { label: "Salvato", tone: "done" }
      : { label: "Non salvato", tone: "warning" },
    facts: [
      { label: "Posizione", value: positionTitle },
      { label: "Domande", value: String(input.questions.length) },
      {
        label: "Tempo",
        value: input.timeLimit ? `${input.timeLimit} minuti` : "Senza limite",
      },
    ],
    sections: [{ title: "Domande", items }],
    note: saved
      ? "Il test è salvato nella posizione. Nessun candidato è stato invitato."
      : "Il test non è ancora salvato. Salva lo aggiunge alla posizione; nessun candidato viene invitato.",
    confirm: saved
      ? null
      : {
          label: "Salva il test",
          tool: CONFIRM_TOOLS.saveQuiz,
          arguments: input as unknown as Record<string, unknown>,
        },
    url: saved ? links.quiz(saved.quizId) : null,
  };
}

// ====================
// INTERVIEW PROPOSAL
// ====================

export function proposalWidget(
  proposalId: string,
  payload: ScheduleInterviewInput,
  context: McpProposalContext,
  scheduled: { interviewId: string } | null,
): DraftPreviewWidget {
  return {
    kind: "draft-preview",
    draft: "proposal",
    eyebrow: scheduled ? "Colloquio pianificato" : "Proposta di colloquio",
    title: `${context.candidateName} · Round ${payload.round}`,
    status: scheduled
      ? { label: "Pianificato", tone: "done" }
      : { label: "In attesa di conferma", tone: "pending" },
    facts: [
      { label: "Posizione", value: context.positionTitle },
      { label: "Quando", value: formatDateTime(payload.scheduledAt) },
      { label: "Durata", value: `${payload.durationMinutes} minuti` },
      { label: "Traccia", value: context.guideTitle },
    ],
    sections: [
      {
        title: "Partecipanti",
        items: context.participants.map(
          (participant) => `${participant.name} · ${PARTICIPANT_ROLE_LABEL[participant.role]}`,
        ),
      },
      ...(payload.meetingUrl
        ? [{ title: "Link della call", items: [payload.meetingUrl] }]
        : []),
    ],
    note: scheduled
      ? "Il colloquio è pianificato e la preparazione è in bozza. Nessuna email è stata inviata."
      : "Niente è ancora pianificato. Pianifica crea il colloquio e la sua preparazione; nessuna email viene inviata.",
    confirm: scheduled
      ? null
      : {
          label: "Pianifica il colloquio",
          tool: CONFIRM_TOOLS.publish,
          arguments: { kind: "proposal", id: proposalId },
        },
    url: scheduled
      ? links.interviewPrepare(payload.applicationId, scheduled.interviewId)
      : links.application(payload.applicationId),
  };
}

// ====================
// INTERVIEW KIT
// ====================

/** Counts of a saved patch, shown in the kit preview */
export interface KitChangeSummary {
  added: number;
  updated: number;
  removed: number;
}

const changeLine = (changes: KitChangeSummary) =>
  [
    changes.added && `${changes.added} ${changes.added === 1 ? "domanda nuova" : "domande nuove"}`,
    changes.updated && `${changes.updated} ${changes.updated === 1 ? "modificata" : "modificate"}`,
    changes.removed && `${changes.removed} ${changes.removed === 1 ? "rimossa" : "rimosse"}`,
  ]
    .filter(Boolean)
    .join(", ");

export function kitDraftWidget(
  view: McpInterviewKitView,
  changes: KitChangeSummary | null,
): DraftPreviewWidget {
  const ready = view.kitStatus === "ready";
  const questionCount = view.sections.reduce((sum, part) => sum + part.items.length, 0);
  const criterionName = new Map(view.criteria.map((criterion) => [criterion.id, criterion.name]));

  const sections: DraftPreviewWidget["sections"] = [];
  if (view.briefing.length) sections.push({ title: "Briefing", items: view.briefing });
  for (const part of view.sections) {
    sections.push({
      title: `${part.title} · ${part.minutes} min`,
      items: part.items.length
        ? part.items.map((item) => {
            const criteria = item.criterionIds
              .map((id) => criterionName.get(id))
              .filter(Boolean)
              .join(", ");
            return [
              `${item.required ? "★ " : ""}${item.text}`,
              ...item.followUps.map((followUp) => `  ↳ ${followUp}`),
              ...(criteria ? [`  criteri: ${criteria}`] : []),
            ].join("\n");
          })
        : ["Nessuna domanda"],
    });
  }
  if (view.hypotheses.length) {
    sections.push({
      title: "Ipotesi da verificare",
      items: view.hypotheses.map(
        (hypothesis) =>
          `${hypothesis.criterion ? `${hypothesis.criterion}: ` : ""}${hypothesis.hypothesis}\n  come verificarla: ${hypothesis.howToVerify}`,
      ),
    });
  }

  const summary = changes ? changeLine(changes) : "";

  return {
    kind: "draft-preview",
    draft: "kit",
    eyebrow: ready ? "Preparazione pronta" : "Preparazione in bozza",
    title: `${view.positionTitle} · Round ${view.round}`,
    status: ready ? { label: "Pronto", tone: "done" } : { label: "Bozza", tone: "warning" },
    facts: [
      { label: "Quando", value: formatDateTime(view.scheduledAt) },
      { label: "Domande", value: String(questionCount) },
      ...(summary ? [{ label: "Modifiche salvate", value: summary }] : []),
    ],
    sections,
    note: ready
      ? "La preparazione è pronta per il colloquio."
      : view.editable
        ? "Le modifiche sono salvate nella preparazione in bozza. Segna come pronta quando è completa; si può riportare in bozza dalla dashboard."
        : "La preparazione non si può più modificare: il colloquio non è pianificato.",
    confirm:
      !ready && view.status === "scheduled"
        ? {
            label: "Segna come pronta",
            tool: CONFIRM_TOOLS.publish,
            arguments: { kind: "kit", id: view.interviewId },
          }
        : null,
    url: view.url,
  };
}
