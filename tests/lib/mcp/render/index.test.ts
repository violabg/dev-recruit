import { describe, expect, it } from "vitest";

import { getApplicationStagePresentation } from "@/components/applications/application-stage";
import { QUEUE_TITLES } from "@/components/dashboard/action-center";
import {
  INTERVIEW_STATUS_PRESENTATION,
  KIT_STATUS_PRESENTATION,
  PARTICIPANT_ROLE_LABEL,
} from "@/components/interviews/interview-presentation";
import { getPositionStatusPresentation } from "@/components/positions/position-status";
import { APP_URL } from "@/lib/mcp/config";
import { links } from "@/lib/mcp/links";
import {
  HIDDEN_DECISION_TEXT,
  formatDateTime,
  renderActionCenter,
  renderApplication,
  renderInterview,
  renderInterviewList,
  renderPosition,
  renderPositionList,
} from "@/lib/mcp/render";
import type { McpApplicationView, McpInterviewPrepView, McpInterviewRow } from "@/lib/mcp/views";

const when = new Date("2026-11-24T09:30:00Z");
const lastLine = (text: string) => text.trimEnd().split("\n").at(-1);

const row: McpInterviewRow = {
  id: "int-1",
  applicationId: "app-1",
  candidateName: "Mario Rossi",
  positionTitle: "Dev",
  status: "scheduled",
  scheduledAt: when,
  round: 2,
  kitStatus: "ready",
  participants: [{ userId: "u1", name: "Laura", role: "lead" }],
  url: links.interviewPrepare("app-1", "int-1"),
};

const application: McpApplicationView = {
  id: "app-1",
  candidate: { id: "cand-1", name: "Mario Rossi", doNotContact: true },
  position: { id: "pos-1", title: "Dev" },
  stage: "interview",
  stageChangedAt: when,
  owner: null,
  evaluations: [
    { kind: "resume", fitScore: 8, quizScore: null, recommendation: "Procedere", createdAt: when, aiModel: null },
    { kind: "assessment", fitScore: null, quizScore: 72, recommendation: null, createdAt: when, aiModel: null },
  ],
  decision: { outcome: "offer", decidedAt: when, overallScore: 3.8, hidden: false },
  interviews: [row],
  cvRequested: false,
  cvText: null,
  url: links.application("app-1"),
  decisionUrl: links.applicationDecision("app-1"),
};

describe("formatDateTime", () => {
  it("formats in Italian, Europe/Rome", () => {
    expect(formatDateTime(when)).toBe(
      new Intl.DateTimeFormat("it-IT", {
        timeZone: "Europe/Rome",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(when),
    );
  });
});

describe("renderActionCenter", () => {
  it("lists every queue with the dashboard titles and ends with the home link", () => {
    const text = renderActionCenter({
      data: {
        positionsWithIncompleteSetup: [
          { positionId: "pos-1", title: "Ops", status: "draft", missing: ["quiz", "guide"] },
        ],
        assessmentsToEvaluate: [],
        openApplications: [],
        interviewsWithoutKit: [],
        feedbackToFill: [],
      },
      staleApplications: [],
    });

    for (const title of Object.values(QUEUE_TITLES)) expect(text).toContain(title);
    expect(text).toContain(`Ops (${getPositionStatusPresentation("draft").label}): manca Test, Traccia del colloquio`);
    expect(text).toContain("- Nessuno");
    expect(lastLine(text)).toBe(`Apri in dev-recruit: ${APP_URL}/dashboard`);
  });
});

describe("renderPositionList and renderPosition", () => {
  it("lists positions with status labels and links", () => {
    const text = renderPositionList({
      positions: [{ id: "pos-1", title: "Dev", status: "open", experienceLevel: "senior" } as any],
      totalCount: 21,
      currentPage: 1,
      totalPages: 2,
      hasNextPage: true,
      hasPrevPage: false,
    });

    expect(text).toContain(`Dev · ${getPositionStatusPresentation("open").label}`);
    expect(text).toContain(links.position("pos-1"));
    expect(text).toContain("pagina 1 di 2");
    expect(lastLine(text)).toBe(`Apri in dev-recruit: ${APP_URL}/dashboard/positions`);
  });

  it("renders one position with setup and applications per stage", () => {
    const text = renderPosition(
      {
        id: "pos-1",
        title: "Dev",
        status: "open",
        experienceLevel: "senior",
        skills: ["React"],
        softSkills: [],
        contractType: null,
        description: "Sviluppo",
      } as any,
      { steps: [], missing: ["scorecard"], complete: false },
      [{ stage: "screening" }, { stage: "screening" }] as any,
    );

    expect(text).toContain("Da completare: manca Criteri");
    expect(text).toContain(`- ${getApplicationStagePresentation("screening").label}: 2`);
    expect(lastLine(text)).toBe(`Apri in dev-recruit: ${links.position("pos-1")}`);
  });
});

describe("renderApplication", () => {
  it("shows stage, read-only scores, decision and interviews in Italian", () => {
    const text = renderApplication(application);

    expect(text).toContain("Attenzione: candidato da non contattare");
    expect(text).toContain(`Fase: ${getApplicationStagePresentation("interview").label}`);
    expect(text).toContain("- CV: 8/10 · Procedere");
    expect(text).toContain("- Test: 72%");
    expect(text).toContain("- Esito registrato: Offerta");
    expect(text).toContain("- Punteggio complessivo: 3.8");
    expect(text).toContain(INTERVIEW_STATUS_PRESENTATION.scheduled.label);
    expect(text).toContain(KIT_STATUS_PRESENTATION.ready.label);
    expect(text).not.toContain("CV:\n");
    expect(lastLine(text)).toBe(`Apri in dev-recruit: ${links.application("app-1")}`);
  });

  it("shows the hidden-decision text instead of the score", () => {
    const text = renderApplication({
      ...application,
      decision: { outcome: null, decidedAt: null, overallScore: null, hidden: true },
    });

    expect(text).toContain(HIDDEN_DECISION_TEXT);
    expect(text).not.toContain("Punteggio complessivo");
  });

  it("shows the CV block, or 'CV non leggibile' when it could not be read", () => {
    expect(
      renderApplication({ ...application, cvRequested: true, cvText: "<cv>\nX\n</cv>" }),
    ).toContain("CV:\n<cv>\nX\n</cv>");
    expect(renderApplication({ ...application, cvRequested: true, cvText: null })).toContain(
      "CV non leggibile",
    );
  });
});

describe("renderInterviewList and renderInterview", () => {
  it("lists interviews and ends with the agenda link", () => {
    const text = renderInterviewList([row]);

    expect(text).toContain("Colloqui: 1");
    expect(text).toContain("Round 2");
    expect(text).toContain(row.url);
    expect(lastLine(text)).toBe(`Apri in dev-recruit: ${links.agenda()}`);
  });

  it("renders the preparation with roles, sections and checklist, without names", () => {
    const view: McpInterviewPrepView = {
      id: "int-1",
      applicationId: "app-1",
      positionTitle: "Dev",
      status: "scheduled",
      scheduledAt: when,
      durationMinutes: 60,
      round: 1,
      kitStatus: "draft",
      participantRoles: ["lead", "observer"],
      guideTitle: "Tecnico",
      briefing: ["Punto"],
      sections: [
        {
          title: "Tecnica",
          kind: "technical",
          items: [{ text: "Stato?", followUps: ["Perché?"], criteria: ["React"], required: true }],
        },
      ],
      hypotheses: [{ criterion: "React", hypothesis: "Ipotesi", howToVerify: "Chiedi" }],
      checklist: [{ category: "communicate", text: "RAL e benefit", done: true }],
      url: links.interviewPrepare("app-1", "int-1"),
    };

    const text = renderInterview(view);

    expect(text).toContain(
      `Partecipanti: ${PARTICIPANT_ROLE_LABEL.lead}, ${PARTICIPANT_ROLE_LABEL.observer}`,
    );
    expect(text).toContain("Tecnica (Tecnica)");
    expect(text).toContain("- Stato? (obbligatoria) · criteri: React");
    expect(text).toContain("  - Perché?");
    expect(text).toContain("- React: Ipotesi · come verificarla: Chiedi");
    expect(text).toContain("- [x] RAL e benefit");
    expect(lastLine(text)).toBe(`Apri in dev-recruit: ${view.url}`);
  });
});
