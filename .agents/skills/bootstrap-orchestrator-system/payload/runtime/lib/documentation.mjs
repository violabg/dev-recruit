// Documentation templates and the light coverage check (contracts/documentation-templates.md).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, isAbsolute, join, resolve } from "node:path";
import { RuntimeError, arg, parseFrontmatter, requireString } from "./util.mjs";

const DIRECTIVE = /\(!#([\s\S]*?)#!\)/g;
const SLOT_HEADER = /^\s*!#\s*slot:\s*([^|\s]+)\s*\|\s*required:\s*(true|false)\s*/i;

function templateFolders(ctx, extra) {
  // Precedence from lowest to highest: user folder, workspace folder, extra folder.
  const folders = [
    { dir: join(ctx.userRoot, "documentation", "templates"), source: "user" },
    { dir: join(ctx.documentationRoot, "templates"), source: "workspace" },
  ];
  if (extra) folders.push({ dir: isAbsolute(extra) ? extra : resolve(ctx.workspaceRoot, extra), source: "extra" });
  return folders;
}

function parseDirectives(text) {
  const directives = [];
  for (const match of text.matchAll(DIRECTIVE)) {
    const inner = match[1];
    const header = inner.match(SLOT_HEADER);
    directives.push({
      slot: header ? header[1] : null,
      required: header ? header[2].toLowerCase() === "true" : true,
      text: (header ? inner.slice(header[0].length) : inner).trim(),
      raw: match[0],
      index: match.index,
    });
  }
  return directives;
}

function describe(path, source) {
  const content = readFileSync(path, "utf8");
  const { data, body } = parseFrontmatter(content);
  const first = parseDirectives(body)[0];
  const name = basename(path, ".md");
  return {
    name,
    mode: data.mode === "strict" ? "strict" : "flexible",
    source: name.startsWith("example-") ? "example" : source,
    path,
    description: first ? first.raw : (body.split("\n").find((l) => l.trim()) ?? ""),
  };
}

export function listTemplates(ctx, args) {
  const merged = new Map();
  for (const { dir, source } of templateFolders(ctx, arg(args, "templatesDirectory"))) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) merged.set(basename(file, ".md"), describe(join(dir, file), source));
  }
  return JSON.stringify([...merged.values()].sort((a, b) => a.name.localeCompare(b.name)), null, 2);
}

function resolveTemplate(ctx, nameOrPath, tool) {
  requireString(nameOrPath, "templateNameOrPath", tool);
  if (nameOrPath.endsWith(".md") || nameOrPath.includes("/") || nameOrPath.includes("\\")) {
    const path = isAbsolute(nameOrPath) ? nameOrPath : resolve(ctx.workspaceRoot, nameOrPath);
    if (!existsSync(path)) throw new RuntimeError(`${tool} failed: template file does not exist: ${path}`);
    return path;
  }
  let found = null;
  for (const { dir } of templateFolders(ctx)) {
    const path = join(dir, `${nameOrPath}.md`);
    if (existsSync(path)) found = path;
  }
  if (!found) throw new RuntimeError(`${tool} failed: template '${nameOrPath}' was not found; call documentation-templates-list.`);
  return found;
}

export function readTemplate(ctx, args) {
  return readFileSync(resolveTemplate(ctx, arg(args, "templateNameOrPath"), "documentation-template-read"), "utf8");
}

export function checkDocument(ctx, args) {
  const tool = "documentation-check";
  const template = readFileSync(resolveTemplate(ctx, arg(args, "templateNameOrPath"), tool), "utf8");
  let output = arg(args, "outputContent");
  const outputFile = arg(args, "outputFile");
  if (output === undefined && outputFile) output = readFileSync(isAbsolute(outputFile) ? outputFile : resolve(ctx.workspaceRoot, outputFile), "utf8");
  requireString(output, "outputContent", tool);
  const rawMode = String(arg(args, "mode") ?? "").toLowerCase();
  const mode = rawMode === "strict" ? "strict" : "flexible";
  const placeholders = parseDirectives(parseFrontmatter(template).body);
  const residuals = parseDirectives(output);
  const residualTexts = new Set(residuals.map((r) => r.text));
  const resolved = placeholders.filter((p) => !residualTexts.has(p.text));
  const required = placeholders.filter((p) => p.required);
  const requiredResolved = required.filter((p) => !residualTexts.has(p.text));
  const lineOf = (index) => output.slice(0, index).split("\n").length;
  const clean = residuals.length === 0 && requiredResolved.length === required.length;
  const verdict = clean ? "Ok" : mode === "strict" ? "Errors" : "Warnings";
  const ratio = (a, b) => (b === 0 ? 1 : Math.round((a / b) * 1000) / 1000);
  const messages = clean
    ? ["No residual placeholder remains in the output."]
    : [`${residuals.length} residual placeholder(s) remain in the output; ${mode === "strict" ? "strict mode treats them as errors" : "flexible mode treats them as warnings"}.`];
  return JSON.stringify(
    {
      mode,
      placeholders_total: placeholders.length,
      placeholders_resolved: resolved.length,
      coverage: ratio(resolved.length, placeholders.length),
      required_total: required.length,
      required_resolved: requiredResolved.length,
      required_coverage: ratio(requiredResolved.length, required.length),
      residual_count: residuals.length,
      verdict,
      residuals: residuals.map((r) => ({ slot: r.slot, required: r.required, text: r.text, line: lineOf(r.index) })),
      messages,
    },
    null,
    2,
  );
}
