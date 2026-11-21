import type { McpScope } from "@/lib/mcp/config";

/**
 * The single presentation module for MCP: scope labels (consent screen,
 * admin tables) and audit log statuses.
 */

export const MCP_SCOPE_LABEL: Record<McpScope, string> = {
  "recruit:read": "Leggere i dati della selezione",
  "recruit:draft": "Creare e modificare bozze",
  "recruit:write": "Pubblicare bozze confermate",
};

/** Labels of the granted MCP scopes; other scopes (offline_access) are omitted */
export function mcpScopeLabels(scopes: readonly string[]): string[] {
  return scopes.flatMap((scope) =>
    scope in MCP_SCOPE_LABEL ? [MCP_SCOPE_LABEL[scope as McpScope]] : [],
  );
}

export type McpAuditStatus = "ok" | "error" | "denied";

export const MCP_AUDIT_STATUS_PRESENTATION: Record<
  McpAuditStatus,
  {
    label: string;
    token: "success" | "destructive" | "warning";
    /** Tint classes for a badge */
    badge: string;
  }
> = {
  ok: { label: "Riuscita", token: "success", badge: "bg-success/10 text-success" },
  error: {
    label: "Errore",
    token: "destructive",
    badge: "bg-destructive/10 text-destructive",
  },
  denied: { label: "Negata", token: "warning", badge: "bg-warning/10 text-warning" },
};

/** Presentation of an audit status; an unknown status falls back to muted */
export function getMcpAuditStatusPresentation(status: string): {
  label: string;
  badge: string;
} {
  return (
    MCP_AUDIT_STATUS_PRESENTATION[status as McpAuditStatus] ?? {
      label: status,
      badge: "bg-muted text-muted-foreground",
    }
  );
}
