import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { MCP_SERVER_INSTRUCTIONS } from "@/lib/mcp/instructions";

const ROOT = process.cwd();
const PLUGIN = join(ROOT, "plugin", "dev-recruit");

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

/** Frontmatter fields and body of a Markdown file */
function parseMarkdown(path: string): { meta: Record<string, string>; body: string } {
  const text = readFileSync(path, "utf8");
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!match) return { meta: {}, body: text };
  const meta = Object.fromEntries(
    match[1].split("\n").flatMap((line) => {
      const separator = line.indexOf(":");
      return separator > 0
        ? [[line.slice(0, separator).trim(), line.slice(separator + 1).trim()]]
        : [];
    }),
  );
  return { meta, body: match[2] };
}

describe("dev-recruit plugin", () => {
  it("has a manifest named dev-recruit", () => {
    const manifest = readJson(join(PLUGIN, ".claude-plugin", "plugin.json"));

    expect(manifest.name).toBe("dev-recruit");
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.description).toBeTruthy();
  });

  it("connects to exactly one remote http MCP server over https, with no credential", () => {
    const config = readJson(join(PLUGIN, ".mcp.json"));

    expect(Object.keys(config)).toEqual(["mcpServers"]);
    const servers = Object.values(config.mcpServers) as Record<string, unknown>[];
    expect(servers).toHaveLength(1);
    expect(Object.keys(servers[0]).sort()).toEqual(["type", "url"]);
    expect(servers[0].type).toBe("http");
    expect(servers[0].url).toMatch(/^https:\/\/[^/]+\/api\/mcp$/);
    expect(servers[0].url).not.toMatch(/localhost|127\.0\.0\.1/);
  });

  it("has no hooks and no executable file", () => {
    expect(existsSync(join(PLUGIN, "hooks"))).toBe(false);
    for (const file of walk(PLUGIN)) {
      expect(relative(PLUGIN, file)).not.toMatch(/(^|\/)hooks\.json$/);
      expect(statSync(file).mode & 0o111).toBe(0);
      expect(file).not.toMatch(/\.(sh|js|mjs|cjs|ts|py|exe|bin)$/);
    }
  });

  it("gives every skill a name and a description in its frontmatter", () => {
    const skills = readdirSync(join(PLUGIN, "skills"));
    expect(skills).toEqual(expect.arrayContaining(["action-center", "quiz-for-candidate"]));

    for (const skill of skills) {
      const { meta } = parseMarkdown(join(PLUGIN, "skills", skill, "SKILL.md"));
      expect(meta.name).toBe(skill);
      expect(meta.description).toBeTruthy();
    }
  });

  it("has a recruiter agent that defers to the server instructions without copying them", () => {
    const agent = parseMarkdown(join(PLUGIN, "agents", "recruiter.md"));

    expect(agent.meta).toMatchObject({
      name: "recruiter",
      description: "Assistente per il lavoro di selezione in dev-recruit",
    });
    expect(agent.body).toMatch(/istruzioni/);
  });

  it("does not repeat the server instructions: every MCP client already receives them", () => {
    const rules = MCP_SERVER_INSTRUCTIONS.split("\n").filter((line) => line.startsWith("- "));

    for (const file of walk(PLUGIN).filter((path) => path.endsWith(".md"))) {
      const text = readFileSync(file, "utf8");
      for (const rule of rules) expect(text).not.toContain(rule);
    }
  });

  it("is listed by the repository marketplace", () => {
    const marketplace = readJson(join(ROOT, ".claude-plugin", "marketplace.json"));

    expect(marketplace.name).toBe("dev-recruit");
    expect(marketplace.owner.name).toBeTruthy();
    expect(marketplace.plugins).toEqual([
      expect.objectContaining({ name: "dev-recruit", source: "./plugin/dev-recruit" }),
    ]);
  });

  it("contains no developer skill of the repository agentic system", () => {
    const repositorySkills = existsSync(join(ROOT, ".claude", "skills"))
      ? readdirSync(join(ROOT, ".claude", "skills"))
      : [];
    const pluginSkills = readdirSync(join(PLUGIN, "skills"));

    for (const skill of repositorySkills) expect(pluginSkills).not.toContain(skill);
  });
});

describe("public content", () => {
  const SECRET_PATTERNS = [
    /sk-[A-Za-z0-9]{10,}/,
    /client_secret/i,
    /token=/i,
    /Bearer [A-Za-z0-9]/,
  ];

  const docs = readdirSync(join(ROOT, "docs"))
    .filter((name) => /^mcp.*\.md$/.test(name))
    .map((name) => join(ROOT, "docs", name));

  it.each([...walk(PLUGIN), ...docs].map((file) => [relative(ROOT, file), file]))(
    "%s holds no secret-like value",
    (_label, file) => {
      const text = readFileSync(file, "utf8");
      for (const pattern of SECRET_PATTERNS) expect(text).not.toMatch(pattern);
    },
  );
});
