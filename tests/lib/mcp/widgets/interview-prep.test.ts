import { describe, expect, it } from "vitest";

import { formatDateTime } from "@/lib/mcp/render";
import type { McpInterviewPrepView } from "@/lib/mcp/views";
import { buildInterviewPrepWidget } from "@/lib/mcp/widgets/interview-prep";

const at = new Date("2026-11-25T09:00:00Z");

const view: McpInterviewPrepView = {
  id: "int-1",
  applicationId: "app-1",
  positionTitle: "Frontend",
  status: "scheduled",
  scheduledAt: at,
  durationMinutes: 60,
  round: 2,
  kitStatus: "draft",
  participantRoles: ["lead", "observer", "observer"],
  guideTitle: "Colloquio tecnico",
  briefing: ["Contesto"],
  sections: [
    {
      title: "Domande tecniche",
      kind: "technical",
      items: [
        { text: "Spiega il rendering", followUps: [], criteria: ["React"], required: true },
        { text: "Test", followUps: [], criteria: [], required: false },
      ],
    },
    { title: "Chiusura", kind: "closing", items: [] },
  ],
  hypotheses: [],
  checklist: [
    { category: "logistics", text: "Link della call", done: true },
    { category: "communicate", text: "Prossimi passi", done: false },
  ],
  url: "https://app.example/prep",
};

describe("buildInterviewPrepWidget", () => {
  it("resolves labels, the outline and the checklist groups in display order", () => {
    const widget = buildInterviewPrepWidget(view);

    expect(widget.title).toBe("Frontend · Round 2");
    expect(widget.status).toEqual({ label: "Pianificato", tone: "pending" });
    expect(widget.kit).toEqual({ label: "Kit in bozza", tone: "warning" });
    expect(widget.facts).toEqual([
      { label: "Quando", value: formatDateTime(at) },
      { label: "Durata", value: "60 minuti" },
      { label: "Guida", value: "Colloquio tecnico" },
      { label: "Partecipanti", value: "1 Conduttore, 2 Osservatori" },
    ]);
    expect(widget.outline).toEqual([
      { title: "Domande tecniche · Tecnica", questions: 2, required: 1 },
      // Title equal to the kind label: not repeated
      { title: "Chiusura", questions: 0, required: 0 },
    ]);
    expect(widget.checklist.map((group) => group.title)).toEqual(["Da comunicare", "Logistica"]);
  });

  it("offers improve and mark ready only for a draft kit of a scheduled interview", () => {
    expect(buildInterviewPrepWidget(view).markReady).toEqual({
      label: "Segna il kit come pronto",
      tool: "publish_draft",
      arguments: { kind: "kit", id: "int-1" },
    });
    expect(buildInterviewPrepWidget(view).improve).toContain("interviewId int-1");

    for (const changed of [
      { ...view, kitStatus: "ready" as const },
      { ...view, status: "completed" as const },
    ]) {
      const widget = buildInterviewPrepWidget(changed);
      expect(widget.markReady).toBeNull();
      expect(widget.improve).toBeNull();
    }
  });

  it("carries no candidate identity", () => {
    const text = JSON.stringify(buildInterviewPrepWidget(view));
    expect(text).not.toMatch(/candidate/i);
  });
});
