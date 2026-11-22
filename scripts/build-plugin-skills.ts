/**
 * Writes the plugin's trigger skills (plugin/dev-recruit/skills/<name>/SKILL.md)
 * from the server workflows, and removes skills of workflows that no longer
 * exist. Run `pnpm build:plugin-skills` after changing a workflow's name,
 * description or when-to-use line; the steps stay on the server.
 */

import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pluginSkillMarkdown, WORKFLOWS } from "../lib/mcp/workflows";

const SKILLS = join(process.cwd(), "plugin", "dev-recruit", "skills");
const names = new Set<string>(WORKFLOWS.map((workflow) => workflow.name));

for (const entry of readdirSync(SKILLS)) {
  if (!names.has(entry)) rmSync(join(SKILLS, entry), { recursive: true });
}

for (const workflow of WORKFLOWS) {
  const dir = join(SKILLS, workflow.name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), pluginSkillMarkdown(workflow));
}

console.log(`Plugin skills written: ${WORKFLOWS.length}`);
