// Small dependency-free helpers shared by the installer modules.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, posix, relative, resolve } from "node:path";

export class InstallError extends Error {}

export const sha256 = (text) => createHash("sha256").update(text).digest("hex");
export const readText = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
export const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

export function writeText(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

export function listFiles(dir) {
  const out = [];
  const walk = (current) => {
    for (const entry of readdirSync(current)) {
      const path = join(current, entry);
      if (statSync(path).isDirectory()) walk(path);
      else out.push(relative(dir, path).split("\\").join("/"));
    }
  };
  if (existsSync(dir)) walk(dir);
  return out.sort();
}

// A location is "outside" the repository when it starts with `~`, is absolute, or climbs out with `..`.
export const isOutside = (location) => location.startsWith("~") || isAbsolute(location) || location.split("/")[0] === "..";

export const expandHome = (path) => (path === "~" || path.startsWith("~/") ? join(homedir(), path.slice(1)) : path);

// Absolute file-system path of an output: repository-relative paths resolve against the repo, `~` paths
// against the home folder of whoever runs the installer.
export const absolutePath = (repo, path) => (isOutside(path) ? resolve(expandHome(path)) : join(repo, path));

// The config.json value for a location, relative to the runtime root when it lives in the repository.
export function runtimeRelative(runtimeRoot, location) {
  if (isOutside(location)) return location;
  // Both are repository-relative; anchor them on a fixed root so the result never depends on the cwd.
  const rel = posix.relative(posix.join("/repo", runtimeRoot), posix.join("/repo", location));
  return rel === "" ? "." : rel;
}

// Fills `{{SLOT}}` placeholders. Unknown placeholders (e.g. design element names like `{{O1.2}}`) stay.
export function fillSlots(text, values) {
  return text.replace(/\{\{([A-Z][A-Z0-9_]*)\}\}/g, (match, name) => (name in values ? values[name] : match));
}

export function splitFrontmatter(text) {
  if (!text.startsWith("---\n")) return { frontmatter: "", body: text };
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) throw new InstallError("unterminated frontmatter");
  return { frontmatter: text.slice(4, end), body: text.slice(end + 5) };
}

// YAML emitter for the flat or one-level-nested frontmatter the client formats use.
function yamlScalar(value) {
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return JSON.stringify(String(value));
}

export function yamlFrontmatter(fields) {
  const lines = [];
  const emit = (key, value, indent) => {
    const pad = " ".repeat(indent);
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) lines.push(`${pad}${key}: [${value.map(yamlScalar).join(", ")}]`);
    else if (typeof value === "object") {
      lines.push(`${pad}${key}:`);
      for (const [k, v] of Object.entries(value)) emit(/^[A-Za-z0-9_-]+$/.test(k) ? k : JSON.stringify(k), v, indent + 2);
    } else lines.push(`${pad}${key}: ${yamlScalar(value)}`);
  };
  for (const [key, value] of Object.entries(fields)) emit(key, value, 0);
  return `---\n${lines.join("\n")}\n---\n`;
}

export function tomlString(value) {
  return JSON.stringify(String(value));
}

// A TOML multi-line literal keeps the body byte for byte; a body containing ''' falls back to a basic string.
export function tomlMultiline(value) {
  if (!value.includes("'''")) return `'''\n${value}'''`;
  return `"""\n${value.replace(/\\/g, "\\\\").replace(/"""/g, '""\\"')}"""`;
}

// Deep-merges `additions` into `target` without removing anything: objects merge, arrays gain missing items,
// equal scalars pass. Returns the list of conflicting key paths (a scalar the target already sets differently).
export function mergeInto(target, additions, path = []) {
  const conflicts = [];
  for (const [key, value] of Object.entries(additions)) {
    const here = [...path, key];
    if (!(key in target)) target[key] = structuredClone(value);
    else if (Array.isArray(value) && Array.isArray(target[key])) {
      for (const item of value) if (!target[key].some((existing) => JSON.stringify(existing) === JSON.stringify(item))) target[key].push(item);
    } else if (value && typeof value === "object" && !Array.isArray(value) && target[key] && typeof target[key] === "object" && !Array.isArray(target[key])) {
      conflicts.push(...mergeInto(target[key], value, here));
    } else if (JSON.stringify(target[key]) !== JSON.stringify(value)) conflicts.push(here.join("."));
  }
  return conflicts;
}

// True when every addition is already present in `target`.
export function contains(target, additions) {
  const copy = structuredClone(target);
  const conflicts = mergeInto(copy, additions);
  return conflicts.length === 0 && JSON.stringify(copy) === JSON.stringify(target);
}
