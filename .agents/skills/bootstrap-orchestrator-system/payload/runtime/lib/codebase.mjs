// Codebase clusters (contracts/codebase-clusters.md). Lab-authored, deterministic partition: every file of the
// extension belongs to exactly one cluster. Test infrastructure forms `Tests`; every other file joins the domain of
// its deepest non-structural directory that holds at least MIN_CLUSTER_SIZE files, named in PascalCase; a file
// with no such directory forms `General`.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { arg, RuntimeError, requireString } from "./util.mjs";

const MIN_CLUSTER_SIZE = 5;
const WALK_EXCLUDES = new Set([".git", "node_modules", "bin", "obj", "dist", "build", "coverage", ".next", "target"]);
// Directories that organise a codebase without naming a domain of it.
const STRUCTURAL_DIRS = new Set(["src", "source", "sources", "lib", "app", "apps", "packages", "modules", "components", "pages", "features", "common", "shared", "internal", "pkg", "main", "java", "kotlin", "resources"]);
const TEST_DIRS = new Set(["test", "tests", "__tests__", "__mocks__", "mocks", "__fixtures__", "fixtures", "testing", "test-utils", "testutils", "e2e", "cypress", "playwright"]);
const TEST_FILES = /^(setup-?tests|test-?utils|(jest|vitest)\.setup)$|\.(mock|fixture)$|Tests$/i;
const TESTS_CLUSTER = "Tests";
const GENERAL_CLUSTER = "General";

function workspaceOf(ctx, args, tool) {
  const raw = arg(args, "WorkspacePath") ?? ctx.workspaceRoot;
  const workspace = isAbsolute(raw) ? raw : resolve(ctx.workspaceRoot, raw);
  if (!existsSync(workspace)) throw new RuntimeError(`${tool} failed: WorkspacePath does not exist: ${workspace}`);
  return workspace;
}

function extensionOf(args, tool) {
  const ext = requireString(arg(args, "fileExtension"), "fileExtension", tool);
  return ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
}

function listFiles(workspace) {
  try {
    return execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], { cwd: workspace, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 256 * 1024 * 1024 })
      .split("\0")
      .filter(Boolean);
  } catch {
    const files = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (WALK_EXCLUDES.has(entry.name)) continue;
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else files.push(relative(workspace, path).split("\\").join("/"));
      }
    };
    walk(workspace);
    return files;
  }
}

export function pascalCase(name) {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function isTestInfrastructure(file, extension) {
  const segments = file.split("/");
  const base = segments.pop().slice(0, -extension.length);
  return segments.some((dir) => TEST_DIRS.has(dir.toLowerCase())) || TEST_FILES.test(base);
}

function buildClusters(ctx, args, tool) {
  const workspace = workspaceOf(ctx, args, tool);
  const extension = extensionOf(args, tool);
  const files = listFiles(workspace).filter((f) => f.toLowerCase().endsWith(extension));
  const clusters = new Map();
  const add = (name, file) => {
    if (!clusters.has(name)) clusters.set(name, []);
    clusters.get(name).push(file);
  };
  const domainFiles = [];
  for (const file of files) {
    if (isTestInfrastructure(file, extension)) add(TESTS_CLUSTER, file);
    else domainFiles.push(file);
  }
  // Files under each directory, counted over the domain files only.
  const size = new Map();
  for (const file of domainFiles) {
    const dirs = file.split("/").slice(0, -1);
    for (let depth = 1; depth <= dirs.length; depth++) {
      const dir = dirs.slice(0, depth).join("/");
      size.set(dir, (size.get(dir) ?? 0) + 1);
    }
  }
  for (const file of domainFiles) {
    const dirs = file.split("/").slice(0, -1);
    let name = GENERAL_CLUSTER;
    for (let depth = dirs.length; depth >= 1; depth--) {
      const dir = dirs[depth - 1];
      if (STRUCTURAL_DIRS.has(dir.toLowerCase()) || !pascalCase(dir)) continue;
      if (size.get(dirs.slice(0, depth).join("/")) >= MIN_CLUSTER_SIZE) {
        name = pascalCase(dir);
        break;
      }
    }
    add(name, file);
  }
  return { workspace, clusters };
}

export function clusters(ctx, args) {
  const { clusters } = buildClusters(ctx, args, "codebase-clusters");
  if (clusters.size === 0) return "No file with that extension exists in the workspace.";
  // `matches` (captured on 3.0.4, get_codebase_clusters run 5): the clusters that hold a match are listed first and
  // annotated `[match: <n>] <terms>`. Lab-authored: a term matches a cluster when a file of it carries the term in
  // its workspace-relative path, ignoring case; the matched clusters keep the usual order among themselves.
  const raw = arg(args, "matches");
  const terms = [...new Set((Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : []).map((term) => String(term).trim()).filter(Boolean))];
  const matched = (members) => terms.filter((term) => members.some((file) => file.toLowerCase().includes(term.toLowerCase())));
  return [...clusters.entries()]
    .map(([name, members]) => ({ name, members, hits: matched(members) }))
    .sort((a, b) => Number(b.hits.length > 0) - Number(a.hits.length > 0) || b.members.length - a.members.length || a.name.localeCompare(b.name))
    .map(({ name, members, hits }) => `- ${name} (${members.length})${hits.length ? ` [match: ${hits.length}] ${hits.join(", ")}` : ""}`)
    .join("\n");
}

export function clusterFiles(ctx, args) {
  const tool = "codebase-cluster-files";
  const name = requireString(arg(args, "clusterName"), "clusterName", tool);
  const { workspace, clusters } = buildClusters(ctx, args, tool);
  // Names are matched exactly: a name taken from another map, or another extension, is not found.
  const members = clusters.get(name);
  if (!members) return `Cluster name '${name}' not found.`;
  const key = (path) => path.toUpperCase();
  return members
    .map((f) => join(workspace, f))
    .sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0))
    .join("\n");
}
