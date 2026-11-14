#!/usr/bin/env node
// Turns one or more sessions of an installed orchestrator system into a short digest, so an audit reads the evidence
// that matters and not the whole session. Zero dependencies. It only reads: never a session write, never a runtime call.
//
//   node digest.mjs locate --repo <dir> --session <id>... [--answers <file>] [--json]
//   node digest.mjs digest --repo <dir> --session <id>... [--transcript <id>=<file>]... [--answers <file>] [--json]
//
// locate searches the client transcript folders for a session's runtime calls and prints where, never what. digest
// reads a transcript only when it is named with --transcript. --repo defaults to the current directory, --answers to
// agentic-system-maintenance/answers.json under the repo.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { load, summarize } from "./transcript-cost.mjs";

const SESSION_ID = /^[A-Za-z0-9_]{1,100}$/;
const LIMIT = { responses: 10, failed: 15, repeats: 8, logProblems: 10, excerpt: 160 };

class DigestError extends Error {}

function parse(argv) {
  const [command, ...rest] = argv;
  const options = { command, repo: ".", answers: undefined, sessions: [], transcripts: [], json: false };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--json") options.json = true;
    else if (["--repo", "--answers", "--session", "--transcript"].includes(arg)) {
      const value = rest[++i];
      if (value === undefined) throw new DigestError(`${arg} needs a value`);
      if (arg === "--session") options.sessions.push(value);
      else if (arg === "--transcript") options.transcripts.push(value);
      else options[arg.slice(2)] = value;
    } else throw new DigestError(`unknown argument ${arg}`);
  }
  if (!["locate", "digest"].includes(command)) throw new DigestError("usage: node digest.mjs <locate|digest> --repo <dir> --session <id>... [--transcript <id>=<file>]... [--json]");
  if (!options.sessions.length) throw new DigestError("name at least one --session <id>");
  for (const id of options.sessions) if (!SESSION_ID.test(id)) throw new DigestError(`session '${id}' contains unsupported characters. Allowed format: ${SESSION_ID.source}`);
  return options;
}

const expandHome = (path) => (path === "~" || path.startsWith("~/") ? join(homedir(), path.slice(1)) : path);
const readText = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
};
const entries = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []);
const folders = (dir) => entries(dir).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const files = (dir) => entries(dir).filter((e) => e.isFile() && !e.name.startsWith(".")).map((e) => e.name).sort();

function installation(options) {
  const repo = resolve(options.repo);
  const path = options.answers ? resolve(options.answers) : join(repo, "agentic-system-maintenance", "answers.json");
  const answers = readJson(path);
  if (!answers) throw new DigestError(`no installation at ${repo}: ${path} is missing or unreadable. Pass --answers when the maintenance folder has another name.`);
  const sessionsRoot = answers.locations?.sessionsRoot;
  if (!sessionsRoot) throw new DigestError(`${path} has no locations.sessionsRoot`);
  return {
    repo,
    answers,
    sessionsRoot: resolve(repo, expandHome(sessionsRoot)),
    knowledgeRoot: join(repo, answers.locations.knowledgeRoot ?? "knowledge"),
  };
}

// --- locate ------------------------------------------------------------------------------------------------------

const isRuntimeCall = (command) => typeof command === "string" && command.includes("agentic-system.mjs");

// The values of an argument in a runtime call: as a flag, or inside an inline or stdin JSON object.
const argumentValues = (command, name) =>
  [...command.matchAll(new RegExp(`--${name}[ =]["']?([A-Za-z0-9_]+)|"${name}"\\s*:\\s*"([A-Za-z0-9_]+)"`, "gi"))].map((m) => m[1] ?? m[2]);

// The shell commands a transcript ran. Text around them, such as a prompt or a tool result, is never a call.
function commandsOf(text) {
  return text.split("\n").flatMap((line) => {
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      return [];
    }
    if (event?.type === "tool.execution_start") return [event.data?.arguments?.command];
    const content = event?.message?.content;
    return Array.isArray(content) ? content.filter((c) => c?.type === "tool_use").map((c) => c.input?.command) : [];
  }).filter(isRuntimeCall);
}

// A transcript belongs to a session when a runtime call has it as the session argument, not when anything mentions it.
const runtimeCalls = (commands, id) => commands.filter((command) => argumentValues(command, "sessionId").includes(id)).length;

function transcriptFolders(repo) {
  const claude = join(homedir(), ".claude", "projects", repo.replace(/[^A-Za-z0-9]/g, "-"));
  const copilot = join(homedir(), ".copilot", "session-state");
  return [
    ...files(claude).filter((f) => f.endsWith(".jsonl")).map((f) => ({ client: "claude-code", path: join(claude, f) })),
    ...folders(copilot).map((d) => ({ client: "copilot-cli", path: join(copilot, d, "events.jsonl") })).filter((c) => existsSync(c.path)),
  ];
}

function locate(options) {
  const { repo } = installation(options);
  const candidates = transcriptFolders(repo).map((c) => ({ ...c, commands: commandsOf(readFileSync(c.path, "utf8")) }));
  const found = {};
  for (const id of options.sessions) {
    found[id] = candidates.flatMap(({ client, path, commands }) => {
      const calls = runtimeCalls(commands, id);
      if (!calls) return [];
      const stat = statSync(path);
      return [{ client, path, runtimeCalls: calls, bytes: stat.size, modified: stat.mtime.toISOString() }];
    }).sort((a, b) => b.runtimeCalls - a.runtimeCalls);
  }
  return found;
}

// --- session store -------------------------------------------------------------------------------------------------

function issueCandidates(id, artifactNames, log) {
  const seen = new Map();
  const add = (value, from) => {
    if (value && !seen.has(value)) seen.set(value, from);
  };
  for (const name of artifactNames) add(/^(?:work_item|bug|us|issue)_([A-Za-z0-9-]+?)(?:_|\.md$)/.exec(name)?.[1], `artifact ${name.replace(/\.md$/, "")}`);
  add(/work item #?([A-Za-z0-9-]+)/i.exec(log)?.[1], "log");
  add(/^(?:us|bug|issue)_?(\d+)(?:_|$)/i.exec(id)?.[1], "session id");
  return [...seen].map(([value, from]) => ({ id: value, from }));
}

function digestStore(install, id) {
  const dir = join(install.sessionsRoot, id);
  if (!existsSync(join(dir, "session.json"))) throw new DigestError(`session '${id}' was not found under ${install.sessionsRoot}`);
  const session = readJson(join(dir, "session.json")) ?? {};
  const jobs = files(join(dir, "jobs")).flatMap((file) => {
    const job = readJson(join(dir, "jobs", file));
    if (!job) return [];
    const steps = job.steps ?? [];
    return [{ jobId: job.jobId, workflowType: job.workflowType, designId: job.designId ?? null, step: job.currentStep, steps: steps.length, currentStep: steps[job.currentStep - 1] ?? null, atLastStep: steps.length > 0 && job.currentStep === steps.length }];
  });
  const stepsOfJob = Object.fromEntries(files(join(dir, "jobs")).map((file) => [file.replace(/\.json$/, ""), readJson(join(dir, "jobs", file))?.steps ?? []]));
  const designs = folders(join(dir, "designs")).flatMap((designId) => {
    const design = readJson(join(dir, "designs", designId, "design.json"));
    if (!design) return [];
    const count = (key) => (Array.isArray(design[key]) ? design[key].length : 0);
    return [{ designId, status: design.status, approvedAt: design.approvedAt ?? null, modifiedAfterApproval: Boolean(design.modifiedAfterApproval), obligations: count("obligations"), decisions: count("decisions"), operations: Array.isArray(design.path?.operations) ? design.path.operations.length : 0, fileReferences: count("fileReferences"), knowledgeReferences: count("knowledgeReferences"), iterations: count("iterations"), edits: count("history") }];
  });
  const logText = readText(join(dir, "log.md"));
  const logLines = logText.split("\n").filter(Boolean);
  const artifactFiles = files(join(dir, "artifacts"));
  const artifacts = artifactFiles.map((name) => ({ name, bytes: statSync(join(dir, "artifacts", name)).size }));
  const reads = readJson(join(dir, "knowledge-reads.json")) ?? [];
  const referenced = [...new Set(folders(join(dir, "designs")).flatMap((designId) => (readJson(join(dir, "designs", designId, "design.json"))?.knowledgeReferences ?? []).map((k) => k.filePath).filter(Boolean)))];
  return {
    session: id,
    createdAt: session.createdAt ?? null,
    lastActivatedAt: session.lastActivatedAt ?? null,
    jobs,
    stepsOfJob,
    designs,
    issue: { candidates: issueCandidates(id, artifactFiles, logText) },
    log: { lines: logLines.length, problems: logLines.filter((line) => /\b(error|fail(ed|ure)?|reject(ed)?|refus(ed|al)|warn(ing)?|stuck|deadlock)\b/i.test(line)).slice(0, LIMIT.logProblems).map((line) => line.slice(0, LIMIT.excerpt)) },
    memory: { bytes: Buffer.byteLength(readText(join(dir, "memory.md"))) },
    artifacts,
    knowledge: {
      documents: existsSync(install.knowledgeRoot) ? readdirSync(install.knowledgeRoot, { recursive: true }).filter((f) => String(f).endsWith(".md")).length : 0,
      read: reads.length,
      referencedNeverRead: referenced.filter((path) => !reads.includes(path)),
      readNeverReferenced: reads.filter((path) => !referenced.includes(path)),
    },
  };
}

// --- transcripts ----------------------------------------------------------------------------------------------------

const inputKey = (input) => JSON.stringify(input ?? null);

// The same failure repeated differs only in what a client appends or numbers, such as a shell id or a position.
const cleanExcerpt = (text) => text.replace(/\s*<shellId:[^>]*>/g, "").trim();
const failureKey = (type, excerpt) => `${type}\n${excerpt.replace(/\d+/g, "N").slice(0, 80)}`;
const isContract = (path) => typeof path === "string" && /(^|\/)contracts\//.test(path);

// A runtime call joined or piped on its first line breaks the router's rule of one operation per shell command. A leading
// `cd` and a trailing echo of the exit code run no second operation and change no output the host caps, so they do not count.
const withoutWrappers = (line) => line.replace(/^\s*cd\s+(?:"[^"]*"|'[^']*'|\S+)\s*&&\s*/, "").replace(/\s*(?:;|&&)\s*echo\b[^;&|]*\$\?[^;&|]*$/, "");
const breaksCallRule = (command) => /agentic-system\.mjs/.test(command) && /(?:;|&&|\|\|?)\s*\S/.test(withoutWrappers(command.split("\n")[0]).replace(/'[^']*'|"[^"]*"/g, ""));

function steps(responses, stepsOfJob) {
  const out = [];
  let current = null;
  for (const r of responses.filter((x) => x.agent === "main")) {
    const command = typeof r.input?.command === "string" ? r.input.command : "";
    const job = /--jobId[ =]"?([A-Za-z0-9_]+)/.exec(command)?.[1];
    if (r.instruction && (r.instruction !== current?.instruction || (job && job !== current?.job))) {
      const name = job ?? current?.job ?? null;
      current = { job: name, instruction: r.instruction, step: stepsOfJob[name]?.[r.instruction - 1] ?? null, operations: 0, chars: 0, failed: 0, servedParts: 0, startTurn: r.afterTurn, turns: 0 };
      out.push(current);
    }
    if (!current) continue;
    current.chars += r.chars;
    current.turns = Math.max(current.turns, r.afterTurn - current.startTurn + 1);
    if (r.type === "workflow-step-pending" || r.type === "workflow-step-next") current.servedParts++;
    else current.operations++;
    if (r.failed) current.failed++;
  }
  return out.map(({ startTurn, ...step }) => step);
}

// A transcript with runtime calls counts for a session only when it ran one of that session's jobs, or, for a session
// with no job, any call on it. One stray call naming the session must not hand it the whole transcript's usage and failures.
function belongsTo(responses, id, jobIds) {
  const calls = responses.map((r) => r.input?.command).filter(isRuntimeCall);
  // No call to judge by, such as a client whose transcript does not parse: that is unmeasured, not another session's.
  if (!calls.length) return true;
  const own = calls.filter((command) => argumentValues(command, "sessionId").includes(id));
  return jobIds.length ? own.some((command) => argumentValues(command, "jobId").some((job) => jobIds.includes(job))) : own.length > 0;
}

function digestTranscript(file, stepsOfJob, id) {
  if (!existsSync(file)) throw new DigestError(`transcript ${file} does not exist`);
  const t = load(file);
  const summary = summarize(t);
  const failed = new Map();
  const repeats = new Map();
  const contractReads = new Map();
  const brokenCallRules = new Map();
  let helpProbes = 0;
  for (const r of t.responses) {
    const command = typeof r.input?.command === "string" ? r.input.command : "";
    if (r.failed) {
      const excerpt = cleanExcerpt(r.excerpt ?? "");
      const key = failureKey(r.type, excerpt);
      failed.set(key, { type: r.type, count: (failed.get(key)?.count ?? 0) + 1, excerpt: excerpt.slice(0, LIMIT.excerpt) });
    }
    // Each workflow-step-next advances a step, so the identical call is the flow working, not a repeat.
    if (r.input && r.type !== "workflow-step-next") {
      const key = `${r.agent}\n${inputKey(r.input)}`;
      repeats.set(key, { type: r.type, agent: r.agent, calls: (repeats.get(key)?.calls ?? 0) + 1, chars: (repeats.get(key)?.chars ?? 0) + r.chars });
    }
    if (/agentic-system\.mjs/.test(command) && /\s--help\b/.test(command)) helpProbes++;
    const path = r.input?.file_path ?? r.input?.path ?? r.input?.filePath;
    if (isContract(path)) contractReads.set(path, (contractReads.get(path) ?? 0) + r.chars);
    if (command && breaksCallRule(command)) brokenCallRules.set(r.type, (brokenCallRules.get(r.type) ?? 0) + 1);
  }
  const servedSteps = steps(t.responses, stepsOfJob);
  return {
    file,
    client: t.client,
    belongs: belongsTo(t.responses, id, Object.keys(stepsOfJob)),
    usageAvailable: t.usageAvailable,
    turns: summary.turns,
    weighted: t.usageAvailable ? summary.weighted : null,
    perConversation: summary.perAgent,
    largestResponses: summary.perResponse.slice(0, LIMIT.responses),
    spilled: summary.perResponse.reduce((n, r) => n + r.spilled, 0),
    failedTotal: t.responses.filter((r) => r.failed).length,
    failed: [...failed.values()].sort((a, b) => b.count - a.count).slice(0, LIMIT.failed),
    repeatedTotal: [...repeats.values()].reduce((n, r) => n + r.calls - 1, 0),
    repeats: [...repeats.values()].filter((r) => r.calls > 1).sort((a, b) => b.chars - a.chars).slice(0, LIMIT.repeats),
    helpProbes,
    contractReads: [...contractReads].map(([path, chars]) => ({ path, chars })).sort((a, b) => b.chars - a.chars),
    brokenCallRules: [...brokenCallRules].map(([type, count]) => ({ type, count })),
    steps: servedSteps,
  };
}

// --- several sessions -----------------------------------------------------------------------------------------------

function compare(sessions) {
  if (sessions.length < 2) return null;
  const issueOf = (s) => s.issue.candidates[0]?.id ?? null;
  const issues = [...new Set(sessions.map(issueOf))].filter(Boolean);
  const unknown = sessions.filter((s) => !issueOf(s)).map((s) => s.session);
  const mode = unknown.length ? "unknown-issue" : issues.length === 1 ? "same-issue" : "different-issues";

  const seen = new Map();
  for (const s of sessions) {
    for (const t of s.transcripts.filter((x) => x.belongs)) {
      for (const f of t.failed) {
        const key = failureKey(f.type, f.excerpt);
        if (!seen.has(key)) seen.set(key, { type: f.type, excerpt: f.excerpt, sessions: new Set() });
        seen.get(key).sessions.add(s.session);
      }
    }
  }
  const recurring = [...seen.values()].filter((r) => r.sessions.size > 1).map((r) => ({ ...r, sessions: [...r.sessions] }));

  const row = (s) => {
    const own = s.transcripts.filter((t) => t.belongs);
    const measured = own.filter((t) => t.usageAvailable);
    const count = (read) => own.reduce((n, t) => n + read(t), 0);
    return {
      session: s.session,
      issue: issueOf(s),
      clients: [...new Set(own.map((t) => t.client))],
      usage: !s.transcripts.length ? "no transcript" : !own.length ? "another session's transcript" : measured.length === own.length ? "recorded" : measured.length ? "partial" : "unavailable",
      turns: count((t) => t.turns),
      weighted: measured.length === own.length && measured.length ? measured.reduce((n, t) => n + t.weighted, 0) : null,
      failed: count((t) => t.failedTotal),
      repeatedCalls: count((t) => t.repeatedTotal),
      jobs: s.jobs.map((j) => `${j.jobId} ${j.step}/${j.steps}`),
      designStatus: s.designs.map((d) => d.status),
    };
  };
  return { mode, issues, unknownIssue: unknown, rows: mode === "same-issue" ? sessions.map(row) : [], recurring };
}

function digest(options) {
  const install = installation(options);
  const named = options.transcripts.map((value) => {
    const at = value.indexOf("=");
    if (at < 1) throw new DigestError(`--transcript takes <session id>=<file>, got '${value}'`);
    const session = value.slice(0, at);
    if (!options.sessions.includes(session)) throw new DigestError(`--transcript names session '${session}', which is not in --session`);
    return { session, file: resolve(expandHome(value.slice(at + 1))) };
  });
  const sessions = [...new Set(options.sessions)].map((id) => {
    const { stepsOfJob, ...store } = digestStore(install, id);
    return { ...store, transcripts: named.filter((n) => n.session === id).map((n) => digestTranscript(n.file, stepsOfJob, id)) };
  });
  const { answers } = install;
  return {
    repo: install.repo,
    locations: answers.locations,
    tracker: answers.tracker ?? null,
    manageWorkItem: answers.skills?.["manage-work-item"] ?? "unknown",
    workItemBindings: (answers.environments ?? []).map((env) => ({ client: env.id, binding: env.bindings?.["work-item-*"] ?? null })),
    sessions,
    comparison: compare(sessions),
  };
}

// --- text output ----------------------------------------------------------------------------------------------------

function textLocate(found) {
  const lines = [];
  for (const [id, candidates] of Object.entries(found)) {
    lines.push(`${id}: ${candidates.length ? "" : "no transcript found"}`);
    for (const c of candidates) lines.push(`  ${c.client}  ${c.runtimeCalls} runtime calls  ${Math.round(c.bytes / 1024)} KB  ${c.modified}  ${c.path}`);
  }
  lines.push("Searched Claude Code and Copilot CLI transcripts only. For an OpenCode run, export its conversation with `opencode session export <session> > <file>` (the session from `opencode session list`, in the repository) and pass that file with --transcript.");
  return lines.join("\n");
}

function textTranscript(t, lines) {
  lines.push(`\n## Transcript (${t.client}) ${t.file}`);
  if (!t.belongs) lines.push("WARNING: this transcript ran no job of this session. Its figures below are another session's: they are left out of the comparison and must not be reported for this session.");
  else if (!t.steps.length) lines.push("WARNING: this transcript ran no workflow step. Check it is this session's run and not a side conversation before reporting its figures.");
  lines.push(`${t.turns} model turns. Usage ${t.usageAvailable ? `recorded, weighted input-equivalent tokens ${t.weighted}` : "unavailable"}. Spilled responses ${t.spilled}. --help probes ${t.helpProbes}.`);
  if (t.perConversation.length) lines.push(`Conversations (turns, weighted): ${t.perConversation.map((a) => `${a.agent} ${a.turns}, ${a.weighted}`).join("; ")}`);
  lines.push(`Largest responses (calls, chars): ${t.largestResponses.map((r) => `${r.type} ${r.calls}, ${r.chars}`).join("; ")}`);
  if (t.failed.length) {
    lines.push(`Failed calls (${t.failedTotal}):`);
    for (const f of t.failed) lines.push(`  ${f.count}x ${f.type}: ${f.excerpt.replace(/\s+/g, " ")}`);
  }
  if (t.repeats.length) lines.push(`Identical calls repeated (${t.repeatedTotal} extra; calls, chars): ${t.repeats.map((r) => `${r.type} in ${r.agent} ${r.calls}, ${r.chars}`).join("; ")}`);
  if (t.contractReads.length) lines.push(`Contracts read (chars): ${t.contractReads.map((c) => `${c.path} ${c.chars}`).join("; ")}`);
  if (t.brokenCallRules.length) lines.push(`Runtime calls joined or piped: ${t.brokenCallRules.map((r) => `${r.type} ${r.count}`).join("; ")}`);
  if (t.steps.length) {
    lines.push("Steps (main conversation): instruction, step, operations, chars, failed, parts served");
    for (const s of t.steps) lines.push(`  ${s.job} ${s.instruction} ${s.step ?? "?"}: ${s.operations}, ${s.chars}, ${s.failed}, ${s.servedParts}`);
  }
}

function textDigest(result) {
  const lines = [`Tracker: ${result.tracker?.adapter ?? "none"}. manage-work-item: ${result.manageWorkItem}.`];
  for (const s of result.sessions) {
    lines.push(`\n# Session ${s.session}`);
    lines.push(`Issue candidates: ${s.issue.candidates.map((c) => `${c.id} (${c.from})`).join(", ") || "none"}`);
    for (const j of s.jobs) lines.push(`Job ${j.jobId} ${j.workflowType}: step ${j.step}/${j.steps} ${j.currentStep ?? ""}${j.atLastStep ? " (last step)" : ""}`);
    for (const d of s.designs) lines.push(`Design ${d.designId}: ${d.status}${d.modifiedAfterApproval ? ", modified after approval" : ""}; ${d.obligations} obligations, ${d.decisions} decisions, ${d.operations} operations, ${d.fileReferences} files, ${d.knowledgeReferences} knowledge references, ${d.iterations} iterations, ${d.edits} edits`);
    lines.push(`Log ${s.log.lines} lines. Memory ${s.memory.bytes} bytes. Artifacts: ${s.artifacts.map((a) => a.name).join(", ") || "none"}`);
    for (const p of s.log.problems) lines.push(`  ${p}`);
    lines.push(`Knowledge: ${s.knowledge.read} of ${s.knowledge.documents} documents read. Referenced, never read: ${s.knowledge.referencedNeverRead.join(", ") || "none"}. Read, never referenced: ${s.knowledge.readNeverReferenced.join(", ") || "none"}.`);
    if (!s.transcripts.length) lines.push("No transcript: tokens and calls are not measured for this session.");
    for (const t of s.transcripts) textTranscript(t, lines);
  }
  const c = result.comparison;
  if (c) {
    lines.push(`\n# Comparison: ${c.mode}${c.issues.length ? ` (issues ${c.issues.join(", ")})` : ""}`);
    if (c.unknownIssue.length) lines.push(`No issue clue for: ${c.unknownIssue.join(", ")}. Ask which issue each worked on.`);
    for (const r of c.rows) lines.push(`${r.session}: ${r.clients.join("+") || "no client"}, usage ${r.usage}, weighted ${r.weighted ?? "unavailable"}, turns ${r.turns}, failed ${r.failed}, repeated ${r.repeatedCalls}, jobs ${r.jobs.join(" ")}, design ${r.designStatus.join(" ") || "none"}`);
    for (const r of c.recurring) lines.push(`Recurring in ${r.sessions.join(", ")}: ${r.type}: ${r.excerpt.replace(/\s+/g, " ")}`);
  }
  return lines.join("\n");
}

try {
  const options = parse(process.argv.slice(2));
  const result = options.command === "locate" ? locate(options) : digest(options);
  console.log(options.json ? JSON.stringify(result, null, 2) : options.command === "locate" ? textLocate(result) : textDigest(result));
} catch (error) {
  if (!(error instanceof DigestError)) throw error;
  console.error(`digest: ${error.message}`);
  process.exit(1);
}
