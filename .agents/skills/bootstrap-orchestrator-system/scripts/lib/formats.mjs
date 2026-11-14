// Client-specific file formats: role files (native agents and subagents) and permission settings.
// Profiles in registry/clients.json name the format; every format the profiles use is implemented here.
import { InstallError, tomlMultiline, tomlString, yamlFrontmatter } from "./util.mjs";

const has = (role, op) => role.operations.includes(op);
const cleanRoot = (root) => root.replace(/^\.\//, "").replace(/\/+$/, "");

// Whether this client's files deny direct edits of the knowledge folder (contracts/knowledge-catalog.md, guard).
export const deniesKnowledgeEdits = (env) => env.profile.agents.format === "opencode" || env.profile.permissions.format === "claude-settings";

// OpenCode expresses tool access as permissions; every key a role does not need is denied.
function opencodePermission(role, runtimeCommand, delegates, runtimeTokens, knowledgeRoot) {
  const allow = (cond) => (cond ? "allow" : "deny");
  const permission = {
    read: allow(has(role, "read")),
    grep: allow(has(role, "search")),
    glob: allow(has(role, "search")),
    list: allow(has(role, "search")),
    // Agent rules take precedence over the global config and the last matching rule wins, so the deny goes here, last.
    edit: has(role, "write") ? { "*": "allow", [`${cleanRoot(knowledgeRoot)}/**`]: "deny" } : "deny",
    bash: has(role, "terminal") ? "allow" : has(role, "runtime") ? { "*": "deny", ...Object.fromEntries(runtimeTokens.map((token) => [`${runtimeCommand} ${token} *`, "allow"])) } : "deny",
    question: allow(has(role, "question")),
    task: delegates.length ? { "*": "deny", ...Object.fromEntries(delegates.map((d) => [d, "allow"])) } : "deny",
  };
  return permission;
}

// A subagent hook that limits a runtime-only role's shell to its own runtime commands.
function claudeRoleHook(role, runtimeRoot) {
  const command = `node "$CLAUDE_PROJECT_DIR/${runtimeRoot}/bin/role-guard.mjs" ${role.name}`;
  return ["hooks:", "  PreToolUse:", '    - matcher: "Bash"', "      hooks:", "        - type: command", `          command: ${JSON.stringify(command)}`].join("\n");
}

export const isRuntimeOnly = (role) => has(role, "runtime") && !has(role, "terminal");

export function agentFile(env, spec) {
  const { role, name, description, body, tools, delegates, isDelegate, runtimeCommand, runtimeRoot, runtimeTokens, knowledgeRoot } = spec;
  const dir = env.profile.agents.dir;
  switch (env.profile.agents.format) {
    case "claude":
      return { path: `${dir}/${name}.md`, content: withHook(yamlFrontmatter({ name, description, tools: tools.length ? tools.join(", ") : undefined }), isRuntimeOnly(role) ? claudeRoleHook(role, runtimeRoot) : null) + body };
    case "copilot":
      return {
        path: `${dir}/${name}.agent.md`,
        content:
          yamlFrontmatter({
            name,
            description,
            tools,
            "user-invocable": isDelegate ? false : undefined,
            // No `agents` allowlist: it would also shut out the default subagent the general-purpose delegate uses.
          }) + body,
      };
    case "opencode":
      return {
        path: `${dir}/${name}.md`,
        content:
          yamlFrontmatter({
            description,
            mode: isDelegate ? "subagent" : "primary",
            hidden: isDelegate ? true : undefined,
            permission: opencodePermission(role, runtimeCommand, delegates, runtimeTokens, knowledgeRoot),
          }) + body,
      };
    case "cursor": {
      const readonly = !has(role, "write") && !has(role, "terminal") && !has(role, "runtime");
      return { path: `${dir}/${name}.md`, content: yamlFrontmatter({ name, description, readonly: readonly || undefined }) + body };
    }
    case "codex": {
      const lines = [`name = ${tomlString(name)}`, `description = ${tomlString(description)}`, `developer_instructions = ${tomlMultiline(body)}`];
      if (!has(role, "terminal") && !has(role, "runtime")) lines.push("", "[features]", "shell_tool = false");
      return { path: `${dir}/${name}.toml`, content: `${lines.join("\n")}\n` };
    }
    default:
      throw new InstallError(`client format '${env.profile.agents.format}' is not implemented`);
  }
}

const withHook = (frontmatter, hook) => (hook ? frontmatter.replace(/---\n$/, `${hook}\n---\n`) : frontmatter);

// Whether the format can restrict a role's tools at runtime; otherwise the role's limits are instruction-only.
export const enforcesTools = (env) => ["claude", "copilot", "opencode"].includes(env.profile.agents.format);

// The settings that let the roles run the runtime command and reach locations outside the repository.
// Returns null when the client has no project permission file (approve on first use; recorded by Bootstrap).
export function permissionOutput(env, runtimeCommand, outsidePaths, knowledgeRoot) {
  const { format, file } = env.profile.permissions;
  const prune = (object) => JSON.parse(JSON.stringify(object));
  switch (format) {
    case "claude-settings":
      return {
        mode: "json-merge",
        path: file,
        add: prune({ permissions: { allow: [`Bash(${runtimeCommand} *)`], deny: [`Edit(/${cleanRoot(knowledgeRoot)}/**)`], additionalDirectories: outsidePaths.length ? outsidePaths : undefined } }),
      };
    case "vscode-settings":
      return { mode: "json-merge", path: file, add: { "chat.tools.terminal.autoApprove": { [runtimeCommand]: true } } };
    case "opencode-json":
      return {
        mode: "json-merge",
        path: file,
        add: prune({
          permission: {
            bash: { [`${runtimeCommand} *`]: "allow" },
            external_directory: outsidePaths.length ? Object.fromEntries(outsidePaths.map((p) => [`${p}/**`, "allow"])) : undefined,
          },
        }),
      };
    case "codex-toml":
      if (!outsidePaths.length) return null;
      return {
        mode: "block",
        syntax: "hash",
        path: file,
        content: `[sandbox_workspace_write]\nwritable_roots = [${outsidePaths.map(tomlString).join(", ")}]\n`,
        // A second [sandbox_workspace_write] table outside the managed block would make the file invalid.
        conflictsWith: /^\[sandbox_workspace_write\]/m,
      };
    case null:
    case undefined:
      return null;
    default:
      throw new InstallError(`permission format '${format}' is not implemented`);
  }
}
