// Renders every target file from the payload, the client profiles and the answers. Pure: reads the kit, never the target.
import { dirname, join, relative } from "node:path";
import { bindingFor, isLocalTracker, rankSkillFolders, skillFolders, slotValues } from "./answers.mjs";
import { agentFile, deniesKnowledgeEdits, enforcesTools, isRuntimeOnly, permissionOutput } from "./formats.mjs";
import { fillSlots, isOutside, readText, runtimeRelative, splitFrontmatter, yamlFrontmatter } from "./util.mjs";

const DEFAULT_PART_LIMIT = 24000;
const operationNames = { read: "read files", search: "search files", write: "write files", terminal: "run terminal commands", question: "ask the user", runtime: "run the runtime command" };

export function render(kit, answers) {
  const { index } = kit;
  const payload = (path) => readText(join(kit.payloadDir, path));
  const base = slotValues(answers);
  const rt = answers.locations.runtimeRoot;
  const runtimeCommand = fillSlots(index.runtimeCommand, base);
  const outsidePaths = [answers.locations.sessionsRoot].filter(isOutside);
  const outputs = [];
  const errors = [];
  const warnings = [];
  const add = (output) => outputs.push({ scope: "repo", customizable: false, mode: "file", envs: [], ...output });
  const enabled = (skill) => !["skip", "defer"].includes(answers.skills[skill.name]);
  const sharing = answers.skillSharing;
  const sharedClients = [];
  // The largest runtime answer each client shows whole. The smallest is the config's `partLimit`, which every call
  // without `--client` gets; a client with a larger one is named in `partLimits` and passes `--client` from its
  // role files, so it is not held to the smallest limit of the clients installed beside it.
  const partLimitOf = (env) => env.profile.runtime?.partLimit ?? DEFAULT_PART_LIMIT;
  const smallestPartLimit = Math.min(...answers.environments.map(partLimitOf));
  const ownPartLimits = Object.fromEntries(answers.environments.filter((env) => partLimitOf(env) > smallestPartLimit).map((env) => [env.id, partLimitOf(env)]));

  for (const env of answers.environments) {
    const { profile } = env;
    const slots = { ...base, AGENT_ROOT: profile.agents.dir, SKILL_ROOT: profile.skills.dir };
    const nativeName = (role) => `${answers.prefix}${role}`;
    const delegates = index.roles.filter((r) => r.invocation === "delegate");

    const delegationText = () => {
      const map = delegates.map((r) => `\`${r.name}\` → \`${nativeName(r.name)}\``);
      const general = profile.delegation.generalPurpose
        ? `\`general-purpose\` → the built-in \`${profile.delegation.generalPurpose}\` agent`
        : "`general-purpose` → the client's default subagent (name no agent)";
      const how =
        env.delegation === "subprocess"
          ? `Start each delegate as a separate process with \`${profile.delegation.subprocess}\`: its prompt first tells it to read and follow the role's file under \`${profile.agents.dir}\` as its complete instructions, then carries the prompt the step gives, unchanged. The process output is the report. A process cannot be resumed: re-run the same role with the complete correction prompt, as the step's arm for a host without resume says.`
          : profile.delegation.native.replaceAll("{name}", nativeName("code-implementor"));
      // A profile whose native text already says how, or that it cannot, keeps its own words.
      const resume =
        env.delegation === "subprocess" || profile.delegation.resume || /resum/i.test(profile.delegation.native)
          ? ""
          : " This client documents no way to resume a delegate by id: start the same role again with the complete correction prompt, as the step's arm for a host without resume says.";
      return `${how}${resume} A delegate's report comes back on its own, after a start and after a resume: wait for it, and never sleep, poll or list agents meanwhile. Role names here: ${[...map, general].join("; ")}. A delegate sees only its own file, not this section: when the prompt you pass names a \`#capability:<token>\` its file does not bind (always the case for \`general-purpose\`), append that token's line from this section to the prompt.`;
    };

    // An `#operation:<op>` named in prose is a host tool; binding it here keeps agents from sending it to the runtime.
    const operationLine = (op) => {
      const tools = profile.tools[op] ?? [];
      const how = tools.length ? `call ${tools.map((t) => `\`${t}\``).join(" or ")}` : `use ${profile.label}'s own tool for it${op === "question" ? ", or ask in your reply and wait for the answer" : ""}`;
      const name = op === "question" ? " (your question tool)" : "";
      return `- \`#operation:${op}\`${name}: ${operationNames[op]}: ${how}. It is a host tool, not a runtime operation: never run \`${runtimeCommand} ${op}\`.`;
    };

    const bindingLines = (tokens, role, body) => {
      const lines = [];
      const runtimeTokens = tokens.filter((t) => index.tokens[t]?.kind === "runtime");
      if (runtimeTokens.length || role?.operations.includes("runtime")) {
        // Role files are per client, so only they name the client; a shared skill keeps the smallest limit.
        const clientFlag = role && ownPartLimits[env.id] ? ` --client ${env.id}` : "";
        const roleFlag = role ? ` --role ${role.name}${clientFlag}` : "";
        lines.push(`- Runtime operations: run \`${runtimeCommand} <token>${roleFlag}\` from the repository root, where \`<token>\` is the name of a runtime \`#capability:<token>\` (an \`#operation:<op>\` is never a runtime command)${role ? `; always pass \`--role ${role.name}\`, and the runtime refuses a command outside this role` : ""}${clientFlag ? `; always pass \`--client ${env.id}\` as well, in every call including the one for a later part, so that an answer is cut to what ${profile.label} shows whole` : ""}; pass arguments as flags (\`--sessionId s1\`) or as one JSON object: inline when it is short (\`--json '{"sessionId":"s1"}'\`), on stdin in the same command when it is large (\`--json -\` with a quoted heredoc, in a POSIX shell), or else with \`--json <file>\`. The JSON payload is the operation's argument object, defined in \`${rt}/contracts/\`: design operations take \`{ "sessionId", "jobId", "request": { ... } }\`, and fields such as \`operation\`, \`rows\` and \`ids\` go inside \`request\`; every other operation takes its arguments at the top level. The arguments of each command are listed below, so do not probe them first; run \`${runtimeCommand} <token> --help\` only when a call is refused or you need a field's definition. On a design command it prints every field of \`request\` and of its rows, so read that rather than the contract files. A long answer arrives in parts: when it ends with \`[part N of M. The answer continues …]\`, request every remaining part it names, all in one turn as parallel tool calls if your client allows it, or else one by one, and read every part before acting on any of it. Run one runtime operation per shell command: never join two calls with \`;\`, \`&&\` or a loop, and never pipe an answer through \`head\`, \`tail\`, \`cut\`, \`sed\` or \`dd\`. The runtime is required; when it cannot run, follow the procedure its contract under \`${rt}/contracts/\` gives and record that the gate ran instruction-only.`);
        const commands = runtimeTokens.filter((t) => index.commandArguments[t]);
        if (commands.length) lines.push(`- Runtime command arguments:\n${commands.map((t) => `  - \`${t}\`: ${index.commandArguments[t]}`).join("\n")}`);
      }
      for (const token of tokens.filter((t) => index.tokens[t]?.kind === "host")) {
        if (token === "delegate") {
          lines.push(`- \`#capability:delegate\`: ${delegationText()}`);
          continue;
        }
        const binding = bindingFor(env, token);
        if (!binding) errors.push(`${env.id}: no binding for #capability:${token} (add it to answers.environments[].bindings, or { "none": "<reason>" })`);
        else if (binding.none) lines.push(`- \`#capability:${token}\`: not available in this repository (${binding.none}). Skip any step that needs it and say so.`);
        else lines.push(`- \`#capability:${token}\`: ${binding.text}`);
      }
      const operations = new Set([...body.matchAll(/#operation:([a-z]+)/g)].map((m) => m[1]));
      for (const op of Object.keys(operationNames).filter((o) => o !== "runtime" && operations.has(o))) lines.push(operationLine(op));
      if (role) {
        const granted = role.operations.map((op) => operationNames[op]).join(", ");
        const enforced = enforcesTools(env) && (role.invocation === "delegate" || env.route === "native");
        lines.push(`- Tool limits: this role may ${granted || "use no file or terminal tools"}${role.delegates.length ? ", and start its delegates" : ""}. ${enforced ? "The client enforces the tool list in this file." : "The client does not enforce them here, so they are instructions: stay within them."}`);
        if (isRuntimeOnly(role)) lines.push(`- Use the terminal only to run the runtime command above. ${profile.agents.format === "claude" && enforced ? "A client hook blocks any other shell command." : profile.agents.format === "opencode" && enforced ? "The client denies any other shell command." : "The client cannot limit the terminal further, so this is an instruction."}`);
      }
      return lines;
    };

    const bindingsSection = (tokens, role, body) => {
      const lines = bindingLines(tokens, role, body);
      if (!lines.length) return "";
      return `${["", "## Bindings", "", `Installed for ${profile.label}. This is how each \`#capability:<token>\` and \`#operation:<op>\` in this file runs here.`, "", ...lines].join("\n")}\n`;
    };

    const activationFor = (skill) => {
      const name = nativeName(skill.role);
      return env.route === "skill"
        ? `If this conversation runs a different role, stop and tell the user to open a new conversation. If the \`${name}\` skill is not loaded in this conversation yet, read \`${profile.skills.dir}/${name}/SKILL.md\` and follow it as your complete role contract before you continue. The role contract governs step order, halt points and session persistence; this skill supplies only its intake.`
        : `If this conversation is not running the \`${name}\` agent, stop and tell the user to ${profile.routes.nativeStart.replaceAll("{name}", name)}, then invoke this skill again.`;
    };

    const toolsFor = (role) => {
      const tools = new Set();
      for (const op of role.operations) for (const tool of profile.tools[op] ?? []) tools.add(tool);
      if (role.delegates.length) for (const tool of profile.tools.delegate ?? []) tools.add(tool);
      for (const token of role.tokens) for (const tool of bindingFor(env, token)?.tools ?? []) tools.add(tool);
      for (const tool of env.roleTools[role.name] ?? []) tools.add(tool);
      return [...tools];
    };

    const manualOnly = (skillDir) => {
      const rule = profile.skills.manualOnly;
      if (!rule) {
        warnings.push(`${env.id}: ${profile.label} cannot prevent automatic skill invocation; record the gap`);
        return { frontmatter: {}, extra: [] };
      }
      return {
        frontmatter: rule.frontmatter ?? {},
        extra: rule.file ? [{ path: `${skillDir}/${rule.file.path}`, content: rule.file.content }] : [],
      };
    };

    if (env.route === "skill") {
      for (const role of Object.keys(env.roleTools)) {
        if (index.roles.find((r) => r.name === role)?.invocation === "user") warnings.push(`${env.id}: roleTools for ${role} have no tool list to go in on the skill route; make those tools available at client level and record it`);
      }
    }

    for (const role of index.roles) {
      const roleBody = fillSlots(splitFrontmatter(payload(role.file)).body, slots);
      const body = roleBody + bindingsSection(role.tokens, role, roleBody);
      const isDelegate = role.invocation === "delegate";
      if (isDelegate || env.route === "native") {
        const file = agentFile(env, {
          role,
          name: nativeName(role.name),
          description: role.description,
          body,
          tools: toolsFor(role),
          delegates: role.delegates.map((d) => (d === "general-purpose" ? profile.delegation.generalPurpose : nativeName(d))).filter(Boolean),
          isDelegate,
          runtimeCommand,
          runtimeRoot: rt,
          runtimeTokens: role.tokens.filter((t) => index.tokens[t]?.kind === "runtime"),
          knowledgeRoot: answers.locations.knowledgeRoot,
        });
        add({ ...file, kind: isDelegate ? "delegate" : "role", envs: [env.id] });
      } else {
        const dir = `${profile.skills.dir}/${nativeName(role.name)}`;
        const rule = manualOnly(dir);
        const intro = `# ${nativeName(role.name)}\n\nThis skill starts the \`${role.name}\` role in this conversation. If this conversation already runs a role, stop and tell the user to open a new conversation. Otherwise the contract below is your complete role for the rest of the conversation: it governs every step, halt point and session operation, and the client's own defaults, such as its memory feature, never replace a contract operation.\n\n`;
        add({
          path: `${dir}/SKILL.md`,
          kind: "role-skill",
          envs: [env.id],
          content: yamlFrontmatter({ name: nativeName(role.name), description: `Start the ${role.name} role. ${role.description}`, ...rule.frontmatter }) + intro + body,
        });
        for (const extra of rule.extra) add({ ...extra, kind: "role-skill", envs: [env.id] });
      }
    }

    // Workflow skills: rendered once below for the clients that share the folder. A symlink reaches it from a
    // client's own folder; only an approved exception keeps a client-specific copy.
    const client = { env, label: profile.label, bindingLines, activationFor, manualOnly, slots };
    const { via } = sharing.clients[env.id];
    if (via === "copy") renderSkills([client], profile.skills.dir, add, enabled, index, payload);
    else sharedClients.push(client);
    if (via === "symlink") {
      for (const skill of index.skills.filter(enabled)) {
        const path = `${profile.skills.dir}/${skill.name}`;
        add({ path, kind: "skill-alias", mode: "symlink", envs: [env.id], target: relative(dirname(path), `${sharing.folder}/${skill.name}`) });
      }
    }

    if (profile.router.import) add({ path: profile.router.file, kind: "router", envs: [env.id], customizable: true, mode: "block", syntax: "html", content: `${profile.router.import}\n` });
    if (profile.scopedInstructions) {
      add({ path: `${profile.scopedInstructions.dir}/sessions.instructions.md`, kind: "instruction", envs: [env.id], content: fillSlots(payload("instructions/sessions.instructions.md"), slots) });
    }
    const permission = permissionOutput(env, runtimeCommand, outsidePaths, answers.locations.knowledgeRoot);
    if (!deniesKnowledgeEdits(env)) warnings.push(`${env.id}: no path deny is rendered for the knowledge folder on ${profile.label}; a direct edit is caught only when the runtime refuses the next workflow step`);
    if (permission) add({ ...permission, kind: "permissions", envs: [env.id] });
    else warnings.push(`${env.id}: ${profile.label} has no project permission file; approve the runtime command${outsidePaths.length ? " and the outside sessions folder" : ""} on first use and record it`);
  }

  if (sharedClients.length) renderSkills(sharedClients, sharing.folder, add, enabled, index, payload);

  // Shared files. Root slots that differ per client list every selected client.
  const perClient = (key) =>
    answers.environments.length === 1
      ? answers.environments[0].profile[key].dir
      : answers.environments.map((env) => `${env.profile[key].dir} (${env.profile.label})`).join(", ");
  const skillRoot = answers.environments.length === 1
    ? sharing.folder
    : [`${sharing.folder} (workflow skills)`, ...answers.environments.filter((env) => env.route === "skill").map((env) => `${env.profile.skills.dir} (${env.profile.label} role skills)`)].join(", ");
  const routerSlots = { ...base, AGENT_ROOT: perClient("agents"), SKILL_ROOT: skillRoot };
  add({ path: "AGENTS.md", kind: "router", customizable: true, mode: "block", syntax: "html", content: fillSlots(payload("instructions/AGENTS.md"), routerSlots) });
  add({ path: `${rt}/instructions/sessions.instructions.md`, kind: "instruction", content: fillSlots(payload("instructions/sessions.instructions.md"), base) });
  for (const file of index.runtime) add({ path: `${rt}/${file.slice("runtime/".length)}`, kind: "runtime", content: payload(file) });
  for (const file of index.workflows) add({ path: `${rt}/${file}`, kind: "workflow", content: fillSlots(payload(file), base) });
  for (const file of index.contracts) add({ path: `${rt}/${file}`, kind: "contract", content: fillSlots(payload(file), base) });
  const config = {
    workspaceRoot: runtimeRelative(rt, "."),
    knowledgeRoot: runtimeRelative(rt, answers.locations.knowledgeRoot),
    sessionsRoot: runtimeRelative(rt, answers.locations.sessionsRoot),
    userRoot: answers.locations.userRuntimeRoot,
    workflowsRoot: "workflows",
    partLimit: smallestPartLimit,
    ...(Object.keys(ownPartLimits).length ? { partLimits: ownPartLimits } : {}),
    roles: Object.fromEntries(index.roles.map((role) => [role.name, role.tokens.filter((t) => index.tokens[t]?.kind === "runtime")])),
  };
  add({ path: `${rt}/config.json`, kind: "config", content: `${JSON.stringify(config, null, 2)}\n` });
  const templateRoot = answers.locations.documentationTemplates === "user" ? `${answers.locations.userRuntimeRoot}/documentation/templates` : `${rt}/documentation/templates`;
  for (const file of index.documentationTemplates) {
    add({ path: `${templateRoot}/${file.split("/").pop()}`, kind: "template", scope: isOutside(templateRoot) ? "user" : "repo", content: payload(file) });
  }
  if (isLocalTracker(answers)) add({ path: answers.tracker.localContract, kind: "tracker", customizable: true, content: fillSlots(readText(join(kit.templatesDir, "local-markdown-tracker.md")), base) });
  if (!isOutside(answers.locations.sessionsRoot)) {
    add({ path: ".gitignore", kind: "gitignore", mode: "block", syntax: "hash", content: `${answers.locations.sessionsRoot}/\n` });
  }
  for (const output of guides(kit, answers, base, runtimeCommand)) add(output);

  for (const env of answers.environments) {
    for (const dir of env.profile.alsoDiscovers) {
      const writers = outputs.filter((o) => o.path.startsWith(`${dir}/`) && !o.envs.includes(env.id));
      if (writers.length) warnings.push(`${env.id}: ${env.profile.label} also discovers ${dir}/, where ${[...new Set(writers.flatMap((w) => w.envs))].join(", ")} installs files; check for duplicate roles or skills`);
    }
  }
  const best = rankSkillFolders(answers.environments)[0];
  const reach = answers.environments.filter((env) => skillFolders(env.profile).includes(sharing.folder)).length;
  if (best && best.clients.length > reach) warnings.push(`the shared skills folder ${sharing.folder} is discovered natively by ${reach} of ${answers.environments.length} clients; ${best.folder} is discovered by ${best.clients.length}`);
  for (const env of answers.environments) for (const d of env.profile.skills.discovers ?? []) if (d.dir === sharing.folder && d.note) warnings.push(`${env.id}: discovery of ${d.dir} has a limit: ${d.note}; verify it on each surface and record the result`);
  return { outputs: dedupe(outputs, errors), errors, warnings: [...new Set(warnings)] };
}

// One copy of every enabled workflow skill for the given clients. What differs per client (role activation, tool
// bindings) is written out per client in the shared body, never silently chosen from one of them.
function renderSkills(clients, folder, add, enabled, index, payload) {
  const envs = clients.map((c) => c.env.id);
  for (const skill of index.skills.filter(enabled)) {
    const dir = `${folder}/${skill.name}`;
    const rules = clients.map((c) => c.manualOnly(dir));
    const frontmatter = Object.assign({}, ...rules.map((rule) => rule.frontmatter));
    const slots = { ...clients[0].slots, SKILL_ROOT: folder };
    for (const file of skill.files) {
      const target = `${dir}/${file.slice(skill.dir.length + 1)}`;
      let content = fillSlots(payload(file), slots);
      if (file === `${skill.dir}/SKILL.md`) {
        const { body } = splitFrontmatter(content);
        content = yamlFrontmatter({ name: skill.name, description: skill.description, ...frontmatter }) + activationSection(skill, clients) + body + sharedBindings(skill, clients, body);
      }
      add({ path: target, kind: "skill", envs, customizable: true, content });
    }
    const extras = new Map(rules.flatMap((rule) => rule.extra).map((extra) => [extra.path, extra]));
    for (const extra of extras.values()) add({ ...extra, kind: "skill", envs });
  }
}

function activationSection(skill, clients) {
  if (!skill.role) return "";
  if (clients.length === 1) return `## Role activation\n\nThis skill runs under the \`${skill.role}\` role. ${clients[0].activationFor(skill)}\n\n`;
  return `## Role activation\n\nThis skill runs under the \`${skill.role}\` role. Follow the line for your client.\n\n${clients.map((c) => `- **${c.label}:** ${c.activationFor(skill)}`).join("\n")}\n\n`;
}

// Lines every client shares come first; the rest are grouped under the client they belong to.
function sharedBindings(skill, clients, body) {
  const perClient = clients.map((c) => ({ label: c.label, lines: c.bindingLines(skill.tokens, null, body) }));
  if (perClient.every((c) => !c.lines.length)) return "";
  if (clients.length === 1) return `${["", "## Bindings", "", `Installed for ${clients[0].label}. This is how each \`#capability:<token>\` and \`#operation:<op>\` in this file runs here.`, "", ...perClient[0].lines].join("\n")}\n`;
  const common = perClient[0].lines.filter((line) => perClient.every((c) => c.lines.includes(line)));
  const out = ["", "## Bindings", "", "This is how each `#capability:<token>` and `#operation:<op>` in this file runs in your client.", "", ...common];
  for (const { label, lines } of perClient) {
    const own = lines.filter((line) => !common.includes(line));
    if (own.length) out.push("", `### ${label}`, "", ...own);
  }
  return `${out.join("\n")}\n`;
}

// Two clients may install the same file (for example a shared skills folder); identical content is one output.
function dedupe(outputs, errors) {
  const byPath = new Map();
  for (const output of outputs) {
    const existing = byPath.get(output.path);
    if (!existing) byPath.set(output.path, output);
    else if (existing.content === output.content && existing.target === output.target && JSON.stringify(existing.add) === JSON.stringify(output.add)) existing.envs = [...new Set([...existing.envs, ...output.envs])];
    else errors.push(`${output.path}: rendered differently for ${existing.envs.join(", ")} and ${output.envs.join(", ")}; choose different folders`);
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function guides(kit, answers, base, runtimeCommand) {
  const root = answers.locations.guideRoot;
  const template = (name) => readText(join(kit.templatesDir, name));
  const start = (env, role) => {
    const name = `${answers.prefix}${role}`;
    return env.route === "native"
      ? `${env.profile.routes.nativeStart.replaceAll("{name}", name)}`
      : `invoke the \`${name}\` skill in a new conversation`;
  };
  const statusLines = (env) => {
    const entries = Object.entries(env.verification);
    const sharedFolder = answers.skillSharing.clients[env.id];
    const folderLine = `- Workflow skills: \`${answers.skillSharing.folder}\`, reached ${sharedFolder.via === "copy" ? `through a client-specific copy (${sharedFolder.reason})` : `${sharedFolder.via === "native" ? "natively" : "through a symlink"} (${sharedFolder.evidence})`}.`;
    if (!entries.length) return `${folderLine}\n- Not verified yet. Bootstrap records each check here after it runs it.`;
    return `${folderLine}\n` + entries.map(([check, result]) => `- ${check}: ${typeof result === "string" ? result : `${result.status}${result.note ? ` (${result.note})` : ""}`}`).join("\n");
  };
  const outputs = [];
  const list = answers.environments.map((env) => `- [${env.profile.label}](${env.id}.md)`).join("\n");
  outputs.push({ path: `${root}/README.md`, kind: "guide", content: fillSlots(template("guide-readme.md"), { ...base, CLIENT_LIST: list }) });
  for (const env of answers.environments) {
    const values = {
      ...base,
      CLIENT: env.profile.label,
      ROUTE: env.route === "native" ? "native agents (the client's agent picker)" : "role skills you invoke by name",
      START_ORCHESTRATOR: start(env, "orchestrator"),
      START_ASK: start(env, "ask"),
      START_KNOWLEDGE_BUILDER: start(env, "knowledge-builder"),
      PLAN_SKILLS: env.route === "native" ? `select \`${answers.prefix}orchestrator\` first, then invoke \`plan-bug-from-id\` or \`plan-user-story-from-id\`` : "invoke `plan-bug-from-id` or `plan-user-story-from-id` in a new conversation; each loads the orchestrator itself",
      DELEGATION: env.delegation === "subprocess" ? `separate \`${env.profile.delegation.subprocess}\` processes` : "native subagents, each with its own context",
      RUNTIME_COMMAND: runtimeCommand,
      VERIFICATION: statusLines(env),
    };
    outputs.push({ path: `${root}/${env.id}.md`, kind: "guide", content: fillSlots(template("guide-environment.md"), values) });
  }
  return outputs;
}
