// THE runtime contract: one handler per runtime capability token (system/canonical/capabilities.yaml), declared in
// commands.mjs. A handler receives the context, the argument object and the caller ({ role, client }), and returns
// the response text, or { output, exitCode } for a structured refusal. Adapters (the CLI today, an MCP server if ever
// needed) only translate transport around this table and hold no logic of their own.
import { join } from "node:path";
import * as codebase from "./codebase.mjs";
import { COMMANDS, REQUEST_TOKENS, acceptedArguments } from "./commands.mjs";
import * as design from "./design.mjs";
import * as documentation from "./documentation.mjs";
import { requestProperties } from "./help.mjs";
import { keepRequest, keptNote, resolveKept } from "./kept.mjs";
import * as knowledge from "./knowledge.mjs";
import { bounded, storedPart } from "./responses.mjs";
import * as session from "./session.mjs";
import { arg, jobFlags, linedJson, withLock } from "./util.mjs";
import * as workflow from "./workflow.mjs";

export { REQUEST_TOKENS };

const HANDLERS = {
  "session-list": (ctx) => session.sessionList(ctx),
  "session-activate": (ctx, args) => session.sessionActivate(ctx, args),
  "session-memory-read": (ctx, args) => session.memoryRead(ctx, args),
  "session-memory-append": (ctx, args) => session.memoryAppend(ctx, args),
  "session-event-log": (ctx, args) => session.eventLog(ctx, args),
  "session-artifact-write": (ctx, args) => session.artifactWrite(ctx, args),
  "session-artifact-read": (ctx, args) => session.artifactRead(ctx, args),
  "session-artifact-list": (ctx, args) => session.artifactList(ctx, args),
  "session-image-attach": (ctx, args) => session.imageAttach(ctx, args),

  "workflow-types-list": (ctx) => workflow.workflowTypesList(ctx),
  "workflow-job-activate": (ctx, args) => workflow.jobActivate(ctx, args),
  "workflow-step-pending": (ctx, args, caller) => workflow.stepPending(ctx, args, caller),
  "workflow-step-next": (ctx, args, caller) => workflow.stepNext(ctx, args, caller),

  "design-obligations": (ctx, args) => design.rowTool(ctx, "design-obligations", args),
  "design-file-references": (ctx, args) => design.rowTool(ctx, "design-file-references", args),
  "design-decisions": (ctx, args) => design.rowTool(ctx, "design-decisions", args),
  "design-knowledge-references": (ctx, args) => design.knowledgeReferences(ctx, args),
  "design-overview": (ctx, args) => design.overview(ctx, args),
  "design-contracts": (ctx, args) => design.sectionWrite(ctx, "design-contracts", args),
  "design-file-system": (ctx, args) => design.sectionWrite(ctx, "design-file-system", args),
  "design-operations": (ctx, args) => design.sectionWrite(ctx, "design-operations", args),
  "design-checks": (ctx, args) => design.checksTool(ctx, args),
  "design-snapshot": (ctx, args, caller) => design.snapshotTool(ctx, args, caller),
  "design-verification-view": (ctx, args, caller) => design.verificationViewTool(ctx, args, caller),
  "design-implementation-operation": (ctx, args, caller) => design.implementationOperation(ctx, args, caller),
  "design-implementation-operation-close": (ctx, args) => design.implementationOperationClose(ctx, args),
  "design-document": (ctx, args) => design.documentTool(ctx, args),
  "design-approve": (ctx, args) => design.approve(ctx, args),
  "design-operation-status": (ctx, args) => design.operationStatus(ctx, args),
  "design-iteration-open": (ctx, args) => design.iterationOpen(ctx, args),
  "design-iteration-close": (ctx, args) => design.iterationClose(ctx, args),

  "knowledge-catalog": (ctx) => knowledge.catalog(ctx),
  "knowledge-read": (ctx, args, caller) => knowledge.read(ctx, args, caller),
  "knowledge-create": (ctx, args) => knowledge.create(ctx, args),
  "knowledge-update": (ctx, args) => knowledge.update(ctx, args),
  "knowledge-index-rebuild": (ctx) => knowledge.rebuild(ctx),

  "codebase-clusters": (ctx, args) => codebase.clusters(ctx, args),
  "codebase-cluster-files": (ctx, args) => codebase.clusterFiles(ctx, args),

  "documentation-templates-list": (ctx, args) => documentation.listTemplates(ctx, args),
  "documentation-template-read": (ctx, args) => documentation.readTemplate(ctx, args),
  "documentation-check": (ctx, args) => documentation.checkDocument(ctx, args),
};

// The handlers in the order of the command table, which is the order `--help` lists them. A command without a
// handler, or a handler without a command, fails here and in `validate:canonical`.
export const handlers = Object.fromEntries(Object.keys(COMMANDS).map((token) => [token, HANDLERS[token]]));
for (const token of Object.keys(HANDLERS)) if (!COMMANDS[token]) throw new Error(`handler ${token} has no entry in the command table`);
for (const token of Object.keys(COMMANDS)) if (!HANDLERS[token]) throw new Error(`command ${token} has no handler`);

// Agents learn the design envelope and send it to every token. For a token without a request, the fields
// inside `request` are read as top-level arguments (a top-level value wins), instead of being ignored.
function unwrapRequest(args) {
  const request = args?.request;
  if (!request || typeof request !== "object" || Array.isArray(request)) return args;
  const { request: _, ...rest } = args;
  return { ...request, ...rest };
}

// Lab-authored: a design write whose request fields arrive beside sessionId and jobId (`--operation Read`, or a flat
// JSON object) means the same call, so the fields are read as the request. A field sent in both places is refused.
function foldRequest(ctx, token, args) {
  const accepted = acceptedArguments(token);
  const declared = requestProperties(ctx, token);
  // A section write also answers a Read (design.mjs, sectionRead), which the request schema does not declare.
  const read = declared.includes("add") ? ["operation", "ids"] : [];
  const fields = new Map([...declared, ...read].map((name) => [name.toLowerCase(), name]));
  const flat = Object.keys(args).filter((key) => !accepted.has(key.toLowerCase()) && fields.has(key.toLowerCase()));
  if (!flat.length) return { args };
  const request = args.request === undefined ? {} : args.request;
  if (request === null || typeof request !== "object" || Array.isArray(request)) return { args };
  const twice = flat.filter((key) => fields.get(key.toLowerCase()) in request);
  if (twice.length) return { refused: `${token} failed: ${twice.map((key) => `'${key}'`).join(", ")} was sent both inside request and beside it. Nothing was applied: send it once, inside request.` };
  const folded = { ...args, request: { ...request } };
  for (const key of flat) {
    folded.request[fields.get(key.toLowerCase())] = args[key];
    delete folded[key];
  }
  return { args: folded };
}

// The arguments each command accepts (the upstream contract: an unknown property applies nothing and is an error).
// Names compare case-insensitively, as `arg` reads them. The envelope fields `sessionId`, `jobId` and `request` are
// never unknown: agents send the design envelope to every command, so they are ignored or unwrapped where they mean nothing.
function unknownArguments(token, args) {
  const command = COMMANDS[token];
  if (command.freeText) return null;
  const known = acceptedArguments(token);
  const unknown = Object.keys(args ?? {}).filter((name) => !known.has(name.toLowerCase()));
  if (!unknown.length) return null;
  const shown = command.request ? ["sessionId", "jobId", "request", ...Object.keys(command.beside ?? {})] : command.args;
  return `${token} failed: unknown argument ${unknown.map((name) => `'${name}'`).join(", ")}. Nothing was applied. Arguments: ${shown.join(", ") || "none"}.`;
}

// Lab-authored: knowledge has one writer, whatever a role's upstream tool map grants (contracts/knowledge-catalog.md).
const KNOWLEDGE_WRITES = new Set(["knowledge-create", "knowledge-update"]);

// A role runs only the tokens its contract names (`roles` in the runtime config, rendered by Bootstrap). The
// roles are named by the agents themselves, so this stops a wrong call, not a hostile one; the client's own tool
// limits are the stronger layer where it has them. Without a table, nothing is restricted.
export function roleRefusal(ctx, role, token) {
  if (role !== undefined && KNOWLEDGE_WRITES.has(token) && role !== "knowledge-builder") {
    return `'${token}' is not available to the ${role} role, and nothing was applied: only knowledge-builder changes knowledge.`;
  }
  if (role === undefined || !ctx.roles || !handlers[token]) return null;
  const tokens = ctx.roles[role];
  if (!tokens) return `unknown role '${role}'. Roles: ${Object.keys(ctx.roles).join(", ")}.`;
  if (tokens.includes(token)) return null;
  return `'${token}' is not available to the ${role} role, and nothing was applied. Its runtime commands: ${tokens.join(", ") || "none"}.`;
}

// The neutral operations a role runs with its client's own tools (conversion.yaml `valid_operations` minus
// `runtime`). Agents send them here when they read `#operation:<op>` as a runtime token.
const HOST_OPERATIONS = new Set(["read", "search", "write", "terminal", "question", "delegate"]);

// The capability tokens a client binds to its own tools (`kind: host` in capabilities.yaml, the operations above aside).
const CLIENT_TOOLS = new Set(["visual-evidence", "work-item-retrieval", "work-item-type-retrieval", "work-item-batch-retrieval", "work-item-comment-retrieval", "work-item-create", "work-item-update", "wiki-catalog-read", "wiki-page-list", "wiki-page-read"]);

// An unknown token is a wrong call, never a missing runtime: the answer says so, or agents halt on the
// availability guard.
function unknownCommand(token) {
  const commands = `Runtime commands: ${Object.keys(handlers).join(", ")}`;
  if (HOST_OPERATIONS.has(token)) {
    const how = token === "question" ? "ask the user with your client's own question tool" : `use your client's own tool for \`#operation:${token}\``;
    return `'${token}' is not a runtime command: it is a host operation, so ${how} (the Bindings section of your role file names it). The runtime is installed and working; this is not a runtime outage. ${commands}`;
  }
  if (CLIENT_TOOLS.has(token)) {
    return `'${token}' is not a runtime command: it is a client tool, bound in your role file or in the prompt that started you. The runtime is installed and working; this is not a runtime outage.`;
  }
  return `unknown command '${token}'. The runtime is installed and working; this is not a runtime outage. ${commands}. \`--help\` alone lists the arguments of every command.`;
}

// The context a call runs in: the part limit of the caller's client, when the config records one for it
// (contracts/workflow-loop.md, Parts).
function contextOf(ctx, caller) {
  const limit = caller.client ? ctx.partLimits?.[caller.client] : undefined;
  return Number.isInteger(limit) && limit > 0 ? { ...ctx, partLimit: limit } : ctx;
}

// A refused design write of some size is kept, and the refusal says how to correct it without sending it again.
function refusedWrite(ctx, token, args, caller, result) {
  // An edit is small by nature and is corrected by sending it again.
  if (!REQUEST_TOKENS.has(token) || result.exitCode !== 1 || arg(args, "edit") !== undefined) return result;
  const id = keepRequest(ctx, token, args);
  if (!id) return result;
  const note = keptNote(token, id, ` ${jobFlags(args, caller)}`);
  let parsed = null;
  try {
    parsed = JSON.parse(result.output);
  } catch {}
  const output = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? linedJson({ ...parsed, kept: note }) : `${result.output.trimEnd()}\n${note}`;
  return { output, exitCode: 1 };
}

// Runs one token and normalizes the result to { output, exitCode }, never longer than the part limit: `caller`
// names the role and the client the adapter was given, and `responseId` serves a part of an earlier long response
// without running the operation again (contracts/workflow-loop.md, Parts).
export async function call(baseCtx, token, input = {}, caller = {}) {
  const handler = handlers[token];
  if (!handler) return { output: unknownCommand(token), exitCode: 2 };
  const ctx = contextOf(baseCtx, caller);
  if (arg(input, "responseId") !== undefined) return storedPart(ctx, token, input, caller);
  let args = input ?? {};
  try {
    if (REQUEST_TOKENS.has(token)) {
      if (arg(args, "draft") !== undefined) args = resolveKept(ctx, token, args);
      const folded = foldRequest(ctx, token, args);
      if (folded.refused) return { output: folded.refused, exitCode: 1 };
      args = folded.args;
    }
    const refused = unknownArguments(token, args);
    if (refused) return { output: refused, exitCode: 1 };
    if (!REQUEST_TOKENS.has(token)) args = unwrapRequest(args);
    // A design call reads, changes and seals design.json: parallel design writes run one after the other.
    const run = () => handler(ctx, args, caller);
    const result = await (token.startsWith("design-") ? withLock(join(ctx.runtimeRoot, ".design-lock"), run) : run());
    const answer = typeof result === "string" ? { output: result, exitCode: 0 } : result;
    return bounded(ctx, token, refusedWrite(ctx, token, args, caller, answer), caller);
  } catch (error) {
    if (error && "payload" in error) {
      const answer = { output: error.payload ? linedJson(error.payload) : error.message, exitCode: 1 };
      return bounded(ctx, token, refusedWrite(ctx, token, args, caller, answer), caller);
    }
    throw error;
  }
}
