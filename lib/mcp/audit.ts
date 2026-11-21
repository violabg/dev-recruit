/**
 * Audit log of MCP tool calls: one row per call, denied and failed calls
 * included. Candidate free text never reaches the log, and arguments are
 * capped. A failed write is logged and never changes the tool answer.
 */

import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/services/logger";
import { AUDIT_ARGUMENTS_MAX_BYTES } from "./config";

export type McpAuditStatus = "ok" | "error" | "denied";

export interface McpAuditEntry {
  userId: string | null;
  clientId: string | null;
  scopes: string[];
  tool: string;
  arguments: unknown;
  status: McpAuditStatus;
  summary: string;
}

const OMITTED = "[omesso]";

/** Keys whose values may hold candidate or interviewer free text */
const REDACTED_KEYS = new Set([
  "cv",
  "cvText",
  "answer",
  "answers",
  "notes",
  "evidence",
  "text",
  "followUps",
  "briefing",
  "hypotheses",
]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        REDACTED_KEYS.has(key) ? OMITTED : redact(entry),
      ]),
    );
  }
  // JSON cannot hold undefined, functions or bigints
  if (value === undefined || typeof value === "function") return null;
  if (typeof value === "bigint") return value.toString();
  return value;
}

/** First `maxBytes` bytes of a UTF-8 string, never splitting a character */
function utf8Prefix(text: string, maxBytes: number): string {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length <= maxBytes) return text;
  return new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.slice(0, maxBytes))
    .replace(/�+$/u, "");
}

/** Arguments ready for the log: candidate text omitted, at most 4 KB */
export function redactAuditArguments(args: unknown): Prisma.InputJsonValue {
  const redacted = redact(args ?? {}) ?? {};
  const json = JSON.stringify(redacted);

  if (new TextEncoder().encode(json).length > AUDIT_ARGUMENTS_MAX_BYTES) {
    return {
      truncated: true,
      preview: utf8Prefix(json, AUDIT_ARGUMENTS_MAX_BYTES),
    };
  }

  return redacted as Prisma.InputJsonValue;
}

export async function recordMcpAudit(entry: McpAuditEntry): Promise<void> {
  try {
    await prisma.mcpAuditLog.create({
      data: {
        userId: entry.userId,
        clientId: entry.clientId,
        scopes: entry.scopes,
        tool: entry.tool,
        arguments: redactAuditArguments(entry.arguments),
        status: entry.status,
        summary: entry.summary,
        channel: "mcp",
      },
    });
  } catch (error) {
    logger.error("MCP audit write failed", {
      tool: entry.tool,
      status: entry.status,
      userId: entry.userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
