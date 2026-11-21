import type { McpToolGroup } from "../config";
import { readTools } from "./read";
import type { McpToolDefinition } from "./types";

/** Every MCP tool; the draft and write tools join this list when they ship */
export const ALL_TOOLS: readonly McpToolDefinition[] = [...readTools];

/** Tools of the enabled groups only (phase gating) */
export function enabledTools(
  groups: readonly McpToolGroup[],
  tools: readonly McpToolDefinition[] = ALL_TOOLS,
): McpToolDefinition[] {
  return tools.filter((tool) => groups.includes(tool.group));
}
