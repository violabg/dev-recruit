// Loads and validates the answers file Bootstrap writes after the decision register, and derives the slot values.
import { isHiddenLocation } from "./migrate.mjs";
import { InstallError, isOutside } from "./util.mjs";

const repoLocations = ["runtimeRoot", "knowledgeRoot", "maintenanceRoot", "guideRoot"];
const defaults = {
  runtimeRoot: "agentic-system",
  knowledgeRoot: "knowledge",
  maintenanceRoot: "agentic-system-maintenance",
  guideRoot: "docs/agentic-system",
  userRuntimeRoot: "~/.agentic-system",
  documentationTemplates: "user",
};
const trim = (path) => path.replace(/\/+$/, "");

export function normalizeAnswers(raw, profiles) {
  const errors = [];
  const need = (cond, message) => cond || errors.push(message);
  need(raw.version === 1, "answers.version must be 1");
  need(typeof raw.repo?.name === "string" && raw.repo.name !== "", "answers.repo.name is required");
  need(typeof raw.prefix === "string", "answers.prefix is required (an empty string means no prefix)");
  need(typeof raw.validationCommands === "string" && raw.validationCommands !== "", "answers.validationCommands is required");
  need(typeof raw.tracker?.adapter === "string", "answers.tracker.adapter is required (a tracker name or `local-markdown`)");
  need(typeof raw.locations?.sessionsRoot === "string" && raw.locations.sessionsRoot !== "", "answers.locations.sessionsRoot is required: the developer chooses it");
  need(["generate", "skip", "defer"].includes(raw.skills?.["manage-work-item"]), "answers.skills.manage-work-item must be generate, skip or defer");
  need(Array.isArray(raw.environments) && raw.environments.length > 0, "answers.environments must list at least one environment");
  if (errors.length) throw new InstallError(errors.join("\n"));

  const locations = { ...defaults, ...raw.locations };
  for (const key of Object.keys(locations)) if (typeof locations[key] === "string") locations[key] = trim(locations[key]);
  for (const key of repoLocations) need(!isOutside(locations[key]), `answers.locations.${key} must be a repository-relative path`);
  for (const key of ["runtimeRoot", "maintenanceRoot", "guideRoot", "sessionsRoot"]) {
    need(!isHiddenLocation(locations[key]), `answers.locations.${key} is '${locations[key]}': a system folder in the repository must be visible, so its name must not start with a dot. For an existing installation run: node install.mjs migrate plan`);
  }
  need(["user", "workspace"].includes(locations.documentationTemplates), "answers.locations.documentationTemplates must be user or workspace");
  if (raw.prefix !== "") need(/^[a-z0-9][a-z0-9-]*$/.test(raw.prefix), "answers.prefix may hold lowercase letters, digits and hyphens only");

  const ids = new Set();
  const environments = raw.environments.map((env, i) => {
    const where = `answers.environments[${i}]`;
    need(typeof env.id === "string" && /^[a-z0-9-]+$/.test(env.id), `${where}.id must be a lowercase identifier`);
    need(!ids.has(env.id), `${where}.id duplicates ${env.id}`);
    ids.add(env.id);
    const base = profiles[env.profile];
    need(Boolean(base), `${where}.profile '${env.profile}' has no client profile; render that client by hand (contracts/client-bindings.md)`);
    const profile = base ? deepMerge(structuredClone(base), env.overrides ?? {}) : null;
    const route = env.route ?? profile?.routes.default;
    need(["native", "skill"].includes(route), `${where}.route must be native or skill`);
    if (route === "native") need(Boolean(profile?.routes.nativeStart), `${where}: ${env.profile} has no verified native route; use the skill route`);
    const delegation = env.delegation ?? "native";
    need(["native", "subprocess"].includes(delegation), `${where}.delegation must be native or subprocess`);
    if (delegation === "subprocess") need(Boolean(profile?.delegation.subprocess), `${where}: ${env.profile} has no subprocess command; the workflows are blocked in this client`);
    return { ...env, profile, profileId: env.profile, route, delegation, bindings: env.bindings ?? {}, roleTools: env.roleTools ?? {}, verification: env.verification ?? {} };
  });
  const skillSharing = normalizeSkillSharing(raw, environments, need);
  if (errors.length) throw new InstallError(errors.join("\n"));

  return {
    repoName: raw.repo.name,
    prefix: raw.prefix,
    locations,
    glossaryPath: raw.glossaryPath ?? "CONTEXT.md",
    validationCommands: raw.validationCommands,
    tracker: { adapter: raw.tracker.adapter, localContract: raw.tracker.localContract ?? `${locations.runtimeRoot}/work-items/README.md` },
    skills: raw.skills,
    skillSharing,
    environments,
    raw,
  };
}

// The selected clients with their overrides applied, for the ranking before the answers are complete.
export function selectedClients(raw, profiles) {
  return (raw.environments ?? []).filter((env) => profiles[env.profile]).map((env) => ({ id: env.id, profile: deepMerge(structuredClone(profiles[env.profile]), env.overrides ?? {}) }));
}

// Every project folder a client documents discovering skills from, its own first.
export const skillFolders = (profile) => [profile.skills.dir, ...(profile.skills.discovers ?? []).map((d) => d.dir)];

// The candidate shared folders, widest coverage first. A tie keeps the order the first client lists them in.
export function rankSkillFolders(environments) {
  const folders = [...new Set(environments.flatMap((env) => skillFolders(env.profile)))];
  return folders
    .map((folder) => ({ folder, clients: environments.filter((env) => skillFolders(env.profile).includes(folder)).map((env) => env.id) }))
    .sort((a, b) => b.clients.length - a.clients.length);
}

// One authoritative copy of each workflow skill. Each client reaches it `native`ly, through a `symlink`, or keeps
// an approved client-specific `copy`. A single client needs no decision: its own folder is the shared folder.
function normalizeSkillSharing(raw, environments, need) {
  const sharing = raw.skillSharing;
  if (!sharing) {
    need(environments.length === 1, `answers.skillSharing is required with more than one client: choose the shared skills folder (question skills-folder; node install.mjs skills-folder ranks the candidates)`);
    const [env] = environments;
    return { folder: env?.profile?.skills.dir, clients: env ? { [env.id]: { via: "native", evidence: "the only selected client" } } : {} };
  }
  need(typeof sharing.folder === "string" && sharing.folder !== "" && !isOutside(sharing.folder), "answers.skillSharing.folder must be a repository-relative path");
  const clients = sharing.clients ?? {};
  for (const env of environments) {
    const entry = clients[env.id];
    const where = `answers.skillSharing.clients.${env.id}`;
    need(["native", "symlink", "copy"].includes(entry?.via), `${where}.via must be native, symlink or copy`);
    need(typeof (entry?.evidence ?? entry?.reason) === "string", `${where} must record its evidence (native, symlink) or the approved reason (copy)`);
    if (entry?.via === "copy") need(typeof entry.reason === "string", `${where}: a client-specific copy needs the reason the user approved it`);
    if (entry?.via === "native" && env.profile) need(skillFolders(env.profile).includes(sharing.folder), `${where}: ${env.profile.label} does not document discovering ${sharing.folder}; use a symlink, an approved copy, or an override with its source`);
  }
  return { folder: sharing.folder?.replace(/\/+$/, ""), clients };
}

function deepMerge(target, overrides) {
  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === "object" && !Array.isArray(value) && target[key] && typeof target[key] === "object") deepMerge(target[key], value);
    else target[key] = value;
  }
  return target;
}

export const isLocalTracker = (answers) => answers.tracker.adapter === "local-markdown";

// Slot values shared by every environment. AGENT_ROOT and SKILL_ROOT are added per environment by the renderer.
export function slotValues(answers) {
  const { locations } = answers;
  return {
    RUNTIME_ROOT: locations.runtimeRoot,
    SESSIONS_ROOT: locations.sessionsRoot,
    USER_RUNTIME_ROOT: locations.userRuntimeRoot,
    REPO_NAME: answers.repoName,
    KNOWLEDGE_ROOT: locations.knowledgeRoot,
    CONTEXT_GLOSSARY_PATH: answers.glossaryPath,
    VALIDATION_COMMANDS: answers.validationCommands,
    LOCAL_MARKDOWN_TRACKER_CONTRACT: isLocalTracker(answers)
      ? answers.tracker.localContract
      : `(no local Markdown tracker: this repository uses ${answers.tracker.adapter})`,
  };
}

// The binding of a host token in one environment: an exact key wins over a `<prefix>-*` family key.
// A binding is a string, { text, tools }, or { none: "<reason>" } for an operation the repository does not have.
export function bindingFor(env, token) {
  let value = env.bindings[token];
  if (value === undefined) {
    const family = Object.keys(env.bindings)
      .filter((key) => key.endsWith("-*") && token.startsWith(key.slice(0, -1)))
      .sort((a, b) => b.length - a.length)[0];
    if (family) value = env.bindings[family];
  }
  if (value === undefined) return null;
  if (typeof value === "string") return { text: value, tools: [] };
  if (value.none) return { none: value.none, tools: [] };
  return { text: value.text, tools: value.tools ?? [] };
}
