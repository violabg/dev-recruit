import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ActionCenterWidget,
  ApplicationFlowWidget,
  DraftPreviewWidget,
  InterviewPrepWidget,
  PositionWidget,
  WidgetRow,
} from "@/lib/mcp/widgets/types";
import { isWidgetModel, MAX_ROWS, renderWidget } from "@/mcp-apps/src/render";

const actions = { open: vi.fn(), ask: vi.fn(), call: vi.fn() };

beforeEach(() => {
  actions.open.mockClear();
  actions.ask.mockClear();
  actions.call.mockReset();
});

const row = (title: string, extra: Partial<WidgetRow> = {}): WidgetRow => ({
  title,
  meta: "Frontend",
  url: `https://app.example/${title}`,
  ...extra,
});

const center = (rows: WidgetRow[]): ActionCenterWidget => ({
  kind: "action-center",
  title: "Le mie azioni",
  mineOnly: true,
  queues: [
    { key: "setup", title: "Posizioni con setup incompleto", short: "Posizioni", empty: "Tutte pronte", rows: [] },
    { key: "tests", title: "Test da valutare", short: "Test", empty: "Nessuno", rows },
    { key: "kits", title: "Colloqui senza kit pronto", short: "Kit", empty: "", rows: [] },
    { key: "scorecards", title: "Schede da compilare", short: "Schede", empty: "", rows: [] },
    { key: "stale", title: "Candidature ferme", short: "Ferme", empty: "", rows: [] },
  ],
  url: "https://app.example/dashboard",
});

const buttons = (element: HTMLElement, label: string) =>
  [...element.querySelectorAll("button")].filter((button) => button.textContent === label);

describe("isWidgetModel", () => {
  it("accepts the known kinds only", () => {
    expect(isWidgetModel({ kind: "position" })).toBe(true);
    expect(isWidgetModel({ kind: "draft-preview" })).toBe(true);
    expect(isWidgetModel({ kind: "interview-prep" })).toBe(true);
    expect(isWidgetModel({ kind: "unknown" })).toBe(false);
    expect(isWidgetModel(null)).toBe(false);
    expect(isWidgetModel("position")).toBe(false);
  });
});

describe("action center widget", () => {
  it("shows the total, the summary strip and only the queues with work", () => {
    const element = renderWidget(center([row("Ada")]), actions);

    expect(element.querySelector("h1")?.textContent).toBe("Le mie azioni");
    expect(element.querySelector(".total")?.textContent).toBe("1 azione");
    expect(element.querySelectorAll(".summary li")).toHaveLength(5);
    expect([...element.querySelectorAll("h2")].map((h2) => h2.firstChild?.textContent)).toEqual([
      "Test da valutare",
    ]);
    expect(element.querySelector(".clear")?.textContent).toContain("posizioni con setup incompleto");
  });

  it("keeps candidate text as text, never markup", () => {
    const element = renderWidget(center([row('<img src=x onerror="alert(1)">')]), actions);

    expect(element.querySelector("img")).toBeNull();
    expect(element.querySelector(".row-title span")?.textContent).toBe('<img src=x onerror="alert(1)">');
  });

  it("opens links and sends follow-ups through the host actions", () => {
    const element = renderWidget(center([row("Ada", { ask: "Mostrami Ada" })]), actions);

    buttons(element, "Apri")[0].click();
    expect(actions.open).toHaveBeenCalledWith("https://app.example/Ada");

    buttons(element, "Dettagli")[0].click();
    expect(actions.ask).toHaveBeenCalledWith("Mostrami Ada");

    buttons(element, "Apri Le mie azioni")[0].click();
    expect(actions.open).toHaveBeenLastCalledWith("https://app.example/dashboard");
  });

  it(`shows ${MAX_ROWS} rows and sends the rest to the dashboard`, () => {
    const many = Array.from({ length: MAX_ROWS + 2 }, (_, index) => row(`c${index}`));
    const element = renderWidget(center(many), actions);

    expect(element.querySelectorAll(".row")).toHaveLength(MAX_ROWS);
    const more = buttons(element, "Altri 2 in dev-recruit")[0];
    more.click();
    expect(actions.open).toHaveBeenCalledWith("https://app.example/dashboard");
  });

  it("says when nothing is waiting", () => {
    const element = renderWidget(center([]), actions);
    expect(element.textContent).toContain("Nessuna azione in attesa.");
    expect(element.querySelector(".total")?.textContent).toBe("0 azioni");
  });
});

describe("position widget", () => {
  const model: PositionWidget = {
    kind: "position",
    title: "Frontend",
    status: { label: "Aperta", tone: "done" },
    facts: [{ label: "Livello", value: "Senior" }],
    skills: ["React", "TypeScript"],
    softSkills: [],
    setup: {
      complete: false,
      steps: [
        { label: "Dettagli", done: true, url: "https://app.example/p?tab=dettagli" },
        { label: "Quiz", done: false, url: "https://app.example/p?tab=quiz" },
      ],
    },
    pipeline: [
      { label: "Candidato", state: "current", count: 2 },
      { label: "Screening", state: "todo", count: 0 },
    ],
    closedCount: 1,
    applications: [row("Ada", { badge: { label: "Candidato", tone: "pending" } })],
    url: "https://app.example/p",
  };

  it("draws the pipeline stations with their counts and the closed note", () => {
    const element = renderWidget(model, actions);

    const stations = element.querySelectorAll(".station");
    expect(stations).toHaveLength(2);
    expect(stations[0].getAttribute("aria-current")).toBe("step");
    expect(stations[0].querySelector(".station-count")?.textContent).toBe("2");
    expect(element.textContent).toContain("Chiuse (scartate o ritirate): 1");
    expect(element.querySelector(".badge.tone-done")?.textContent).toBe("Aperta");
  });

  it("offers to complete only the missing setup steps", () => {
    const element = renderWidget(model, actions);

    const complete = buttons(element, "Completa");
    expect(complete).toHaveLength(1);
    complete[0].click();
    expect(actions.open).toHaveBeenCalledWith("https://app.example/p?tab=quiz");
    expect([...element.querySelectorAll(".chips li")].map((chip) => chip.textContent)).toEqual([
      "React",
      "TypeScript",
    ]);
  });
});

describe("application flow widget", () => {
  const model: ApplicationFlowWidget = {
    kind: "application-flow",
    candidateName: "Ada Lovelace",
    positionTitle: "Frontend",
    doNotContact: true,
    stage: { label: "Test", tone: "progress" },
    stageSince: "20 nov 2026, 10:30",
    owner: "Paola",
    track: [
      { label: "Candidato", state: "done" },
      { label: "Test", state: "current" },
      { label: "Colloquio", state: "todo" },
    ],
    evaluations: [{ label: "CV", value: "8/10", note: "Procedere" }],
    decision: {
      outcome: "Nessun esito registrato",
      score: "Punteggio e decisione nascosti finché non invii la tua scheda",
      hidden: true,
      url: "https://app.example/a/decision",
    },
    interviews: [],
    url: "https://app.example/a",
  };

  it("shows the do-not-contact alert, the track and the advisory note", () => {
    const element = renderWidget(model, actions);

    expect(element.querySelector(".alert")?.textContent).toBe("Candidato da non contattare");
    expect([...element.querySelectorAll(".station")].map((station) => station.className)).toEqual([
      "station is-done",
      "station is-current",
      "station is-todo",
    ]);
    expect(element.textContent).toContain("la decisione è di una persona");
    expect(element.textContent).toContain("Nessun colloquio");
  });

  it("opens the decision page", () => {
    const element = renderWidget(model, actions);
    buttons(element, "Apri la decisione")[0].click();
    expect(actions.open).toHaveBeenCalledWith("https://app.example/a/decision");
  });

  it("has no track for a closed application", () => {
    const element = renderWidget({ ...model, track: [] }, actions);
    expect(element.querySelector(".track")).toBeNull();
  });
});

describe("draft preview widget", () => {
  const draft: DraftPreviewWidget = {
    kind: "draft-preview",
    draft: "position",
    eyebrow: "Bozza di posizione",
    title: "Frontend",
    status: { label: "Bozza", tone: "warning" },
    facts: [{ label: "Livello", value: "Senior" }],
    sections: [{ title: "Competenze", items: ["React"] }],
    note: "La posizione è salvata in bozza.",
    confirm: {
      label: "Pubblica la posizione",
      tool: "publish_draft",
      arguments: { kind: "position", id: "pos-1" },
    },
    url: "https://app.example/p",
  };

  const confirmButton = (element: HTMLElement) =>
    element.querySelector<HTMLButtonElement>(".btn-confirm")!;

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("calls the confirmation tool and draws the confirmed widget it returns", async () => {
    actions.call.mockResolvedValue({
      ok: true,
      text: "Posizione pubblicata",
      widget: { ...draft, status: { label: "Aperta", tone: "done" }, confirm: null },
    });
    const host = document.createElement("div");
    host.append(renderWidget(draft, actions));

    confirmButton(host).click();
    await flush();

    expect(actions.call).toHaveBeenCalledWith("publish_draft", { kind: "position", id: "pos-1" });
    expect(host.querySelector(".btn-confirm")).toBeNull();
    expect(host.querySelector(".badge")?.textContent).toBe("Aperta");
  });

  it("shows the refusal and lets the person try again", async () => {
    actions.call.mockResolvedValue({ ok: false, text: "La posizione non è una bozza", widget: null });
    const host = document.createElement("div");
    host.append(renderWidget(draft, actions));

    confirmButton(host).click();
    await flush();

    expect(host.querySelector(".is-error")?.textContent).toBe("La posizione non è una bozza");
    expect(confirmButton(host).disabled).toBe(false);
    expect(confirmButton(host).textContent).toBe("Pubblica la posizione");
  });

  it("shows the result text when the confirmation returns no widget", async () => {
    actions.call.mockResolvedValue({ ok: true, text: "Colloquio pianificato.", widget: undefined });
    const host = document.createElement("div");
    host.append(renderWidget(draft, actions));

    confirmButton(host).click();
    await flush();

    expect(host.querySelector(".is-success")?.textContent).toBe("Colloquio pianificato.");
    expect(host.querySelector(".btn-confirm")).toBeNull();
  });

  it("has no confirm button once confirmed", () => {
    const element = renderWidget({ ...draft, confirm: null }, actions);
    expect(element.querySelector(".btn-confirm")).toBeNull();
    expect(buttons(element, "Apri in dev-recruit")).toHaveLength(1);
  });
});

describe("interview prep widget", () => {
  const prep: InterviewPrepWidget = {
    kind: "interview-prep",
    title: "Frontend · Round 1",
    status: { label: "Pianificato", tone: "progress" },
    kit: { label: "Kit in bozza", tone: "warning" },
    facts: [{ label: "Quando", value: "25 nov 2026, 10:00" }],
    outline: [
      { title: "Tecnica", questions: 2, required: 1 },
      { title: "Chiusura", questions: 0, required: 0 },
    ],
    briefing: ["Ruolo nel team prodotto"],
    sections: [
      {
        title: "Tecnica",
        items: [
          { text: "Spiega il rendering", followUps: ["E lo streaming?"], criteria: ["React"], required: true },
          { text: "Test end-to-end", followUps: [], criteria: [], required: false },
        ],
      },
      { title: "Chiusura", items: [] },
    ],
    hypotheses: [{ criterion: "React", hypothesis: "Esperienza solida", howToVerify: "Chiedere un caso reale" }],
    checklist: [{ title: "Logistica", items: [{ text: "Link della call", done: true }] }],
    improve: "Aiutami a migliorare il kit (interviewId int-1).",
    markReady: { label: "Segna il kit come pronto", tool: "publish_draft", arguments: { kind: "kit", id: "int-1" } },
    url: "https://app.example/prep",
  };

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("shows outline, questions with follow-ups and criteria, hypotheses and checklist", () => {
    const element = renderWidget(prep, actions);

    expect(element.querySelector(".outline")?.textContent).toContain("2 domande, 1 obbligatoria");
    const folds = element.querySelectorAll("details");
    expect(folds).toHaveLength(2);
    expect(folds[0].hasAttribute("open")).toBe(true);
    expect(folds[1].hasAttribute("open")).toBe(false);
    expect(element.querySelector(".follow-ups")?.textContent).toBe("E lo streaming?");
    expect(element.textContent).toContain("Obbligatoria");
    expect(element.textContent).toContain("Come verificarla: Chiedere un caso reale");
    expect(element.querySelector(".checklist .is-done")?.textContent).toContain("Link della call");
  });

  it("asks the assistant to improve the kit", () => {
    const element = renderWidget(prep, actions);
    buttons(element, "Migliora con l'assistente")[0].click();
    expect(actions.ask).toHaveBeenCalledWith(prep.improve);
  });

  it("marks the kit ready through the confirmation tool and updates the badge", async () => {
    actions.call.mockResolvedValue({ ok: true, text: "Kit segnato come pronto.", widget: undefined });
    const host = document.createElement("div");
    host.append(renderWidget(prep, actions));

    buttons(host, "Segna il kit come pronto")[0].click();
    await flush();

    expect(actions.call).toHaveBeenCalledWith("publish_draft", { kind: "kit", id: "int-1" });
    expect(buttons(host, "Segna il kit come pronto")).toHaveLength(0);
    expect(buttons(host, "Migliora con l'assistente")).toHaveLength(0);
    expect([...host.querySelectorAll(".badge")].map((b) => b.textContent)).toContain("Kit pronto");
    expect(host.querySelector(".is-success")?.textContent).toBe("Kit segnato come pronto.");
  });

  it("offers neither improve nor mark ready on a kit that cannot change", () => {
    const element = renderWidget({ ...prep, improve: null, markReady: null }, actions);
    expect(buttons(element, "Segna il kit come pronto")).toHaveLength(0);
    expect(buttons(element, "Migliora con l'assistente")).toHaveLength(0);
    expect(buttons(element, "Apri la preparazione")).toHaveLength(1);
  });
});
