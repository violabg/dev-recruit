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
  draft: "position" | "quiz" | "proposal" | "kit";
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

/**
 * Preparation of an interview: no candidate identity, no CV (same rule as
 * get_interview). Mark ready is an app-only confirmation.
 */
export interface InterviewPrepWidget {
  kind: "interview-prep";
  title: string;
  status: WidgetBadge;
  kit: WidgetBadge;
  facts: { label: string; value: string }[];
  /** Scaletta: one entry per section */
  outline: { title: string; questions: number; required: number }[];
  briefing: string[];
  sections: {
    title: string;
    items: { text: string; followUps: string[]; criteria: string[]; required: boolean }[];
  }[];
  hypotheses: { criterion: string; hypothesis: string; howToVerify: string }[];
  checklist: { title: string; items: { text: string; done: boolean }[] }[];
  /** Follow-up request to improve the kit with the assistant, while editable */
  improve: string | null;
  markReady: { label: string; tool: string; arguments: Record<string, unknown> } | null;
  url: string;
}

export type WidgetModel =
  | InterviewPrepWidget
  | ActionCenterWidget
  | PositionWidget
  | ApplicationFlowWidget
  | DraftPreviewWidget;

export type WidgetKind = WidgetModel["kind"];

// ====================
// REACT WIDGETS (mcp-apps/react)
// ====================

/**
 * Form of a new position, prefilled with what the assistant knows. A person
 * completes it and saves the draft from the widget (create_position_draft),
 * then may publish it (publish_draft, app-only). Same fields and validation
 * as the dashboard form.
 */
export interface PositionFormWidget {
  kind: "position-form";
  prefill: {
    title: string;
    description: string;
    experienceLevel: string;
    skills: string[];
    softSkills: string[];
    contractType: string;
  };
  options: {
    allSkills: { label: string; value: string; category: string }[];
    allSoftSkills: { label: string; value: string }[];
    experienceLevels: string[];
    contractTypes: string[];
  };
  tools: { save: string; publish: string };
  /** Dashboard page of a new position */
  url: string;
}

/**
 * Generation parameters of a quiz for a position, the dashboard's fields
 * without the model choice (the assistant writes the questions). The widget
 * sends them to the assistant, which shows the preview (save_quiz_draft);
 * a person saves it from there.
 */
export interface QuizFormWidget {
  kind: "quiz-form";
  position: { id: string; title: string; experienceLevel: string; skills: string[] };
  prefill: {
    quizTitle: string;
    instructions: string;
    questionCount: number;
    difficulty: number;
    includeMultipleChoice: boolean;
    includeOpenQuestions: boolean;
    includeCodeSnippets: boolean;
    includeBehavioralScenarios: boolean;
    enableTimeLimit: boolean;
    timeLimit: number;
  };
  /** Tool the assistant calls with the questions */
  previewTool: string;
  /** Quiz tab of the position */
  url: string;
}

/**
 * Scheduling form of an interview, the dashboard's fields prefilled with
 * what the assistant proposed. "Pianifica colloquio" saves the proposal
 * (propose_interview_slot) and confirms it (publish_draft, app-only). No
 * email is sent.
 */
export interface ScheduleFormWidget {
  kind: "schedule-form";
  application: { id: string; candidateName: string; positionTitle: string };
  prefill: {
    guideId: string;
    round: number;
    /** ISO with offset, or "" when not proposed */
    scheduledAt: string;
    durationMinutes: number;
    meetingUrl: string;
    participants: { userId: string; role: "lead" | "observer" }[];
  };
  guides: { id: string; title: string; round: number; durationMinutes: number }[];
  teamMembers: { id: string; name: string }[];
  /** Pending proposals of the application, already formatted */
  pending: string[];
  tools: { propose: string; confirm: string };
  /** Scheduling page of the dashboard */
  url: string;
  /** Position page, where the interview guides are created */
  guidesUrl: string;
}

export type ReactWidgetModel = PositionFormWidget | QuizFormWidget | ScheduleFormWidget;
