import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MCP_SERVER_INSTRUCTIONS } from "@/lib/mcp/instructions";
import { ALL_TOOLS } from "@/lib/mcp/tools";
import { getWorkflowInputSchema, getWorkflowTool } from "@/lib/mcp/tools/workflows";
import { pluginSkillMarkdown, renderWorkflow, WORKFLOWS } from "@/lib/mcp/workflows";

const SKILLS = join(process.cwd(), "plugin", "dev-recruit", "skills");

/** Backticked snake_case names in the steps: tool names */
const toolNamesIn = (text: string) =>
  [...text.matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)].map((match) => match[1]);

describe("workflows", () => {
  it("have unique kebab-case names", () => {
    const names = WORKFLOWS.map((workflow) => workflow.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it.each(WORKFLOWS.map((workflow) => [workflow.name, workflow]))(
    "%s names only tools the model can call",
    (_name, workflow) => {
      const callable = new Set(ALL_TOOLS.filter((tool) => !tool.appOnly).map((tool) => tool.name));
      const named = toolNamesIn(workflow.steps);

      expect(named.length).toBeGreaterThan(0);
      for (const tool of named) expect(callable).toContain(tool);
    },
  );

  it("are announced by the server instructions through get_workflow", () => {
    expect(MCP_SERVER_INSTRUCTIONS).toContain("get_workflow");
  });
});

describe("get_workflow", () => {
  it("returns the steps of the named workflow", async () => {
    const result = await getWorkflowTool.handler(
      { userId: "u1", role: "user", clientId: "c1", scopes: ["recruit:read"], tokenId: "t1" },
      { name: "schedule-interview" },
    );

    expect(result.text).toBe(renderWorkflow(WORKFLOWS[3]));
    expect(result.text).toContain("propose_interview_slot");
    expect(result.auditSummary).toBe("workflow=schedule-interview");
  });

  it("refuses an unknown workflow in Italian", () => {
    const parsed = getWorkflowInputSchema.safeParse({ name: "boh" });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].message).toBe("Procedura sconosciuta");
  });
});

describe("plugin trigger skills", () => {
  it("exist for every workflow and nothing else", () => {
    expect(readdirSync(SKILLS).sort()).toEqual(WORKFLOWS.map((workflow) => workflow.name).sort());
  });

  it.each(WORKFLOWS.map((workflow) => [workflow.name, workflow]))(
    "%s is in sync with the server workflow (run pnpm build:plugin-skills)",
    (name, workflow) => {
      const skill = readFileSync(join(SKILLS, name, "SKILL.md"), "utf8");
      expect(skill).toBe(pluginSkillMarkdown(workflow));
    },
  );
});
