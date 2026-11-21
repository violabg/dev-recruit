/**
 * Draft tools (scope recruit:draft) and the confirmed write (recruit:write).
 *
 * Trust ladder: the model prepares a draft (a position in draft status, a
 * quiz preview, a pending slot proposal); a person confirms it with the
 * button of the draft-preview widget, which calls an app-only tool hidden
 * from the model. Every write goes through the dashboard's service and
 * schema. Nothing is sent to candidates.
 */

import { getPositionById } from "@/lib/data/positions";
import {
  createPositionDraftInputSchema,
  getInterviewKitInputSchema,
  getSchedulingOptionsInputSchema,
  kitPatchInputSchema,
  proposeInterviewSlotInputSchema,
  publishDraftInputSchema,
  quizDraftInputSchema,
  type QuizDraftInput,
} from "@/lib/schemas";
import {
  confirmInterviewProposal,
  proposeInterviewSlot,
} from "@/lib/services/interview-proposals";
import {
  loadStoredKit,
  patchInterviewKit,
} from "@/lib/services/interview-kit-patch";
import { setInterviewKitStatus } from "@/lib/services/interview-kits";
import {
  createPosition,
  publishPositionDraft,
} from "@/lib/services/positions";
import { saveQuiz } from "@/lib/services/quizzes";
import { UserError } from "@/lib/services/user-error";
import { formatDateTime } from "../render";
import { links } from "../links";
import { buildSchedulingOptions, proposalContext } from "../scheduling";
import { buildInterviewKitView } from "../views";
import {
  kitDraftWidget,
  positionDraftWidget,
  proposalWidget,
  quizPreviewWidget,
} from "../widgets/drafts";
import type { InvalidationRequest } from "./types";
import { defineTool } from "./types";

const CONFIRM_IN_WIDGET = "Per confermare usa il pulsante nel riquadro.";

const lines = (...parts: (string | false | null | undefined)[]) =>
  parts.filter((part) => part !== false && part !== null && part !== undefined).join("\n");

// ====================
// POSITION
// ====================

export const createPositionDraftTool = defineTool({
  name: "create_position_draft",
  title: "Crea bozza di posizione",
  description:
    "Crea una posizione in bozza (titolo, livello, competenze, soft skill, contratto, descrizione). Non la pubblica: la pubblicazione la conferma una persona dal riquadro o dalla dashboard.",
  scope: "recruit:draft",
  group: "draft",
  inputSchema: createPositionDraftInputSchema,
  widget: "draft-preview",
  readOnly: false,
  async handler(actor, input) {
    const { positionId } = await createPosition(actor, input);
    return {
      text: lines(
        `Bozza di posizione creata: ${input.title}`,
        `Livello: ${input.experienceLevel} · Competenze: ${input.skills.join(", ")}`,
        "Prossimi passi dalla dashboard: scheda di valutazione, quiz e guida colloquio.",
        "Per pubblicarla usa il pulsante nel riquadro o la pagina della posizione.",
        `Apri in dev-recruit: ${links.position(positionId)}`,
      ),
      structured: {
        positionId,
        widget: positionDraftWidget(positionId, input, "draft"),
      },
      invalidate: [{ kind: "position", positionId }],
      auditSummary: `position=${positionId} created=draft`,
    };
  },
});

// ====================
// QUIZ
// ====================

async function positionTitle(positionId: string): Promise<string> {
  const position = await getPositionById(positionId);
  if (!position) throw new UserError("Posizione non trovata");
  return position.title;
}

export const saveQuizDraftTool = defineTool({
  name: "save_quiz_draft",
  title: "Anteprima quiz",
  description:
    "Prepara un quiz per una posizione (titolo, tempo, domande nel formato dell'editor) e ne mostra l'anteprima senza salvarlo. Il salvataggio lo conferma una persona dal riquadro. Nessun candidato viene invitato.",
  scope: "recruit:draft",
  group: "draft",
  inputSchema: quizDraftInputSchema,
  widget: "draft-preview",
  readOnly: true,
  async handler(_actor, input) {
    const title = await positionTitle(input.positionId);
    return {
      text: lines(
        `Anteprima quiz (non salvato): ${input.title}`,
        `Posizione: ${title} · ${input.questions.length} domande`,
        ...input.questions.map((question, index) => `${index + 1}. ${question.question}`),
        CONFIRM_IN_WIDGET,
      ),
      structured: { widget: quizPreviewWidget(input, title, null) },
      auditSummary: `position=${input.positionId} questions=${input.questions.length} preview`,
    };
  },
});

export const saveQuizTool = defineTool({
  name: "save_quiz",
  title: "Salva quiz",
  description: "Salva il quiz dell'anteprima. Solo dal pulsante del riquadro.",
  scope: "recruit:draft",
  group: "draft",
  inputSchema: quizDraftInputSchema,
  widget: "draft-preview",
  appOnly: true,
  readOnly: false,
  async handler(actor, input: QuizDraftInput) {
    const title = await positionTitle(input.positionId);
    const { quizId, positionId } = await saveQuiz(actor, input);
    return {
      text: lines(
        `Quiz salvato: ${input.title} (${input.questions.length} domande) per ${title}.`,
        "Nessun candidato è stato invitato.",
        `Apri in dev-recruit: ${links.quiz(quizId)}`,
      ),
      structured: { quizId, widget: quizPreviewWidget(input, title, { quizId }) },
      invalidate: [{ kind: "quiz", quizId, positionId }],
      auditSummary: `quiz=${quizId} position=${positionId} questions=${input.questions.length} saved`,
    };
  },
});

// ====================
// INTERVIEW SLOT
// ====================

export const getSchedulingOptionsTool = defineTool({
  name: "get_scheduling_options",
  title: "Opzioni per pianificare",
  description:
    "Cosa serve per proporre un colloquio di una candidatura: guide della posizione (id, round, durata), persone del team (id, nome), prossimo round e proposte in attesa.",
  scope: "recruit:read",
  group: "read",
  inputSchema: getSchedulingOptionsInputSchema,
  readOnly: true,
  async handler(_actor, input) {
    const options = await buildSchedulingOptions(input.applicationId);
    if (!options) throw new UserError("Candidatura non trovata");

    return {
      text: lines(
        `Pianificazione: ${options.application.candidateName} · ${options.application.positionTitle}`,
        `Prossimo round: ${options.nextRound}`,
        "",
        `Guide (${options.guides.length}):`,
        ...(options.guides.length
          ? options.guides.map(
              (guide) =>
                `- ${guide.title} · round ${guide.round} · ${guide.durationMinutes} minuti · guideId ${guide.id}`,
            )
          : ["- Nessuna guida: creala dalla dashboard prima di pianificare"]),
        "",
        `Team (${options.teamMembers.length}):`,
        ...options.teamMembers.map((member) => `- ${member.name} · userId ${member.id}`),
        "",
        `Proposte in attesa (${options.pendingProposals.length}):`,
        ...(options.pendingProposals.length
          ? options.pendingProposals.map(
              (proposal) =>
                `- Round ${proposal.payload.round}, ${formatDateTime(proposal.payload.scheduledAt)}`,
            )
          : ["- Nessuna"]),
      ),
      structured: {
        application: options.application,
        nextRound: options.nextRound,
        guides: options.guides,
        teamMembers: options.teamMembers,
        pendingProposals: options.pendingProposals.map((proposal) => ({
          id: proposal.id,
          round: proposal.payload.round,
          scheduledAt: proposal.payload.scheduledAt,
        })),
      },
      auditSummary: `application=${options.application.id} guides=${options.guides.length} pending=${options.pendingProposals.length}`,
    };
  },
});

export const proposeInterviewSlotTool = defineTool({
  name: "propose_interview_slot",
  title: "Proponi un colloquio",
  description:
    "Propone un colloquio per una candidatura (guida, round, data e ora con fuso, durata, link della call, partecipanti con un solo conduttore). Non pianifica nulla e non invia email: la pianificazione la conferma una persona dal riquadro. Usa prima get_scheduling_options per gli id.",
  scope: "recruit:draft",
  group: "draft",
  inputSchema: proposeInterviewSlotInputSchema,
  widget: "draft-preview",
  readOnly: false,
  async handler(actor, input) {
    const { proposalId, applicationId } = await proposeInterviewSlot(actor, input);
    const options = await buildSchedulingOptions(applicationId);
    if (!options) throw new UserError("Candidatura non trovata");
    const context = proposalContext(options, input);

    return {
      text: lines(
        `Proposta di colloquio salvata (non pianificata): ${context.candidateName} · ${context.positionTitle}`,
        `Round ${input.round} · ${formatDateTime(input.scheduledAt)} · ${input.durationMinutes} minuti · ${context.guideTitle}`,
        `Partecipanti: ${context.participants.map((participant) => participant.name).join(", ")}`,
        CONFIRM_IN_WIDGET,
      ),
      structured: {
        proposalId,
        widget: proposalWidget(proposalId, input, context, null),
      },
      invalidate: [{ kind: "interview_proposal", applicationId }],
      auditSummary: `proposal=${proposalId} application=${applicationId}`,
    };
  },
});

// ====================
// INTERVIEW KIT
// ====================

async function kitView(
  actor: Parameters<typeof buildInterviewKitView>[0],
  interviewId: string,
  stored?: Parameters<typeof buildInterviewKitView>[2],
) {
  const view = await buildInterviewKitView(actor, interviewId, stored);
  if (!view) throw new UserError("Colloquio non trovato");
  return view;
}

export const getInterviewKitTool = defineTool({
  name: "get_interview_kit",
  title: "Kit colloquio modificabile",
  description:
    "La struttura modificabile del kit di un colloquio: sezioni e domande con i loro id, criteri attivi della scheda (id e nome), briefing, ipotesi, checklist con id. Serve prima di save_interview_kit_draft. Non contiene l'identità del candidato né il CV.",
  scope: "recruit:read",
  group: "read",
  inputSchema: getInterviewKitInputSchema,
  readOnly: true,
  async handler(actor, input) {
    const view = await kitView(actor, input.interviewId);
    return {
      text: lines(
        `Kit: ${view.positionTitle} · Round ${view.round} · ${formatDateTime(view.scheduledAt)}`,
        `Stato kit: ${view.kitStatus === "ready" ? "pronto" : "bozza"} · ${view.editable ? "modificabile" : "non modificabile (kit pronto o colloquio non pianificato)"}`,
        "",
        "Criteri attivi:",
        ...(view.criteria.length
          ? view.criteria.map((criterion) => `- ${criterion.name} · criterionId ${criterion.id}`)
          : ["- Nessuno"]),
        ...view.sections.flatMap((section) => [
          "",
          `Sezione ${section.title} (${section.minutes} min) · sectionId ${section.id}`,
          ...(section.items.length
            ? section.items.map(
                (item) =>
                  `- ${item.text}${item.required ? " (obbligatoria)" : ""} · id ${item.id}`,
              )
            : ["- Nessuna domanda"]),
        ]),
        "",
        "Checklist:",
        ...(view.checklist.length
          ? view.checklist.map((row) => `- [${row.done ? "x" : " "}] ${row.text} · id ${row.id}`)
          : ["- Vuota"]),
        "",
        `Apri in dev-recruit: ${view.url}`,
      ),
      structured: { kit: view },
      auditSummary: `interview=${view.interviewId} sections=${view.sections.length} editable=${view.editable}`,
    };
  },
});

export const saveInterviewKitDraftTool = defineTool({
  name: "save_interview_kit_draft",
  title: "Modifica kit in bozza",
  description:
    "Modifica il kit in bozza di un colloquio pianificato, voce per voce: aggiungi domande a una sezione (addItems), modifica (updateItems) o rimuovi (removeItemIds) domande esistenti, sostituisci briefing o ipotesi, aggiungi o rimuovi voci della checklist. Le domande non indicate restano come sono. Usa gli id di get_interview_kit. Il kit resta in bozza: lo segna pronto una persona dal riquadro.",
  scope: "recruit:draft",
  group: "draft",
  inputSchema: kitPatchInputSchema,
  widget: "draft-preview",
  readOnly: false,
  async handler(actor, input) {
    const { interviewId, applicationId } = await patchInterviewKit(actor, input);
    const changes = {
      added: input.addItems?.length ?? 0,
      updated: input.updateItems?.length ?? 0,
      removed: input.removeItemIds?.length ?? 0,
    };
    // The cache refresh runs after the tool: show the kit read fresh
    const stored = (await loadStoredKit(interviewId)) ?? undefined;
    const view = await kitView(actor, interviewId, stored);

    return {
      text: lines(
        `Kit salvato in bozza: ${view.positionTitle} · Round ${view.round}`,
        `Domande nuove ${changes.added}, modificate ${changes.updated}, rimosse ${changes.removed}.`,
        "Il kit resta in bozza: per segnarlo pronto usa il pulsante nel riquadro o la pagina di preparazione.",
        `Apri in dev-recruit: ${view.url}`,
      ),
      structured: { interviewId, widget: kitDraftWidget(view, changes) },
      invalidate: [{ kind: "interview", interviewId, applicationId }],
      auditSummary: `interview=${interviewId} added=${changes.added} updated=${changes.updated} removed=${changes.removed}`,
    };
  },
});

// ====================
// CONFIRMED WRITE
// ====================

export const publishDraftTool = defineTool({
  name: "publish_draft",
  title: "Conferma bozza",
  description:
    "Conferma una bozza: apre una posizione in bozza, pianifica una proposta di colloquio o segna pronto un kit. Solo dal pulsante del riquadro.",
  scope: "recruit:write",
  group: "write",
  inputSchema: publishDraftInputSchema,
  widget: "draft-preview",
  appOnly: true,
  readOnly: false,
  async handler(actor, input) {
    if (input.kind === "position") {
      const { positionId } = await publishPositionDraft(actor, input.id);
      const position = await getPositionById(positionId);
      return {
        text: `Posizione pubblicata: ${position?.title ?? positionId}. Apri in dev-recruit: ${links.position(positionId)}`,
        structured: position
          ? {
              positionId,
              widget: positionDraftWidget(
                positionId,
                {
                  title: position.title,
                  description: position.description ?? undefined,
                  experienceLevel: position.experienceLevel,
                  skills: position.skills,
                  softSkills: position.softSkills,
                  contractType: position.contractType ?? undefined,
                },
                "open",
              ),
            }
          : { positionId },
        invalidate: [{ kind: "position", positionId }],
        auditSummary: `position=${positionId} published`,
      };
    }

    if (input.kind === "kit") {
      const { interviewId, applicationId } = await setInterviewKitStatus(actor, {
        interviewId: input.id,
        status: "ready",
      });
      return {
        text: `Kit segnato come pronto. Apri la preparazione: ${links.interviewPrepare(applicationId, interviewId)}`,
        structured: { interviewId, applicationId },
        invalidate: [{ kind: "interview", interviewId, applicationId }],
        auditSummary: `interview=${interviewId} kit=ready`,
      };
    }

    const { interviewId, applicationId, stage } = await confirmInterviewProposal(
      actor,
      input.id,
    );
    const invalidate: InvalidationRequest[] = [
      { kind: "interview", interviewId, applicationId },
      { kind: "interview_proposal", applicationId },
    ];
    if (stage?.changed) {
      invalidate.push({
        kind: "candidate",
        candidateId: stage.candidateId,
        positionId: stage.positionId,
        applicationId,
      });
    }

    return {
      text: `Colloquio pianificato. Nessuna email è stata inviata. Apri la preparazione: ${links.interviewPrepare(applicationId, interviewId)}`,
      structured: { interviewId, applicationId },
      invalidate,
      auditSummary: `proposal=${input.id} interview=${interviewId} scheduled`,
    };
  },
});

export const draftTools = [
  createPositionDraftTool,
  saveQuizDraftTool,
  saveQuizTool,
  getSchedulingOptionsTool,
  proposeInterviewSlotTool,
  getInterviewKitTool,
  saveInterviewKitDraftTool,
];

export const writeTools = [publishDraftTool];
