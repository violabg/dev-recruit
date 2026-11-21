/**
 * Read tools (scope recruit:read). They read the cached data layer only:
 * no write, no message to candidates, no in-app AI call (model work happens
 * in the user's client). A missing record and a record the actor may not see
 * give the same message.
 */

import { getActionCenterForUser, getApplicationsByPosition } from "@/lib/data/applications";
import { getPositionById, getPositions, getPositionSetupStatus } from "@/lib/data/positions";
import {
  actionCenterInputSchema,
  getApplicationInputSchema,
  getInterviewInputSchema,
  getPositionInputSchema,
  listInterviewsInputSchema,
  listPositionsInputSchema,
} from "@/lib/schemas";
import { UserError } from "@/lib/services/user-error";
import {
  renderActionCenter,
  renderApplication,
  renderInterview,
  renderInterviewList,
  renderPosition,
  renderPositionList,
} from "../render";
import {
  buildApplicationView,
  buildInterviewPrepView,
  buildInterviewRows,
} from "../views";
import { defineTool } from "./types";

const POSITIONS_PAGE_SIZE = 20;

export const actionCenterTool = defineTool({
  name: "action_center",
  title: "Le mie azioni",
  description:
    "Il lavoro che aspetta l'utente: posizioni da completare, test da valutare, colloqui senza kit pronto, schede da compilare, candidature ferme. Con mineOnly (predefinito) solo le proprie.",
  scope: "recruit:read",
  group: "read",
  inputSchema: actionCenterInputSchema,
  widget: "action-center",
  readOnly: true,
  async handler(actor, input) {
    const result = await getActionCenterForUser(actor.userId, {
      mineOnly: input.mineOnly,
      now: new Date(),
    });
    const { data, staleApplications } = result;
    return {
      text: renderActionCenter(result),
      structured: { ...data, staleApplications },
      auditSummary: `setup=${data.positionsWithIncompleteSetup.length} test=${data.assessmentsToEvaluate.length} kit=${data.interviewsWithoutKit.length} schede=${data.feedbackToFill.length} ferme=${staleApplications.length}`,
    };
  },
});

export const listPositionsTool = defineTool({
  name: "list_positions",
  title: "Elenco posizioni",
  description:
    "Le posizioni, filtrabili per titolo e stato (draft, open, closed, all), 20 per pagina.",
  scope: "recruit:read",
  group: "read",
  inputSchema: listPositionsInputSchema,
  readOnly: true,
  async handler(_actor, input) {
    const page = await getPositions({
      search: input.search,
      status: input.status,
      page: input.page,
      pageSize: POSITIONS_PAGE_SIZE,
    });
    return {
      text: renderPositionList(page),
      structured: {
        positions: page.positions.map((position) => ({
          id: position.id,
          title: position.title,
          status: position.status,
          experienceLevel: position.experienceLevel,
        })),
        totalCount: page.totalCount,
        currentPage: page.currentPage,
        totalPages: page.totalPages,
      },
      auditSummary: `count=${page.positions.length} total=${page.totalCount} page=${page.currentPage}`,
    };
  },
});

export const getPositionTool = defineTool({
  name: "get_position",
  title: "Dettaglio posizione",
  description:
    "Una posizione: descrizione, competenze, setup mancante e candidature per fase.",
  scope: "recruit:read",
  group: "read",
  inputSchema: getPositionInputSchema,
  widget: "position",
  readOnly: true,
  async handler(_actor, input) {
    const position = await getPositionById(input.positionId);
    if (!position) throw new UserError("Posizione non trovata");

    const [setup, applications] = await Promise.all([
      getPositionSetupStatus(position.id),
      getApplicationsByPosition(position.id),
    ]);

    return {
      text: renderPosition(position, setup, applications),
      structured: {
        position: {
          id: position.id,
          title: position.title,
          status: position.status,
          experienceLevel: position.experienceLevel,
          skills: position.skills,
          softSkills: position.softSkills,
          contractType: position.contractType,
          description: position.description,
        },
        setup,
        applications: applications.map((application) => ({
          id: application.id,
          stage: application.stage,
          stageChangedAt: application.stageChangedAt,
          candidateName:
            `${application.candidate.firstName} ${application.candidate.lastName}`.trim(),
        })),
      },
      auditSummary: `position=${position.id} applications=${applications.length}`,
    };
  },
});

export const getApplicationTool = defineTool({
  name: "get_application",
  title: "Dettaglio candidatura",
  description:
    "Una candidatura: candidato, posizione, fase, valutazioni (punteggi indicativi, sola lettura), decisione e colloqui. Il CV completo solo con includeCv: true.",
  scope: "recruit:read",
  group: "read",
  inputSchema: getApplicationInputSchema,
  widget: "application-flow",
  readOnly: true,
  async handler(actor, input) {
    const view = await buildApplicationView(actor, input.applicationId, {
      includeCv: input.includeCv,
    });
    if (!view) throw new UserError("Candidatura non trovata");

    return {
      text: renderApplication(view),
      structured: { application: view },
      auditSummary: `application=${view.id} cv=${input.includeCv ? (view.cvText ? "yes" : "unreadable") : "no"} hidden=${view.decision.hidden}`,
    };
  },
});

export const listInterviewsTool = defineTool({
  name: "list_interviews",
  title: "Elenco colloqui",
  description:
    "I colloqui pianificati e in corso (o tutti quelli di una candidatura con applicationId), filtrabili per data; con mineOnly solo quelli in cui l'utente partecipa o è responsabile.",
  scope: "recruit:read",
  group: "read",
  inputSchema: listInterviewsInputSchema,
  readOnly: true,
  async handler(actor, input) {
    const rows = await buildInterviewRows(actor, {
      applicationId: input.applicationId,
      mineOnly: input.mineOnly,
      from: input.from ? new Date(input.from) : undefined,
      to: input.to ? new Date(input.to) : undefined,
    });
    return {
      text: renderInterviewList(rows),
      structured: { interviews: rows },
      auditSummary: `count=${rows.length}`,
    };
  },
});

export const getInterviewTool = defineTool({
  name: "get_interview",
  title: "Preparazione colloquio",
  description:
    "La preparazione di un colloquio: quando, ruoli dei partecipanti, briefing, sezioni e domande del kit con criteri, ipotesi e checklist. Non contiene l'identità del candidato né il CV.",
  scope: "recruit:read",
  group: "read",
  inputSchema: getInterviewInputSchema,
  widget: "interview-prep",
  readOnly: true,
  async handler(actor, input) {
    const view = await buildInterviewPrepView(actor, input.interviewId);
    if (!view) throw new UserError("Colloquio non trovato");

    return {
      text: renderInterview(view),
      structured: { interview: view },
      auditSummary: `interview=${view.id} sections=${view.sections.length}`,
    };
  },
});

export const readTools = [
  actionCenterTool,
  listPositionsTool,
  getPositionTool,
  getApplicationTool,
  listInterviewsTool,
  getInterviewTool,
];
