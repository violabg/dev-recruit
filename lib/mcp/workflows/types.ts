/**
 * A dev-recruit workflow: the steps the assistant follows for one task. It is
 * served by the MCP server as a prompt (picked by the user) and by the
 * get_workflow tool (called by the model); the plugin's trigger skills are
 * generated from it.
 */
export interface McpWorkflow {
  /** kebab-case: prompt name, get_workflow argument and plugin skill name */
  name: string;
  /** Short Italian title shown in the client's prompt menu */
  title: string;
  /** One line: what the workflow does (prompt and skill description) */
  description: string;
  /** When the assistant uses it */
  whenToUse: string;
  /** Italian Markdown steps; tool names in backticks */
  steps: string;
}
