import { describe, expect, it } from "vitest";

import { APP_URL } from "@/lib/mcp/config";
import { formatDateTime, HIDDEN_DECISION_TEXT } from "@/lib/mcp/render";
import type { McpApplicationView } from "@/lib/mcp/views";
import {
  buildActionCenterWidget,
  buildApplicationFlowWidget,
  buildPositionWidget,
  toneOf,
} from "@/lib/mcp/widgets/build";

const at = new Date("2026-11-20T09:30:00Z");

describe("toneOf", () => {
  it("reads the stage token, success and warning classes", () => {
    expect(toneOf("bg-stage-progress")).toBe("progress");
    expect(toneOf("bg-stage-cancelled/10 text-stage-cancelled")).toBe("cancelled");
    expect(toneOf("bg-success/10 text-success")).toBe("done");
    expect(toneOf("bg-warning/10 text-warning")).toBe("warning");
    expect(toneOf("bg-muted text-muted-foreground")).toBe("muted");
    expect(toneOf("bg-stage-unknown")).toBe("muted");
  });
});

describe("buildActionCenterWidget", () => {
  const result = {
    data: {
      assessmentsToEvaluate: [
        {
          assessmentId: "as-1",
          applicationId: "app-1",
          ownerId: "u1",
          candidateName: "Ada Lovelace",
          positionTitle: "Frontend",
          quizTitle: "React",
          completedAt: at,
        },
      ],
      openApplications: [],
      positionsWithIncompleteSetup: [
        { positionId: "pos-1", title: "Backend", status: "draft", missing: ["quiz", "guide"] },
      ],
      interviewsWithoutKit: [
        {
          interviewId: "int-1",
          applicationId: "app-2",
          ownerId: null,
          participantIds: [],
          candidateName: "Alan Turing",
          positionTitle: "Backend",
          round: 2,
          scheduledAt: at,
        },
      ],
      feedbackToFill: [],
    },
    staleApplications: [
      {
        applicationId: "app-3",
        ownerId: "u1",
        candidateName: "Grace Hopper",
        positionTitle: "Frontend",
        stage: "screening",
        stageChangedAt: at,
      },
    ],
  } as any;

  it("lists the five queues in the dashboard order, with Italian titles", () => {
    const widget = buildActionCenterWidget(result, true);

    expect(widget.kind).toBe("action-center");
    expect(widget.mineOnly).toBe(true);
    expect(widget.queues.map((queue) => queue.key)).toEqual([
      "setup",
      "tests",
      "kits",
      "scorecards",
      "stale",
    ]);
    expect(widget.url).toBe(`${APP_URL}/dashboard`);
  });

  it("resolves labels, tones and deep links per row", () => {
    const [setup, tests, kits, scorecards, stale] = buildActionCenterWidget(result, false).queues;

    expect(setup.rows[0]).toMatchObject({
      title: "Backend",
      meta: "Manca: Quiz, Guida colloquio",
      badge: { label: "Bozza", tone: "warning" },
      url: `${APP_URL}/dashboard/positions/pos-1`,
    });
    expect(tests.rows[0]).toMatchObject({
      title: "Ada Lovelace",
      meta: `Frontend · React · completato ${formatDateTime(at)}`,
      url: `${APP_URL}/dashboard/applications/app-1`,
    });
    expect(tests.rows[0].ask).toContain("applicationId app-1");
    expect(kits.rows[0]).toMatchObject({
      meta: `Backend · Round 2 · ${formatDateTime(at)}`,
      url: `${APP_URL}/dashboard/applications/app-2/interviews/int-1/prepare`,
    });
    expect(scorecards.rows).toEqual([]);
    expect(scorecards.empty).toBe("Tutte compilate");
    expect(stale.rows[0].badge).toEqual({ label: "Screening", tone: "progress" });
  });
});

describe("buildPositionWidget", () => {
  const position = {
    id: "pos-1",
    title: "Frontend",
    status: "open",
    experienceLevel: "Senior",
    contractType: null,
    skills: ["React"],
    softSkills: [],
  } as any;

  const application = (id: string, stage: string, name: string) =>
    ({
      id,
      stage,
      stageChangedAt: at,
      owner: { id: "u1", name: "Paola" },
      candidate: { id: `c-${id}`, firstName: name, lastName: "", email: "", doNotContact: false },
      assessmentCount: 0,
    }) as any;

  it("counts applications per open stage and keeps closed ones apart", () => {
    const widget = buildPositionWidget(position, null, [
      application("a1", "interview", "Ada"),
      application("a2", "applied", "Alan"),
      application("a3", "interview", "Grace"),
      application("a4", "rejected", "Linus"),
    ]);

    expect(widget.status).toEqual({ label: "Aperta", tone: "done" });
    expect(widget.pipeline.map((station) => [station.label, station.count, station.state])).toEqual([
      ["Candidato", 1, "current"],
      ["Screening", 0, "todo"],
      ["Test", 0, "todo"],
      ["Colloquio", 2, "current"],
      ["Decisione", 0, "todo"],
      ["Offerta", 0, "todo"],
    ]);
    expect(widget.closedCount).toBe(1);
    // Rows by stage order: applied first, rejected last
    expect(widget.applications.map((row) => row.title)).toEqual(["Alan", "Ada", "Grace", "Linus"]);
    expect(widget.applications[0].meta).toContain("responsabile Paola");
    expect(widget.facts).toEqual([
      { label: "Livello", value: "Senior" },
      { label: "Candidature", value: "4" },
    ]);
    expect(widget.setup).toBeNull();
  });

  it("links every setup step to its tab", () => {
    const widget = buildPositionWidget(
      position,
      {
        steps: [
          { key: "details", done: true },
          { key: "scorecard", done: false },
        ],
        missing: ["scorecard"],
        complete: false,
      },
      [],
    );

    expect(widget.setup).toEqual({
      complete: false,
      steps: [
        { label: "Dettagli", done: true, url: `${APP_URL}/dashboard/positions/pos-1?tab=dettagli` },
        {
          label: "Scheda di valutazione",
          done: false,
          url: `${APP_URL}/dashboard/positions/pos-1?tab=scheda`,
        },
      ],
    });
  });
});

describe("buildApplicationFlowWidget", () => {
  const view: McpApplicationView = {
    id: "app-1",
    candidate: { id: "c1", name: "Ada Lovelace", doNotContact: true },
    position: { id: "pos-1", title: "Frontend" },
    stage: "assessment",
    stageChangedAt: at,
    owner: null,
    evaluations: [
      { kind: "resume", fitScore: 8, quizScore: null, recommendation: "Procedere", createdAt: at, aiModel: null },
      { kind: "assessment", fitScore: null, quizScore: 72, recommendation: null, createdAt: at, aiModel: null },
    ],
    decision: { outcome: null, decidedAt: null, overallScore: null, hidden: true },
    interviews: [
      {
        id: "int-1",
        applicationId: "app-1",
        candidateName: "Ada Lovelace",
        positionTitle: "Frontend",
        status: "scheduled",
        scheduledAt: at,
        round: 1,
        kitStatus: null,
        participants: [{ userId: "u1", name: "Paola", role: "lead" as any }],
        url: `${APP_URL}/dashboard/applications/app-1/interviews/int-1/prepare`,
      },
    ],
    cvRequested: false,
    cvText: null,
    url: `${APP_URL}/dashboard/applications/app-1`,
    decisionUrl: `${APP_URL}/dashboard/applications/app-1/decision`,
  };

  it("draws the stage line with done, current and todo stations", () => {
    const widget = buildApplicationFlowWidget(view);

    expect(widget.track.map((station) => station.state)).toEqual([
      "done",
      "done",
      "current",
      "todo",
      "todo",
      "todo",
      "todo",
    ]);
    expect(widget.stage).toEqual({ label: "Test", tone: "progress" });
    expect(widget.owner).toBe("Nessuno");
    expect(widget.doNotContact).toBe(true);
  });

  it("keeps scores advisory and the hidden decision hidden", () => {
    const widget = buildApplicationFlowWidget(view);

    expect(widget.evaluations).toEqual([
      { label: "CV", value: "8/10", note: "Procedere" },
      { label: "Test", value: "72%", note: "" },
    ]);
    expect(widget.decision).toEqual({
      outcome: "Nessun esito registrato",
      score: HIDDEN_DECISION_TEXT,
      hidden: true,
      url: view.decisionUrl,
    });
    expect(widget.interviews[0]).toMatchObject({
      meta: "Nessun kit · Paola",
      url: view.interviews[0].url,
    });
    expect(widget.interviews[0].ask).toContain("interviewId int-1");
  });

  it("has no stage line for a closed application", () => {
    expect(buildApplicationFlowWidget({ ...view, stage: "withdrawn" }).track).toEqual([]);
  });

  it("never carries the CV text", () => {
    const widget = buildApplicationFlowWidget({ ...view, cvRequested: true, cvText: "testo del CV" });
    expect(JSON.stringify(widget)).not.toContain("testo del CV");
  });
});
