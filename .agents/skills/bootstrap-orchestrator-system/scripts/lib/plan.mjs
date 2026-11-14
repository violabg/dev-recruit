// Compares the rendered outputs with the target repository and its manifest, then applies an approved plan.
//
// Actions: create, update, unchanged, merge (a customizable file was edited by hand and the kit changed it),
// conflict (a non-customizable file was edited by hand, or an unmanaged file is in the way), delete (a file
// the previous install wrote and nothing renders any more). merge and conflict need --take or --keep.
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, rmSync, rmdirSync, symlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { skillFolders } from "./answers.mjs";
import { LEGACY_ROOTS } from "./migrate.mjs";
import { render } from "./render.mjs";
import { InstallError, absolutePath, contains, isOutside, mergeInto, readText, sha256, writeText } from "./util.mjs";

const markers = {
  html: ["<!-- agentic-system:start -->", "<!-- agentic-system:end -->"],
  hash: ["# agentic-system:start", "# agentic-system:end"],
};

function readBlock(text, syntax) {
  const [start, end] = markers[syntax];
  const from = text.indexOf(`${start}\n`);
  const to = text.indexOf(`${end}`, from);
  if (from === -1 || to === -1) return null;
  return { content: text.slice(from + start.length + 1, to), before: text.slice(0, from), after: text.slice(to + end.length) };
}

function writeBlock(text, syntax, content) {
  const [start, end] = markers[syntax];
  const block = `${start}\n${content}${end}`;
  const existing = text === null ? null : readBlock(text, syntax);
  if (existing) return `${existing.before}${block}${existing.after}`;
  if (text === null || text === "") return `${block}\n`;
  return `${text.endsWith("\n") ? text : `${text}\n`}\n${block}\n`;
}

function removeBlock(text, syntax) {
  const block = readBlock(text, syntax);
  return block ? `${block.before}${block.after.replace(/^\n/, "")}` : text;
}

export function manifestPath(repo, answers) {
  return join(repo, answers.locations.maintenanceRoot, "manifest.json");
}

export function loadManifest(repo, answers) {
  const path = manifestPath(repo, answers);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : { version: 1, files: {} };
}

const lstat = (path) => lstatSync(path, { throwIfNoEntry: false });

// The nearest symlink on the way to a path in the repository, the path itself included. The installer never
// writes through one: it could change files that belong to another system.
function symlinkOnPath(repo, path) {
  if (isOutside(path)) return null;
  const segments = path.split("/");
  for (let i = 1; i <= segments.length; i++) {
    const prefix = segments.slice(0, i).join("/");
    if (lstat(join(repo, prefix))?.isSymbolicLink()) return prefix;
  }
  return null;
}

const filesUnder = (dir, prefix) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((item) => (item.isDirectory() ? filesUnder(join(dir, item.name), `${prefix}/${item.name}`) : [`${prefix}/${item.name}`]));

// The current state of one output in the target: the comparable content, or null when absent.
function current(repo, output) {
  const path = absolutePath(repo, output.path);
  if (output.mode === "symlink") {
    const stat = lstat(path);
    if (!stat) return { exists: false, value: null, text: null };
    return stat.isSymbolicLink() ? { exists: true, value: readlinkSync(path), text: null } : { exists: true, value: null, text: null, realFolder: stat.isDirectory() };
  }
  if (!existsSync(path)) return { exists: false, value: null, text: null };
  const text = readText(path);
  if (output.mode === "block") return { exists: true, value: readBlock(text, output.syntax)?.content ?? null, text };
  if (output.mode === "json-merge") {
    try {
      return { exists: true, value: JSON.parse(text), text };
    } catch {
      return { exists: true, value: undefined, text, unparseable: true };
    }
  }
  return { exists: true, value: text, text };
}

export function plan(kit, answers, repo) {
  const { outputs, errors, warnings } = render(kit, answers);
  const manifest = loadManifest(repo, answers);
  const entries = [];
  const rendered = new Set(outputs.map((o) => o.path));
  for (const output of outputs) {
    const state = current(repo, output);
    const recorded = manifest.files[output.path];
    let action;
    let reason = "";
    const link = output.mode === "symlink" ? (output.path.includes("/") ? symlinkOnPath(repo, dirname(output.path)) : null) : symlinkOnPath(repo, output.path);
    if (link) errors.push(`${output.path}: ${link} is a symlink; the installer never writes through one. Remove it or choose another folder`);
    if (output.mode === "symlink") {
      output.sha256 = sha256(output.target);
      if (state.realFolder) {
        // A folder whose files were all installed here becomes the link once they are deleted.
        const owned = filesUnder(absolutePath(repo, output.path), output.path).every((file) => manifest.files[file] && !rendered.has(file));
        [action, reason] = owned ? ["create", "replaces the client-specific copy"] : ["conflict", "a folder the agentic system did not write is in the way; move it first"];
      } else if (!state.exists) action = "create";
      else if (state.value === null) [action, reason] = ["conflict", "a file is in the way"];
      else if (state.value === output.target) action = "unchanged";
      else if (recorded && sha256(state.value) === recorded.sha256) action = "update";
      else [action, reason] = ["conflict", `a symlink to ${state.value} is already there`];
    } else if (output.mode === "json-merge") {
      const hash = sha256(JSON.stringify(output.add));
      output.sha256 = hash;
      if (state.unparseable) [action, reason] = ["conflict", "the settings file is not plain JSON; add the entries by hand"];
      else if (!state.exists) action = "create";
      else if (contains(state.value, output.add)) action = "unchanged";
      else {
        const conflicts = mergeInto(structuredClone(state.value), output.add);
        [action, reason] = conflicts.length ? ["conflict", `already set differently: ${conflicts.join(", ")}`] : ["update", ""];
      }
    } else {
      const hash = sha256(output.content);
      output.sha256 = hash;
      const onDisk = state.value === null ? null : sha256(state.value);
      if (output.mode === "block" && output.conflictsWith && state.text) {
        const outside = state.value === null ? state.text : state.text.replace(state.value, "");
        if (output.conflictsWith.test(outside)) {
          entries.push({ ...output, action: "conflict", reason: "the file already defines this table outside the managed block; merge it by hand" });
          continue;
        }
      }
      if (onDisk === null) action = state.exists && output.mode === "file" ? "conflict" : "create";
      else if (onDisk === hash) action = "unchanged";
      else if (recorded && onDisk === recorded.keptSha256 && hash === recorded.sha256) [action, reason] = ["unchanged", "local customization kept"];
      else if (recorded && onDisk === recorded.sha256) action = "update";
      else action = output.customizable ? "merge" : "conflict";
      if (action === "conflict" && !reason) reason = recorded ? "edited by hand since the last install" : "a file the agentic system did not write is already there";
      if (action === "merge") reason = "edited by hand; compare the baseline, the current file and the new render";
    }
    entries.push({ ...output, action, reason });
  }
  for (const [path, recorded] of Object.entries(manifest.files)) {
    if (rendered.has(path) || recorded.mode === "json-merge") continue;
    if (symlinkOnPath(repo, dirname(path)) && recorded.mode !== "symlink") continue;
    const state = current(repo, { path, mode: recorded.mode, syntax: recorded.syntax });
    if (state.value === null) continue;
    const untouched = sha256(state.value) === recorded.sha256;
    entries.push({ path, mode: recorded.mode, syntax: recorded.syntax, kind: recorded.kind, envs: recorded.envs ?? [], action: untouched ? "delete" : "conflict", reason: untouched ? "no longer installed" : "no longer installed, but edited by hand" });
  }
  entries.sort((a, b) => a.path.localeCompare(b.path));
  const duplicates = duplicateSkills(kit, answers, repo, rendered, manifest);
  const hiddenRoots = LEGACY_ROOTS.filter((root) => existsSync(join(repo, root)));
  for (const problem of [...duplicates, ...hiddenRoots.map((root) => `${root}/ is a hidden system folder that is still in the repository; finish the migration (install.mjs migrate)`)]) warnings.push(problem);
  return { entries, errors, warnings, manifest, duplicates, hiddenRoots };
}

// A copy of a workflow skill outside the shared folder that nothing will remove. Discovery precedence could load it
// instead of the authoritative body, so it is reported, and only the user removes it.
function duplicateSkills(kit, answers, repo, rendered, manifest) {
  const { folder, clients } = answers.skillSharing;
  const found = new Set();
  for (const env of answers.environments.filter((e) => clients[e.id].via !== "copy")) {
    for (const dir of skillFolders(env.profile).filter((d) => d !== folder)) {
      for (const skill of kit.index.skills) {
        const path = `${dir}/${skill.name}`;
        const stat = lstat(join(repo, path));
        if (!stat || rendered.has(path)) continue;
        if (stat.isSymbolicLink() && resolve(repo, dir, readlinkSync(join(repo, path))) === resolve(repo, folder, skill.name)) continue;
        if (Object.keys(manifest.files).some((file) => file.startsWith(`${path}/`))) continue;
        found.add(`${path} is another copy of the ${skill.name} skill, outside the shared folder ${folder}; ${env.profile.label} could load it instead. Reconcile it with the user`);
      }
    }
  }
  return [...found];
}

function pruneEmptyParents(repo, path) {
  for (let dir = dirname(path); dir.startsWith(`${repo}/`); dir = dirname(dir)) {
    if (!existsSync(dir) || readdirSync(dir).length) return;
    rmdirSync(dir);
  }
}

export function apply(kit, answers, repo, { take = [], keep = [] } = {}) {
  const result = plan(kit, answers, repo);
  if (result.errors.length) throw new InstallError(`the render has errors:\n${result.errors.join("\n")}`);
  const unknown = [...take, ...keep].filter((path) => !result.entries.some((e) => e.path === path));
  if (unknown.length) throw new InstallError(`--take/--keep name paths that are not in the plan: ${unknown.join(", ")}`);
  const open = result.entries.filter((e) => ["merge", "conflict"].includes(e.action) && !take.includes(e.path) && !keep.includes(e.path));
  if (open.length) throw new InstallError(`unresolved entries (decide each with --take <path> or --keep <path>):\n${open.map((e) => `  ${e.action} ${e.path}: ${e.reason}`).join("\n")}`);

  const files = {};
  const baselineRoot = join(repo, answers.locations.maintenanceRoot, "baseline");
  // Removals come first: a client-specific copy must be gone before the symlink takes its place.
  const removal = (entry) => entry.action === "delete" || (entry.action === "conflict" && entry.sha256 === undefined);
  for (const entry of [...result.entries.filter(removal), ...result.entries.filter((e) => !removal(e))]) {
    const target = absolutePath(repo, entry.path);
    const kept = keep.includes(entry.path);
    if (removal(entry)) {
      if (!kept) {
        if (entry.mode === "block") writeText(target, removeBlock(readText(target), entry.syntax));
        else {
          rmSync(target);
          pruneEmptyParents(repo, target);
        }
      }
      continue;
    }
    if (entry.mode === "symlink") {
      if (["create", "update"].includes(entry.action) || (take.includes(entry.path) && !kept)) {
        const stat = lstat(target);
        if (stat && !stat.isSymbolicLink()) {
          if (stat.isFile() || readdirSync(target).length) throw new InstallError(`${entry.path}: something is still in the way of the symlink; move it first`);
          rmdirSync(target);
        } else if (stat) rmSync(target);
        mkdirSync(dirname(target), { recursive: true });
        symlinkSync(entry.target, target, "dir");
      }
      files[entry.path] = { sha256: entry.sha256, kind: entry.kind, mode: entry.mode, envs: entry.envs, customizable: false };
      continue;
    }
    const write = ["create", "update"].includes(entry.action) || (take.includes(entry.path) && !kept);
    if (write) {
      if (entry.mode === "json-merge") {
        const value = existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) : {};
        mergeInto(value, entry.add);
        writeText(target, `${JSON.stringify(value, null, 2)}\n`);
      } else if (entry.mode === "block") writeText(target, writeBlock(existsSync(target) ? readText(target) : null, entry.syntax, entry.content));
      else writeText(target, entry.content);
    }
    const record = { sha256: entry.sha256, kind: entry.kind, mode: entry.mode, envs: entry.envs, customizable: entry.customizable };
    if (entry.mode === "block") record.syntax = entry.syntax;
    if (entry.mode === "json-merge") record.add = entry.add;
    if (kept) {
      const state = current(repo, entry);
      record.keptSha256 = state.value === null ? null : sha256(state.value);
    } else if (entry.action === "unchanged" && result.manifest.files[entry.path]?.keptSha256) {
      record.keptSha256 = result.manifest.files[entry.path].keptSha256;
    }
    if (entry.customizable && entry.scope === "repo") writeText(join(baselineRoot, entry.path), entry.content);
    files[entry.path] = record;
  }
  const manifest = { version: 1, kit: { skill: "bootstrap-orchestrator-system", version: kit.version }, appliedOn: new Date().toISOString().slice(0, 10), answersSha256: sha256(JSON.stringify(answers.raw)), files };
  writeText(manifestPath(repo, answers), `${JSON.stringify(manifest, null, 2)}\n`);
  return { ...result, manifest };
}

// Drift and unfilled slots in the installed tree. An empty list means the target matches the answers.
export function check(kit, answers, repo) {
  const result = plan(kit, answers, repo);
  const problems = [...result.errors, ...result.duplicates, ...result.hiddenRoots.map((root) => `${root}/ is a hidden system folder that is still in the repository`)];
  for (const entry of result.entries) if (entry.action !== "unchanged") problems.push(`${entry.action} ${entry.path}${entry.reason ? `: ${entry.reason}` : ""}`);
  // Only declared slots count: workflow text also carries design placeholders such as {{O1}}.
  const slots = new Set(Object.keys(kit.index.slots));
  for (const entry of result.entries) {
    if (entry.kind === "runtime" || entry.content === undefined) continue;
    for (const match of entry.content.matchAll(/\{\{([A-Z][A-Z0-9_]*)\}\}/g)) if (slots.has(match[1])) problems.push(`${entry.path}: unfilled slot {{${match[1]}}}`);
  }
  return { ...result, problems };
}
