import type { McpToolGroup } from "../config";
import { draftTools, writeTools } from "./drafts";
import { readTools } from "./read";
import type { McpToolDefinition } from "./types";

/** Every MCP tool */
export const ALL_TOOLS: readonly McpToolDefinition[] = [
  ...readTools,
  ...draftTools,
  ...writeTools,
];

/** Tools of the enabled groups only (phase gating) */
export function enabledTools(
  groups: readonly McpToolGroup[],
  tools: readonly McpToolDefinition[] = ALL_TOOLS,
): McpToolDefinition[] {
  return tools.filter((tool) => groups.includes(tool.group));
}
