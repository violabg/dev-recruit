import { describe, expect, it } from "vitest";

import {
  MCP_AUDIT_STATUS_PRESENTATION,
  MCP_SCOPE_LABEL,
  getMcpAuditStatusPresentation,
  mcpScopeLabels,
} from "@/components/mcp/mcp-presentation";
import { MCP_SCOPES } from "@/lib/mcp/config";

describe("MCP presentation", () => {
  it("labels every scope in Italian", () => {
    expect(MCP_SCOPE_LABEL).toEqual({
      "recruit:read": "Leggere i dati della selezione",
      "recruit:draft": "Creare e modificare bozze",
      "recruit:write": "Pubblicare bozze confermate",
    });
    for (const scope of MCP_SCOPES) {
      expect(MCP_SCOPE_LABEL[scope]).toBeTruthy();
    }
  });

  it("labels the granted MCP scopes and omits the others", () => {
    expect(mcpScopeLabels(["recruit:read", "offline_access", "recruit:write"])).toEqual([
      "Leggere i dati della selezione",
      "Pubblicare bozze confermate",
    ]);
  });

  it("gives every audit status a label, a colour token and its tint", () => {
    expect(MCP_AUDIT_STATUS_PRESENTATION).toEqual({
      ok: { label: "Riuscita", token: "success", badge: "bg-success/10 text-success" },
      error: {
        label: "Errore",
        token: "destructive",
        badge: "bg-destructive/10 text-destructive",
      },
      denied: { label: "Negata", token: "warning", badge: "bg-warning/10 text-warning" },
    });
    for (const presentation of Object.values(MCP_AUDIT_STATUS_PRESENTATION)) {
      expect(presentation.label).toBeTruthy();
      expect(presentation.badge).toBe(`bg-${presentation.token}/10 text-${presentation.token}`);
    }
  });

  it("falls back to muted for an unknown status", () => {
    expect(getMcpAuditStatusPresentation("strange")).toEqual({
      label: "strange",
      badge: "bg-muted text-muted-foreground",
    });
    expect(getMcpAuditStatusPresentation("ok").label).toBe("Riuscita");
  });
});
