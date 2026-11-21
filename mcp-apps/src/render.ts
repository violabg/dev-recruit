/**
 * Rendering of the dev-recruit widgets from their models
 * (lib/mcp/widgets/types.ts). Flow-track look: header band with the section
 * stripe, stations on a line, rows on card surfaces.
 */

import type {
  ActionCenterWidget,
  ApplicationFlowWidget,
  DraftPreviewWidget,
  InterviewPrepWidget,
  PositionWidget,
  WidgetBadge,
  WidgetModel,
  WidgetRow,
  WidgetStation,
} from "../../lib/mcp/widgets/types";
import { h, type Child } from "./dom";

/** Outcome of an app-only tool call, as the widget needs it */
export interface ToolOutcome {
  ok: boolean;
  text: string;
  /** Widget model of the result, when the tool returns one */
  widget: unknown;
}

export interface WidgetActions {
  /** Open a dashboard page (through the host) */
  open(url: string): void;
  /** Send a follow-up request to the assistant */
  ask(text: string): void;
  /** Call a tool of the server (app-only confirmations) through the host */
  call(tool: string, args: Record<string, unknown>): Promise<ToolOutcome>;
}

/** Rows shown per list before the "open the rest in dev-recruit" button */
export const MAX_ROWS = 5;

const KINDS = new Set<WidgetModel["kind"]>([
  "action-center",
  "position",
  "application-flow",
  "draft-preview",
  "interview-prep",
]);

export function isWidgetModel(value: unknown): value is WidgetModel {
  return (
    typeof value === "object" &&
    value !== null &&
    KINDS.has((value as { kind?: unknown }).kind as WidgetModel["kind"])
  );
}

// ====================
// PIECES
// ====================

const badge = (value: WidgetBadge) =>
  h("span", { class: `badge tone-${value.tone}` }, value.label);

function openButton(actions: WidgetActions, url: string, label = "Apri") {
  return h(
    "button",
    {
      class: "btn btn-outline",
      attrs: { type: "button" },
      on: { click: () => actions.open(url) },
    },
    label,
  );
}

function band(
  eyebrow: string,
  title: string,
  aside: Child,
  ...below: Child[]
): HTMLElement {
  return h(
    "header",
    { class: "band" },
    h("p", { class: "eyebrow" }, `dev-recruit · ${eyebrow}`),
    h("div", { class: "band-title" }, h("h1", null, title), aside),
    ...below,
  );
}

function stations(items: WidgetStation[], label: string): HTMLElement {
  return h(
    "ol",
    { class: "track", attrs: { "aria-label": label } },
    ...items.map((station) =>
      h(
        "li",
        {
          class: `station is-${station.state}`,
          attrs: station.state === "current" ? { "aria-current": "step" } : {},
        },
        h("span", { class: "station-dot", attrs: { "aria-hidden": "true" } }),
        h("span", { class: "station-label" }, station.label),
        station.count !== undefined &&
          h("span", { class: "station-count" }, station.count),
      ),
    ),
  );
}

function row(item: WidgetRow, actions: WidgetActions): HTMLElement {
  return h(
    "li",
    { class: "row" },
    h(
      "div",
      { class: "row-main" },
      h(
        "p",
        { class: "row-title" },
        h("span", null, item.title),
        item.badge && badge(item.badge),
      ),
      item.meta && h("p", { class: "row-meta" }, item.meta),
    ),
    h(
      "div",
      { class: "row-actions" },
      item.ask &&
        h(
          "button",
          {
            class: "btn btn-ghost",
            attrs: { type: "button", title: "Chiedi all'assistente" },
            on: { click: () => actions.ask(item.ask!) },
          },
          "Dettagli",
        ),
      openButton(actions, item.url),
    ),
  );
}

function rows(
  items: WidgetRow[],
  actions: WidgetActions,
  empty: string,
  moreUrl: string,
): HTMLElement {
  if (!items.length) return h("p", { class: "empty" }, empty);
  const hidden = items.length - MAX_ROWS;
  return h(
    "div",
    null,
    h("ul", { class: "rows" }, ...items.slice(0, MAX_ROWS).map((item) => row(item, actions))),
    hidden > 0 &&
      h(
        "button",
        {
          class: "btn btn-link more",
          attrs: { type: "button" },
          on: { click: () => actions.open(moreUrl) },
        },
        `Altri ${hidden} in dev-recruit`,
      ),
  );
}

function section(title: string, count: number | null, ...children: Child[]) {
  return h(
    "section",
    { class: "card" },
    h(
      "h2",
      null,
      title,
      count !== null && h("span", { class: "count" }, count),
    ),
    ...children,
  );
}

function footer(actions: WidgetActions, url: string, label: string) {
  return h("footer", { class: "foot" }, openButton(actions, url, label));
}

// ====================
// WIDGETS
// ====================

function actionCenter(model: ActionCenterWidget, actions: WidgetActions) {
  const total = model.queues.reduce((sum, queue) => sum + queue.rows.length, 0);
  const pending = model.queues.filter((queue) => queue.rows.length);
  const clear = model.queues.filter((queue) => !queue.rows.length);

  return h(
    "div",
    { class: "widget" },
    band(
      model.mineOnly ? "Solo le mie" : "Tutto il team",
      model.title,
      h("span", { class: "total" }, total === 1 ? "1 azione" : `${total} azioni`),
      h(
        "ul",
        { class: "summary", attrs: { "aria-label": "Riepilogo" } },
        ...model.queues.map((queue) =>
          h(
            "li",
            { class: queue.rows.length ? "has-items" : "" },
            h("span", { class: "summary-count" }, queue.rows.length),
            h("span", null, queue.short),
          ),
        ),
      ),
    ),
    h(
      "main",
      { class: "body" },
      ...pending.map((queue) =>
        section(queue.title, queue.rows.length, rows(queue.rows, actions, queue.empty, model.url)),
      ),
      !pending.length && h("p", { class: "card empty" }, "Nessuna azione in attesa."),
      clear.length > 0 &&
        h(
          "p",
          { class: "clear" },
          `A posto: ${clear.map((queue) => queue.title.toLowerCase()).join(", ")}.`,
        ),
    ),
    footer(actions, model.url, "Apri Le mie azioni"),
  );
}

function position(model: PositionWidget, actions: WidgetActions) {
  const chips = (title: string, values: string[]) =>
    values.length > 0 &&
    h(
      "div",
      { class: "chips-block" },
      h("p", { class: "label" }, title),
      h("ul", { class: "chips" }, ...values.map((value) => h("li", null, value))),
    );

  return h(
    "div",
    { class: "widget" },
    band(
      "Posizione",
      model.title,
      badge(model.status),
      h(
        "dl",
        { class: "facts" },
        ...model.facts.flatMap((fact) => [
          h("dt", null, fact.label),
          h("dd", null, fact.value),
        ]),
      ),
    ),
    h(
      "main",
      { class: "body" },
      section(
        "Candidature per fase",
        null,
        stations(model.pipeline, "Candidature per fase"),
        model.closedCount > 0 &&
          h("p", { class: "note" }, `Chiuse (scartate o ritirate): ${model.closedCount}`),
      ),
      model.setup &&
        section(
          model.setup.complete ? "Setup completo" : "Setup da completare",
          null,
          h(
            "ul",
            { class: "checklist" },
            ...model.setup.steps.map((step) =>
              h(
                "li",
                { class: step.done ? "is-done" : "is-todo" },
                h("span", { class: "check", attrs: { "aria-hidden": "true" } }, step.done ? "✓" : ""),
                h("span", null, step.label),
                !step.done && openButton(actions, step.url, "Completa"),
              ),
            ),
          ),
        ),
      (model.skills.length > 0 || model.softSkills.length > 0) &&
        section(
          "Competenze",
          null,
          chips("Tecniche", model.skills),
          chips("Soft skill", model.softSkills),
        ),
      section(
        "Candidature",
        model.applications.length,
        rows(model.applications, actions, "Nessuna candidatura", model.url),
      ),
    ),
    footer(actions, model.url, "Apri la posizione"),
  );
}

function applicationFlow(model: ApplicationFlowWidget, actions: WidgetActions) {
  return h(
    "div",
    { class: "widget" },
    band(
      "Candidatura",
      model.candidateName,
      badge(model.stage),
      h(
        "p",
        { class: "band-meta" },
        `${model.positionTitle} · in fase dal ${model.stageSince} · responsabile ${model.owner}`,
      ),
      model.doNotContact &&
        h("p", { class: "alert", attrs: { role: "note" } }, "Candidato da non contattare"),
      model.track.length > 0 && stations(model.track, "Fasi della candidatura"),
    ),
    h(
      "main",
      { class: "body" },
      section(
        "Valutazioni",
        null,
        h("p", { class: "note" }, "Punteggi indicativi: la decisione è di una persona."),
        model.evaluations.length
          ? h(
              "ul",
              { class: "scores" },
              ...model.evaluations.map((evaluation) =>
                h(
                  "li",
                  null,
                  h("span", { class: "label" }, evaluation.label),
                  h("strong", null, evaluation.value),
                  evaluation.note && h("span", { class: "row-meta" }, evaluation.note),
                ),
              ),
            )
          : h("p", { class: "empty" }, "Nessuna valutazione"),
      ),
      section(
        "Decisione",
        null,
        h("p", null, model.decision.outcome),
        h("p", { class: model.decision.hidden ? "note" : "" }, model.decision.score),
        h("div", { class: "row-actions" }, openButton(actions, model.decision.url, "Apri la decisione")),
      ),
      section(
        "Colloqui",
        model.interviews.length,
        rows(model.interviews, actions, "Nessun colloquio", model.url),
      ),
    ),
    footer(actions, model.url, "Apri la candidatura"),
  );
}

function draftPreview(model: DraftPreviewWidget, actions: WidgetActions): HTMLElement {
  const status = h("p", { class: "note", attrs: { role: "status", "aria-live": "polite" } });

  const confirm =
    model.confirm &&
    h(
      "button",
      {
        class: "btn btn-confirm",
        attrs: { type: "button" },
        on: {
          click: async (event) => {
            const button = event.currentTarget as HTMLButtonElement;
            const { tool, arguments: args, label } = model.confirm!;
            button.disabled = true;
            button.textContent = "Conferma in corso…";
            status.className = "note";
            status.textContent = "";

            const outcome = await actions
              .call(tool, args)
              .catch(() => ({ ok: false, text: "Si è verificato un errore. Riprova.", widget: null }));

            if (outcome.ok && isWidgetModel(outcome.widget)) {
              container.replaceWith(renderWidget(outcome.widget, actions));
              return;
            }
            if (outcome.ok) {
              button.remove();
              status.className = "note is-success";
              status.textContent = outcome.text;
              return;
            }
            button.disabled = false;
            button.textContent = label;
            status.className = "note is-error";
            status.textContent = outcome.text;
          },
        },
      },
      model.confirm.label,
    );

  const container = h(
    "div",
    { class: "widget" },
    band(
      model.eyebrow,
      model.title,
      badge(model.status),
      model.facts.length > 0 &&
        h(
          "dl",
          { class: "facts" },
          ...model.facts.flatMap((fact) => [h("dt", null, fact.label), h("dd", null, fact.value)]),
        ),
    ),
    h(
      "main",
      { class: "body" },
      ...model.sections.map((part) =>
        section(
          part.title,
          null,
          h("ul", { class: "plain" }, ...part.items.map((item) => h("li", null, item))),
        ),
      ),
    ),
    h(
      "footer",
      { class: "confirm" },
      h("p", { class: "note" }, model.note),
      status,
      h(
        "div",
        { class: "row-actions" },
        model.url && openButton(actions, model.url, "Apri in dev-recruit"),
        confirm,
      ),
    ),
  );
  return container;
}

function interviewPrep(model: InterviewPrepWidget, actions: WidgetActions): HTMLElement {
  const kitBadge = badge(model.kit);
  const status = h("p", { class: "note", attrs: { role: "status", "aria-live": "polite" } });

  const markReady =
    model.markReady &&
    h(
      "button",
      {
        class: "btn btn-confirm",
        attrs: { type: "button" },
        on: {
          click: async (event) => {
            const button = event.currentTarget as HTMLButtonElement;
            const { tool, arguments: args, label } = model.markReady!;
            button.disabled = true;
            button.textContent = "Conferma in corso…";
            const outcome = await actions
              .call(tool, args)
              .catch(() => ({ ok: false, text: "Si è verificato un errore. Riprova.", widget: null }));
            if (outcome.ok) {
              button.remove();
              improve?.remove();
              kitBadge.className = "badge tone-done";
              kitBadge.textContent = "Kit pronto";
              status.className = "note is-success";
              status.textContent = outcome.text;
              return;
            }
            button.disabled = false;
            button.textContent = label;
            status.className = "note is-error";
            status.textContent = outcome.text;
          },
        },
      },
      model.markReady.label,
    );

  const improve = !model.improve
    ? null
    : h(
      "button",
      {
        class: "btn btn-outline",
        attrs: { type: "button" },
        on: { click: () => actions.ask(model.improve!) },
      },
      "Migliora con l'assistente",
    );

  const questionCount = model.outline.reduce((sum, part) => sum + part.questions, 0);

  return h(
    "div",
    { class: "widget" },
    band(
      "Preparazione colloquio",
      model.title,
      h("span", { class: "badges" }, badge(model.status), kitBadge),
      h(
        "dl",
        { class: "facts" },
        ...model.facts.flatMap((fact) => [h("dt", null, fact.label), h("dd", null, fact.value)]),
      ),
    ),
    h(
      "main",
      { class: "body" },
      model.outline.length > 0 &&
        section(
          "Scaletta",
          questionCount,
          h(
            "ol",
            { class: "outline" },
            ...model.outline.map((part) =>
              h(
                "li",
                null,
                h("span", null, part.title),
                h(
                  "span",
                  { class: "row-meta" },
                  `${part.questions} ${part.questions === 1 ? "domanda" : "domande"}${part.required ? `, ${part.required} obbligatori${part.required === 1 ? "a" : "e"}` : ""}`,
                ),
              ),
            ),
          ),
        ),
      model.briefing.length > 0 &&
        section("Briefing", null, h("ul", { class: "plain bullets" }, ...model.briefing.map((point) => h("li", null, point)))),
      model.hypotheses.length > 0 &&
        section(
          "Ipotesi da verificare",
          model.hypotheses.length,
          h(
            "ul",
            { class: "plain" },
            ...model.hypotheses.map((hypothesis) =>
              h(
                "li",
                null,
                hypothesis.criterion && h("span", { class: "label" }, hypothesis.criterion),
                h("p", null, hypothesis.hypothesis),
                h("p", { class: "row-meta" }, `Come verificarla: ${hypothesis.howToVerify}`),
              ),
            ),
          ),
        ),
      ...model.sections.map((part, index) =>
        h(
          "details",
          { class: "card fold", attrs: index === 0 ? { open: "" } : {} },
          h(
            "summary",
            null,
            h("span", null, part.title),
            h("span", { class: "count" }, part.items.length),
          ),
          part.items.length
            ? h(
                "ol",
                { class: "questions" },
                ...part.items.map((item) =>
                  h(
                    "li",
                    null,
                    h(
                      "p",
                      { class: "row-title" },
                      h("span", null, item.text),
                      item.required && h("span", { class: "badge tone-progress" }, "Obbligatoria"),
                    ),
                    item.followUps.length > 0 &&
                      h("ul", { class: "follow-ups" }, ...item.followUps.map((followUp) => h("li", null, followUp))),
                    item.criteria.length > 0 &&
                      h("ul", { class: "chips" }, ...item.criteria.map((criterion) => h("li", null, criterion))),
                  ),
                ),
              )
            : h("p", { class: "empty" }, "Nessuna domanda"),
        ),
      ),
      model.checklist.length > 0 &&
        section(
          "Checklist",
          null,
          ...model.checklist.map((group) =>
            h(
              "div",
              { class: "chips-block" },
              h("p", { class: "label" }, group.title),
              h(
                "ul",
                { class: "checklist" },
                ...group.items.map((row) =>
                  h(
                    "li",
                    { class: row.done ? "is-done" : "is-todo" },
                    h("span", { class: "check", attrs: { "aria-hidden": "true" } }, row.done ? "✓" : ""),
                    h("span", null, row.text),
                  ),
                ),
              ),
            ),
          ),
        ),
    ),
    h(
      "footer",
      { class: "confirm" },
      status,
      h(
        "div",
        { class: "row-actions" },
        openButton(actions, model.url, "Apri la preparazione"),
        improve,
        markReady,
      ),
    ),
  );
}

export function renderWidget(model: WidgetModel, actions: WidgetActions): HTMLElement {
  switch (model.kind) {
    case "interview-prep":
      return interviewPrep(model, actions);
    case "draft-preview":
      return draftPreview(model, actions);
    case "action-center":
      return actionCenter(model, actions);
    case "position":
      return position(model, actions);
    case "application-flow":
      return applicationFlow(model, actions);
  }
}

export function renderMessage(text: string): HTMLElement {
  return h("div", { class: "widget" }, h("p", { class: "card empty" }, text));
}
