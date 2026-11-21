import { describe, expect, it } from "vitest";
import { z } from "zod";

import { MCP_ENABLED_TOOL_GROUPS } from "@/lib/mcp/config";
import { ALL_TOOLS, enabledTools } from "@/lib/mcp/tools";
import { defineTool, type McpToolDefinition } from "@/lib/mcp/tools/types";

const stub = (name: string, group: McpToolDefinition["group"]) =>
  defineTool({
    name,
    title: name,
    description: name,
    scope: group === "read" ? "recruit:read" : group === "draft" ? "recruit:draft" : "recruit:write",
    group,
    inputSchema: z.object({}),
    readOnly: group === "read",
    handler: async () => ({ text: "", auditSummary: "" }),
  });

describe("enabledTools", () => {
  const tools = [stub("read_one", "read"), stub("draft_one", "draft"), stub("write_one", "write")];

  it("keeps only the tools of the enabled groups", () => {
    expect(enabledTools(["read"], tools).map((tool) => tool.name)).toEqual(["read_one"]);
    expect(enabledTools(["read", "draft"], tools).map((tool) => tool.name)).toEqual([
      "read_one",
      "draft_one",
    ]);
    expect(enabledTools([], tools)).toEqual([]);
  });

  it("serves only read tools in the current phase", () => {
    expect(MCP_ENABLED_TOOL_GROUPS).toEqual(["read"]);
    const served = enabledTools(MCP_ENABLED_TOOL_GROUPS);
    expect(served.length).toBe(ALL_TOOLS.length);
    expect(served.every((tool) => tool.group === "read" && tool.readOnly)).toBe(true);
  });

  it("gives every tool exactly one scope matching its group", () => {
    const scopeOfGroup = { read: "recruit:read", draft: "recruit:draft", write: "recruit:write" };
    for (const tool of ALL_TOOLS) {
      expect(tool.scope).toBe(scopeOfGroup[tool.group]);
    }
  });
});
