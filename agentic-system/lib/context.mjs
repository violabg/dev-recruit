// Resolves where the runtime keeps its data. Every path can be overridden for tests and unusual layouts.
//
//   runtime root  the folder holding bin/, lib/, assets/ (and, in a target repo, workflows/ and config.json)
//   config file   <runtime root>/config.json, optional: { workspaceRoot, knowledgeRoot, userRoot,
//                 workflowsRoot, sessionsRoot, cacheRoot, partLimit, partLimits, roles } — relative paths resolve against
//                 the runtime root; partLimit is the largest part in bytes and partLimits the one of each client
//                 that has its own; roles lists each role's tokens
//   sessions      may live outside the repository; the cache defaults to <sessionsRoot>/.cache so the
//                 runtime root itself stays free of generated files
//   environment   AGENTIC_SYSTEM_<KEY> overrides the config (e.g. AGENTIC_SYSTEM_WORKSPACE_ROOT)
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PART_LIMIT } from "./util.mjs";

const defaultRuntimeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function expand(path, base) {
  if (path.startsWith("~/") || path === "~") return join(homedir(), path.slice(1));
  return isAbsolute(path) ? path : resolve(base, path);
}

export function createContext(overrides = {}) {
  const env = overrides.env ?? process.env;
  const runtimeRoot = resolve(overrides.runtimeRoot ?? env.AGENTIC_SYSTEM_RUNTIME_ROOT ?? defaultRuntimeRoot);
  const configPath = join(runtimeRoot, "config.json");
  const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, "utf8")) : {};
  const pick = (key, envKey, fallback) =>
    expand(overrides[key] ?? env[`AGENTIC_SYSTEM_${envKey}`] ?? config[key] ?? fallback, runtimeRoot);
  const workspaceRoot = pick("workspaceRoot", "WORKSPACE_ROOT", "..");
  const sessionsRoot = pick("sessionsRoot", "SESSIONS_ROOT", "sessions");
  return {
    runtimeRoot,
    assetsRoot: join(defaultRuntimeRoot, "assets"),
    workspaceRoot,
    knowledgeRoot: pick("knowledgeRoot", "KNOWLEDGE_ROOT", join(workspaceRoot, "knowledge")),
    userRoot: pick("userRoot", "USER_ROOT", "~/.agentic-system"),
    workflowsRoot: pick("workflowsRoot", "WORKFLOWS_ROOT", "workflows"),
    sessionsRoot,
    cacheRoot: pick("cacheRoot", "CACHE_ROOT", join(sessionsRoot, ".cache")),
    documentationRoot: pick("documentationRoot", "DOCUMENTATION_ROOT", "documentation"),
    // Installed beside the runtime in a target (<runtime root>/contracts); in the Lab, beside runtime/.
    contractsRoot: pick("contractsRoot", "CONTRACTS_ROOT", existsSync(join(runtimeRoot, "contracts")) ? "contracts" : "../contracts"),
    partLimit: overrides.partLimit ?? (Number(env.AGENTIC_SYSTEM_PART_LIMIT) || config.partLimit || PART_LIMIT),
    // Lab-authored: the part limit of each client that has its own, by the id the role files pass as `--client`.
    partLimits: overrides.partLimits ?? config.partLimits ?? null,
    roles: overrides.roles ?? config.roles ?? null,
    now: overrides.now ?? (() => new Date()),
  };
}
