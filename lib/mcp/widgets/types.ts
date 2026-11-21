/**
 * Widget models: the presentation-ready data an MCP App widget draws, sent in
 * `structuredContent.widget` of the tool result. Labels, dates and links are
 * resolved on the server, so the widget bundle carries no domain logic.
 * Types only: the browser bundle imports this file too.
 */

/** Colour family of a badge or station, mapped to the stage tokens */
export type WidgetTone =
  | "pending"
  | "progress"
  | "done"
  | "cancelled"
  | "expired"
  | "muted"
  | "warning";

export interface WidgetBadge {
  label: string;
  tone: WidgetTone;
}

/** One row of a list: what, context, when, where to open it */
export interface WidgetRow {
  title: string;
  /** Secondary line, already joined */
  meta: string;
  badge?: WidgetBadge;
  url: string;
  /** Message the widget proposes to send to the assistant for this row */
  ask?: string;
}

/** One station of a flow line */
export interface WidgetStation {
  label: string;
  state: "done" | "current" | "todo";
  /** Count shown under the station (positions: applications per stage) */
  count?: number;
}

export interface ActionCenterWidget {
  kind: "action-center";
  title: string;
  mineOnly: boolean;
  queues: {
    key: "setup" | "tests" | "kits" | "scorecards" | "stale";
    title: string;
    /** Short label of the summary strip */
    short: string;
    empty: string;
    rows: WidgetRow[];
  }[];
  url: string;
}

export interface PositionWidget {
  kind: "position";
  title: string;
  status: WidgetBadge;
  facts: { label: string; value: string }[];
  skills: string[];
  softSkills: string[];
  setup: {
    complete: boolean;
    steps: { label: string; done: boolean; url: string }[];
  } | null;
  /** Open stages in order, with the applications in each */
  pipeline: WidgetStation[];
  /** Applications in a closed stage (rejected, withdrawn) */
  closedCount: number;
  applications: WidgetRow[];
  url: string;
}

export interface ApplicationFlowWidget {
  kind: "application-flow";
  candidateName: string;
  positionTitle: string;
  doNotContact: boolean;
  stage: WidgetBadge;
  stageSince: string;
  owner: string;
  /** The stage line; empty for a closed application (the badge says it) */
  track: WidgetStation[];
  evaluations: { label: string; value: string; note: string }[];
  decision: {
    outcome: string;
    score: string;
    hidden: boolean;
    url: string;
  };
  interviews: WidgetRow[];
  url: string;
}

/**
 * Preview of a draft with its confirmation. The confirm button calls an
 * app-only tool (hidden from the model), so only a person can confirm; the
 * server checks scope and permissions again.
 */
export interface DraftPreviewWidget {
  kind: "draft-preview";
  draft: "position" | "quiz" | "proposal";
  /** Eyebrow of the band: "Bozza di posizione", "Anteprima quiz", … */
  eyebrow: string;
  title: string;
  status: WidgetBadge;
  facts: { label: string; value: string }[];
  sections: { title: string; items: string[] }[];
  /** What the confirmation does, in one sentence */
  note: string;
  confirm: {
    label: string;
    tool: string;
    arguments: Record<string, unknown>;
  } | null;
  /** Dashboard page of the draft, once it exists */
  url: string | null;
}

export type WidgetModel =
  | ActionCenterWidget
  | PositionWidget
  | ApplicationFlowWidget
  | DraftPreviewWidget;

export type WidgetKind = WidgetModel["kind"];
