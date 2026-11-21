import type { z } from "zod";
import type { McpActor } from "../auth";
import type { McpScope, McpToolGroup } from "../config";

export type WidgetId =
  | "action-center"
  | "position"
  | "application-flow"
  | "draft-preview"
  | "interview-prep";

/** A cache refresh the MCP wrapper applies with the route-handler helpers */
export type InvalidationRequest =
  | { kind: "position"; positionId: string }
  | { kind: "quiz"; quizId?: string; positionId: string }
  | { kind: "interview"; interviewId?: string; applicationId: string }
  | {
      kind: "candidate";
      candidateId: string;
      positionId: string;
      applicationId: string;
    }
  | { kind: "interview_proposal"; applicationId: string };

export interface McpToolResult {
  /** Italian plain text, usable without any widget */
  text: string;
  structured?: Record<string, unknown>;
  links?: { label: string; url: string }[];
  invalidate?: InvalidationRequest[];
  /** Ids, counts or codes for the audit log; never candidate text */
  auditSummary: string;
}

export interface McpToolDefinition<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  title: string;
  description: string;
  /** Exactly one scope; no scope implies another */
  scope: McpScope;
  group: McpToolGroup;
  inputSchema: S;
  widget?: WidgetId;
  readOnly: boolean;
  handler(actor: McpActor, input: z.infer<S>): Promise<McpToolResult>;
}

export function defineTool<S extends z.ZodTypeAny>(
  def: McpToolDefinition<S>,
): McpToolDefinition<S> {
  return def;
}
