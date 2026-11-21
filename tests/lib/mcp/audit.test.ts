import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: { mcpAuditLog: { create: vi.fn() } },
}));

vi.mock("@/lib/services/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

import { AUDIT_ARGUMENTS_MAX_BYTES } from "@/lib/mcp/config";
import { recordMcpAudit, redactAuditArguments } from "@/lib/mcp/audit";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/services/logger";

const db = prisma as any;

const entry = {
  userId: "u1",
  clientId: "c1",
  scopes: ["recruit:read"],
  tool: "get_application",
  arguments: { applicationId: "app-1", includeCv: true },
  status: "ok" as const,
  summary: "application=app-1",
};

beforeEach(() => {
  db.mcpAuditLog.create.mockResolvedValue({ id: "log-1" });
});

describe("redactAuditArguments", () => {
  it("replaces candidate and interviewer free text at any depth", () => {
    const redacted = redactAuditArguments({
      applicationId: "app-1",
      cv: "Mario Rossi, nato il ...",
      items: [{ sectionId: "s1", text: "Domanda", followUps: ["perché?"] }],
      kit: { briefing: ["x"], hypotheses: [{ criterionId: "c1" }] },
      answers: { q1: "risposta" },
      notes: "note",
      evidence: "citazione",
      cvText: "testo",
      answer: "a",
    });

    expect(redacted).toEqual({
      applicationId: "app-1",
      cv: "[omesso]",
      items: [{ sectionId: "s1", text: "[omesso]", followUps: "[omesso]" }],
      kit: { briefing: "[omesso]", hypotheses: "[omesso]" },
      answers: "[omesso]",
      notes: "[omesso]",
      evidence: "[omesso]",
      cvText: "[omesso]",
      answer: "[omesso]",
    });
  });

  it("keeps ids and flags and never mutates the input", () => {
    const input = { applicationId: "app-1", includeCv: false, text: "x" };

    expect(redactAuditArguments(input)).toEqual({
      applicationId: "app-1",
      includeCv: false,
      text: "[omesso]",
    });
    expect(input.text).toBe("x");
  });

  it("truncates arguments over the byte limit with a preview", () => {
    const big = { search: "è".repeat(AUDIT_ARGUMENTS_MAX_BYTES) };

    const redacted = redactAuditArguments(big) as { truncated: boolean; preview: string };

    expect(redacted.truncated).toBe(true);
    expect(new TextEncoder().encode(redacted.preview).length).toBeLessThanOrEqual(
      AUDIT_ARGUMENTS_MAX_BYTES,
    );
    expect(redacted.preview.startsWith('{"search":"è')).toBe(true);
  });

  it("stores an empty object for missing arguments", () => {
    expect(redactAuditArguments(undefined)).toEqual({});
  });
});

describe("recordMcpAudit", () => {
  it("writes one row with every field and channel mcp", async () => {
    await recordMcpAudit(entry);

    expect(db.mcpAuditLog.create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        clientId: "c1",
        scopes: ["recruit:read"],
        tool: "get_application",
        arguments: { applicationId: "app-1", includeCv: true },
        status: "ok",
        summary: "application=app-1",
        channel: "mcp",
      },
    });
  });

  it("logs a failed write and never throws", async () => {
    db.mcpAuditLog.create.mockRejectedValue(new Error("db down"));

    await expect(recordMcpAudit(entry)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      "MCP audit write failed",
      expect.objectContaining({ tool: "get_application", error: "db down" }),
    );
  });
});
