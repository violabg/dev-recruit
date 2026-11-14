// Moves an installation from hidden system folders to visible ones, in three separate steps, without losing data.
//
//   plan     inventory the old folders and report collisions. Writes nothing.
//   apply    copy each old folder to its visible name, verify every copied file, and rewrite the answers, the
//            manifest and the baselines at the new location. The old folders stay as the backup.
//   retire   delete the old folders, only after checking that everything recorded in them still exists at the new
//            location and that nothing was added to them since the copy.
//
// `install.mjs apply` runs between apply and retire: it re-renders every reference to the old paths.
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, renameSync, rmSync, symlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { InstallError, isOutside, readJson, writeText } from "./util.mjs";

const LOCATIONS = ["runtimeRoot", "maintenanceRoot", "sessionsRoot", "guideRoot"];
export const LEGACY_ROOTS = [".agentic-system", ".agentic-system-maintenance", ".agentic-system-sessions", ".agentic-system-session"];
export const DEFAULT_MAINTENANCE_ROOT = "agentic-system-maintenance";
const RECORD = "migration.json";

const visibleName = (root) => (root === ".agentic-system-session" ? "agentic-system-sessions" : root.replace(/^\.+/, ""));
const firstSegment = (location) => location.split("/")[0];

// A location is hidden when its first folder starts with a dot, inside the repository.
export const isHiddenLocation = (location) => typeof location === "string" && !isOutside(location) && firstSegment(location).startsWith(".");

// The answers file of the repository. An installation still at the hidden location must be migrated first.
export function findAnswers(repo, explicit) {
  if (explicit) return explicit;
  const current = join(repo, DEFAULT_MAINTENANCE_ROOT, "answers.json");
  if (existsSync(current)) return current;
  const legacy = join(repo, ".agentic-system-maintenance", "answers.json");
  if (existsSync(legacy)) throw new InstallError(`this installation still uses hidden folders (${legacy}). Move them first: node install.mjs migrate plan --repo ${repo}`);
  return current;
}

function legacyAnswersFile(repo, explicit) {
  const path = explicit ?? join(repo, ".agentic-system-maintenance", "answers.json");
  if (!existsSync(path)) throw new InstallError(`no installation to migrate: ${path} does not exist`);
  return path;
}

// Every hidden root the answers name, plus the default names when they exist on disk, mapped to its visible name.
function movesFor(repo, answers) {
  const roots = new Set(LEGACY_ROOTS.filter((root) => existsSync(join(repo, root))));
  for (const key of LOCATIONS) if (isHiddenLocation(answers.locations?.[key])) roots.add(firstSegment(answers.locations[key]));
  // A default the answers omit still sits at the old default name.
  return [...roots].filter((root) => existsSync(join(repo, root))).map((from) => ({ from, to: visibleName(from) }));
}

const fileHash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

// Walks without following symlinks. Each entry is a file with its hash or a symlink with its target.
function inventory(root) {
  const entries = {};
  const walk = (dir, prefix) => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, item.name);
      const rel = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.isSymbolicLink()) entries[rel] = { link: readlinkSync(path) };
      else if (item.isDirectory()) walk(path, rel);
      else entries[rel] = { sha256: fileHash(path) };
    }
  };
  walk(root, "");
  return entries;
}

const isEmptyDir = (path) => lstatSync(path).isDirectory() && readdirSync(path).length === 0;

export function migratePlan(repo, explicit) {
  const answers = readJson(legacyAnswersFile(repo, explicit));
  const moves = movesFor(repo, answers).map((move) => ({ ...move, files: Object.keys(inventory(join(repo, move.from))).length }));
  const problems = [];
  const targets = new Map();
  for (const move of moves) {
    if (targets.has(move.to)) problems.push(`${move.from} and ${targets.get(move.to)} would both move to ${move.to}; merge them by hand first`);
    targets.set(move.to, move.from);
    const target = join(repo, move.to);
    if (existsSync(target) && !isEmptyDir(target)) problems.push(`${move.to}/ already exists and is not empty; nothing was moved. Rename it or choose another location`);
  }
  if (!moves.length) problems.push("no hidden system folder was found");
  return { moves, problems };
}

function copyTree(repo, move) {
  const source = join(repo, move.from);
  const target = join(repo, move.to);
  const before = inventory(source);
  for (const [rel, entry] of Object.entries(before)) {
    const to = join(target, rel);
    mkdirSync(dirname(to), { recursive: true });
    if (entry.link !== undefined) symlinkSync(entry.link, to);
    else copyFileSync(join(source, rel), to);
  }
  const after = inventory(target);
  for (const [rel, entry] of Object.entries(before)) {
    if (JSON.stringify(after[rel]) !== JSON.stringify(entry)) throw new InstallError(`the copy of ${move.from}/${rel} does not match its source; the old folders are untouched`);
  }
  return before;
}

function renamer(moves) {
  const pairs = [...moves].sort((a, b) => b.from.length - a.from.length);
  // A path that starts with the old root, wherever it appears in a sentence, but never `~/.agentic-system`.
  const patterns = pairs.map(({ from, to }) => [new RegExp(`(^|[^\\w./~-])${from.replace(/\./g, "\\.")}(?![\\w-])`, "g"), `$1${to}`]);
  return (text) => patterns.reduce((value, [pattern, to]) => value.replace(pattern, to), text);
}

function renameDeep(value, rename) {
  if (typeof value === "string") return rename(value);
  if (Array.isArray(value)) return value.map((item) => renameDeep(item, rename));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [rename(key), renameDeep(item, rename)]));
  return value;
}

// Removes what the installer itself merged into a settings file, so a settings entry for the old path does not stay.
function removeAdded(target, added) {
  for (const [key, value] of Object.entries(added)) {
    if (!(key in target)) continue;
    if (Array.isArray(value) && Array.isArray(target[key])) {
      target[key] = target[key].filter((item) => !value.some((other) => JSON.stringify(other) === JSON.stringify(item)));
      if (!target[key].length) delete target[key];
    } else if (value && typeof value === "object" && target[key] && typeof target[key] === "object") {
      removeAdded(target[key], value);
      if (!Object.keys(target[key]).length) delete target[key];
    } else if (JSON.stringify(target[key]) === JSON.stringify(value)) delete target[key];
  }
}

export function migrateApply(repo, explicit) {
  const { moves, problems } = migratePlan(repo, explicit);
  if (problems.length) throw new InstallError(problems.join("\n"));
  const oldAnswersPath = legacyAnswersFile(repo, explicit);
  const oldAnswers = readJson(oldAnswersPath);
  const rename = renamer(moves);

  const copied = {};
  for (const move of moves) copied[move.from] = copyTree(repo, move);

  // The answers name every location explicitly from now on, so a later default can never move them silently.
  const answers = renameDeep(oldAnswers, rename);
  const locations = (answers.locations ??= {});
  const fallback = { runtimeRoot: "agentic-system", maintenanceRoot: DEFAULT_MAINTENANCE_ROOT };
  for (const [key, value] of Object.entries(fallback)) if (!locations[key]) locations[key] = value;
  const maintenanceRoot = locations.maintenanceRoot;
  const answersPath = join(repo, maintenanceRoot, "answers.json");
  writeText(answersPath, `${JSON.stringify(answers, null, 2)}\n`);

  const manifestPath = join(repo, maintenanceRoot, "manifest.json");
  const managed = [];
  if (existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    const files = {};
    for (const [path, record] of Object.entries(manifest.files ?? {})) {
      managed.push(path);
      if (record.mode === "json-merge" && record.add && existsSync(join(repo, path))) {
        const settings = JSON.parse(readFileSync(join(repo, path), "utf8"));
        removeAdded(settings, record.add);
        writeText(join(repo, path), `${JSON.stringify(settings, null, 2)}\n`);
        files[rename(path)] = { ...record, add: renameDeep(record.add, rename) };
      } else files[rename(path)] = record;
    }
    writeText(manifestPath, `${JSON.stringify({ ...manifest, files }, null, 2)}\n`);
  }

  // Baselines are stored by target path, so they follow the same rename.
  const baseline = join(repo, maintenanceRoot, "baseline");
  for (const { from, to } of moves) {
    const old = join(baseline, from);
    if (existsSync(old)) renameSync(old, join(baseline, to));
  }

  const record = { state: "copied", date: new Date().toISOString().slice(0, 10), moves, managed: managed.map(rename), copied };
  writeText(join(repo, maintenanceRoot, RECORD), `${JSON.stringify(record, null, 2)}\n`);
  return { moves, answersPath };
}

export function migrateRetire(repo, maintenanceRoot = DEFAULT_MAINTENANCE_ROOT) {
  const recordPath = join(repo, maintenanceRoot, RECORD);
  if (!existsSync(recordPath)) throw new InstallError(`no migration is recorded at ${recordPath}: run migrate apply first`);
  const record = readJson(recordPath);
  const managed = new Set(record.managed);
  const problems = [];
  for (const { from, to } of record.moves) {
    const source = join(repo, from);
    if (!existsSync(source)) continue;
    const now = inventory(source);
    const was = record.copied[from];
    for (const [rel, entry] of Object.entries(now)) {
      if (JSON.stringify(was[rel]) !== JSON.stringify(entry)) problems.push(`${from}/${rel} changed after the copy; it holds data the new folder does not have`);
    }
    const target = inventory(join(repo, to));
    for (const [rel, entry] of Object.entries(was)) {
      // A rendered file may change or disappear through install.mjs apply; anything else must be there unchanged.
      if (managed.has(`${to}/${rel}`) || (to === maintenanceRoot && ["answers.json", "manifest.json"].includes(rel)) || (to === maintenanceRoot && rel.startsWith("baseline/"))) continue;
      if (!target[rel]) problems.push(`${to}/${rel} is missing`);
      // A session keeps growing at its new location, so a changed file there is newer, not lost.
      else if (JSON.stringify(target[rel]) !== JSON.stringify(entry) && !to.endsWith("-sessions")) problems.push(`${to}/${rel} differs from the file it was copied from`);
    }
  }
  if (problems.length) throw new InstallError(`nothing was deleted:\n${problems.join("\n")}`);
  const retired = [];
  for (const { from } of record.moves) {
    const source = join(repo, from);
    if (existsSync(source)) {
      rmSync(source, { recursive: true });
      retired.push(from);
    }
  }
  writeText(recordPath, `${JSON.stringify({ state: "retired", date: new Date().toISOString().slice(0, 10), moves: record.moves }, null, 2)}\n`);
  return { retired };
}
