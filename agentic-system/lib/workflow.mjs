// Workflow loop: workflow types, jobs, and step serving (contracts/workflow-loop.md).
// The runtime is the only clock: it serves one instruction at a time and never shows a future step.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { COMMANDS } from "./commands.mjs";
import { createDesign, designExists } from "./design-store.mjs";
import { commandDefinition } from "./help.mjs";
import { knowledgeChangedOutsideRuntime, knowledgeHashes } from "./knowledge.mjs";
import { requireSession } from "./session.mjs";
import { RuntimeError, arg, iso, jobFlags, readJson, requireId, requireString, servePart, writeJson } from "./util.mjs";

// workflow-types.yaml is generated with a fixed, simple shape; this reader accepts exactly that shape.
function loadWorkflowTypes(ctx) {
  const path = join(ctx.workflowsRoot, "workflow-types.yaml");
  if (!existsSync(path)) throw new RuntimeError(`workflow files are missing: ${path}`);
  const types = [];
  let current = null;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    let match;
    if ((match = line.match(/^ {2}- id: (\S+)$/))) types.push((current = { id: match[1], steps: [] }));
    else if (current && (match = line.match(/^ {4}(name|description): (.+)$/))) current[match[1]] = JSON.parse(match[2]);
    else if (current && (match = line.match(/^ {6}- (\S+)$/))) current.steps.push(match[1]);
  }
  return types;
}

export function workflowTypesList(ctx) {
  const lines = loadWorkflowTypes(ctx).map((t) => `- ${t.id}: ${t.name}. ${t.description}`);
  return `Available workflow types:\n${lines.join("\n")}`;
}

function jobPath(ctx, sessionId, jobId) {
  return join(ctx.sessionsRoot, sessionId, "jobs", `${jobId}.json`);
}

export function loadJob(ctx, args, tool) {
  const sessionId = arg(args, "sessionId");
  requireSession(ctx, sessionId, tool);
  const jobId = requireId(arg(args, "jobId"), "jobId", tool);
  const job = readJson(jobPath(ctx, sessionId, jobId), null);
  if (!job) throw new RuntimeError(`${tool} failed: job '${jobId}' does not exist in session '${sessionId}'. Activate it with workflow-job-activate.`);
  return job;
}

function saveJob(ctx, job) {
  writeJson(jobPath(ctx, job.sessionId, job.jobId), job);
}

// A DESIGN job builds its design. Since 3.0.4 a FAST_IMPLEMENTATION job registers and re-reads the knowledge
// references of its job (design-knowledge-references), so it keeps them in a job design of its own, with no
// approval gate. DOCUMENTATION jobs have none unless the developer starts them on an existing design.
const JOB_DESIGN_WORKFLOWS = new Set(["DESIGN", "FAST_IMPLEMENTATION"]);

export function jobActivate(ctx, args) {
  const tool = "workflow-job-activate";
  const sessionId = arg(args, "sessionId");
  requireSession(ctx, sessionId, tool);
  const jobId = requireId(arg(args, "jobId"), "jobId", tool);
  const workflowType = requireString(arg(args, "workflowType"), "workflowType", tool);
  const type = loadWorkflowTypes(ctx).find((t) => t.id === workflowType);
  if (!type) {
    throw new RuntimeError(`${tool} failed: unknown workflowType '${workflowType}'. Call workflow-types-list and ask the developer which workflow to start.`);
  }
  const requestedDesign = arg(args, "designId");
  const existing = readJson(jobPath(ctx, sessionId, jobId), null);
  if (existing) {
    if (existing.workflowType !== workflowType) {
      throw new RuntimeError(`${tool} failed: job '${jobId}' already runs ${existing.workflowType}; start a new job for ${workflowType}.`);
    }
    return `Agent job resumed;\nJobId: ${jobId}\nDesignId: ${existing.designId ?? "<none>"}\nCurrent instruction: ${existing.currentStep}/${existing.steps.length}`;
  }
  let designId = null;
  if (requestedDesign) {
    requireId(requestedDesign, "designId", tool);
    if (!designExists(ctx, sessionId, requestedDesign)) throw new RuntimeError(`${tool} failed: design '${requestedDesign}' does not exist in session '${sessionId}'.`);
    designId = requestedDesign;
  } else if (JOB_DESIGN_WORKFLOWS.has(workflowType)) {
    designId = jobId;
    if (!designExists(ctx, sessionId, designId)) createDesign(ctx, sessionId, designId, jobId);
  }
  saveJob(ctx, {
    jobId,
    sessionId,
    agentName: arg(args, "agentName") ?? "orchestrator",
    workflowType,
    designId,
    steps: type.steps,
    currentStep: 0,
    createdAt: iso(ctx.now()),
    knowledgeBaseline: knowledgeHashes(ctx),
  });
  return `Agent job created;\nJobId: ${jobId}\nDesignId: ${requestedDesign ?? "<none>"}`;
}

const namedTokens = (instruction) => [...new Set([...instruction.matchAll(/#capability:([a-z-]+)/g)].map((match) => match[1]))];

// Lab-authored (contracts/workflow-loop.md, Command definitions). The design writes an instruction names for the
// first time in its job are defined after it: their arguments and every field of their request. Agents asked `--help`
// for each one before its first write, a turn per command. A later instruction only says where each was defined.
// `job.defined` records the instruction that defined each command, so the same instruction always reads the same.
function commandDefinitions(ctx, job, instruction, role) {
  const allowed = role ? ctx.roles?.[role] : null;
  const writes = namedTokens(instruction).filter((token) => COMMANDS[token]?.request && job.defined?.[token] && (!allowed || allowed.includes(token)));
  if (!writes.length) return "";
  const here = writes.filter((token) => job.defined[token] === job.currentStep);
  const earlier = writes.filter((token) => job.defined[token] !== job.currentStep);
  const out = ["", "---", "", "## RUNTIME COMMANDS OF THIS INSTRUCTION", "", "The arguments of the design writes this instruction names, from the schema the runtime validates by. Use them as given: no `--help` call is needed first."];
  for (const token of here) out.push("", commandDefinition(ctx, token));
  if (earlier.length) out.push("", `Defined with an earlier instruction, and unchanged: ${earlier.map((token) => `${token} (instruction ${job.defined[token]})`).join(", ")}. \`<command> --help\` prints one again.`);
  return `${out.join("\n")}\n`;
}

// Records the commands the instruction the job just reached defines, before it is served.
function defineCommands(ctx, job) {
  const path = join(ctx.workflowsRoot, `${job.steps[job.currentStep - 1]}.md`);
  if (!existsSync(path)) return;
  job.defined ??= {};
  for (const token of namedTokens(readFileSync(path, "utf8"))) if (COMMANDS[token]?.request) job.defined[token] ??= job.currentStep;
}

function serve(ctx, job, role) {
  const ref = job.steps[job.currentStep - 1];
  const path = join(ctx.workflowsRoot, `${ref}.md`);
  if (!existsSync(path)) throw new RuntimeError(`instruction file is missing: ${path}`);
  const instruction = readFileSync(path, "utf8").trimEnd();
  // Since 3.0.4 no instruction writes a user instruction register, so none is appended.
  return `Instruction ${job.currentStep}/${job.steps.length}.\n${instruction}\n` + commandDefinitions(ctx, job, instruction, role);
}

// A long instruction is served in parts that start at a paragraph. workflow-step-next always serves part 1;
// the rest of the same instruction comes from workflow-step-pending, which never advances the workflow.
function servePartOf(ctx, job, args, tool, caller) {
  return servePart(serve(ctx, job, caller?.role), args, {
    tool,
    limit: ctx.partLimit,
    starts: (line, previous) => line.trim() !== "" && previous !== undefined && previous.trim() === "",
    next: (k) => `call workflow-step-pending with part ${k} (CLI: ${jobFlags(job, caller)} --part ${k}) to read the rest of instruction ${job.currentStep}; it does not advance the workflow.`,
  });
}

export function stepPending(ctx, args, caller) {
  const job = loadJob(ctx, args, "workflow-step-pending");
  if (job.currentStep === 0) {
    job.currentStep = 1;
    defineCommands(ctx, job);
    saveJob(ctx, job);
  }
  return servePartOf(ctx, job, args, "workflow-step-pending", caller);
}

export function stepNext(ctx, args, caller) {
  const job = loadJob(ctx, args, "workflow-step-next");
  if (job.currentStep === 0) throw new RuntimeError("workflow-step-next failed: request the first instruction with workflow-step-pending.");
  if (job.currentStep >= job.steps.length) {
    throw new RuntimeError(
      `workflow-step-next failed: the workflow is complete. Instruction ${job.steps.length}/${job.steps.length} was the final instruction; do not call workflow-step-next again.`,
    );
  }
  // No workflow changes knowledge. A job created before this check has no baseline and is not checked.
  const outside = job.knowledgeBaseline ? knowledgeChangedOutsideRuntime(ctx, job.knowledgeBaseline) : [];
  if (outside.length) {
    throw new RuntimeError(`workflow-step-next failed: knowledge changed outside knowledge-create and knowledge-update: ${outside.join(", ")}. No workflow agent may edit knowledge, and the step did not advance. Halt and report this to the developer: the change must be restored or applied through knowledge-builder.`);
  }
  job.currentStep += 1;
  defineCommands(ctx, job);
  saveJob(ctx, job);
  return servePartOf(ctx, job, { part: 1 }, "workflow-step-next", caller);
}
