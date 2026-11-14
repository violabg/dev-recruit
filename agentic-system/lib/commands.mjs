// The command table: one entry per runtime capability token (system/canonical/capabilities.yaml), in the order
// `--help` lists them. It is plain data, so validation (api.mjs), help and the role bindings (help.mjs) and the
// step's command definitions (workflow.mjs) all read the same declaration.
//
//   args      the arguments the command takes at the top level, shown in help and in the role bindings
//   aliases   other names the runtime accepts for those arguments, never shown
//   freeText  the command takes its text under any field name, so it checks no argument name
//   request   the schema def of `request`: the command takes { sessionId, jobId, request }
//   rows      the schema def of each row of `request.rows`, which the request schema leaves open
//   beside    Lab-authored arguments a request command takes beside `request`
//   notes     what an argument means, where its name alone does not say
const SESSION = ["sessionId"];
const JOB = ["sessionId", "jobId"];
const FRONT_MATTER = ["name", "description", "intendedUse", "mimeType", "origin"];
const FRONT_MATTER_ALIASES = ["artifactFrontMatter", "artifactName", "intended_use", "use", "mime_type"];
// Lab-authored (contracts/design-model.md, edits and kept requests).
const EDIT = { edit: "changes text inside a field in place: [{ id, field, from, to }], the id as the design shows it, such as CT1" };
// The name of an artifact (contracts/session-store.md): stated in the argument list, because a delegate that
// writes one sees only that list.
const ARTIFACT_NAME = { name: "letters, digits, `.`, `_` and `-` only, no spaces" };
const KEPT = ["draft", "set", "drop", "move", "replace"];

export const COMMANDS = {
  "session-list": { args: [] },
  "session-activate": { args: SESSION },
  "session-memory-read": { args: SESSION },
  "session-memory-append": { args: SESSION, freeText: true },
  "session-event-log": { args: SESSION, freeText: true },
  "session-artifact-write": { args: [...SESSION, ...FRONT_MATTER, "content", "contentFile"], aliases: FRONT_MATTER_ALIASES, notes: ARTIFACT_NAME },
  "session-artifact-read": { args: [...SESSION, "name"], aliases: ["artifact", "artifactId", "artifactName"] },
  "session-artifact-list": { args: SESSION },
  "session-image-attach": { args: [...SESSION, ...FRONT_MATTER, "blobUrl"], aliases: FRONT_MATTER_ALIASES },

  "workflow-types-list": { args: [] },
  "workflow-job-activate": { args: [...JOB, "agentName", "designId", "workflowType"] },
  "workflow-step-pending": { args: [...JOB, "part"] },
  "workflow-step-next": { args: JOB },

  "design-obligations": { request: "rowRequest", rows: "obligation", beside: { outline: "with Read: one line per obligation, its id and claim", ...EDIT } },
  "design-file-references": { request: "rowRequest", rows: "fileReference", beside: EDIT },
  "design-decisions": { request: "rowRequest", rows: "decision", beside: EDIT },
  "design-knowledge-references": { request: "knowledgeReferencesRequest" },
  "design-overview": { request: "overview", beside: EDIT },
  "design-contracts": { request: "contractsRequest", beside: EDIT },
  "design-file-system": { request: "fileSystemRequest", beside: EDIT },
  "design-operations": { request: "operationsRequest", beside: EDIT },
  "design-checks": { args: [...JOB, "acceptExternalEdit"] },
  "design-snapshot": {
    args: [...JOB, "section", "ids", "fields", "brief", "grep", "part", "revision"],
    notes: {
      section: "one section only, such as Operations",
      ids: "those items only, such as IM3,CT1",
      fields: "those fields of each row only, such as instructions",
      brief: "true: the start of each row",
      grep: "the rows that contain this text, with the text around each match",
    },
  },
  "design-verification-view": { args: [...JOB, "part", "revision"] },
  "design-implementation-operation": { args: [...JOB, "operationId", "part"], aliases: ["id"] },
  "design-implementation-operation-close": { args: JOB },
  "design-document": { args: JOB },
  "design-approve": { request: "approve" },
  "design-operation-status": { request: "operationStatus" },
  "design-iteration-open": { request: "iterationOpen" },
  "design-iteration-close": { request: "iterationClose" },

  "knowledge-catalog": { args: [] },
  "knowledge-read": { args: [...SESSION, "fileIds", "part"], aliases: ["fileId", "ids", "id"] },
  "knowledge-create": { args: ["title", "content", "tier", "folder", "keywords", "intent"] },
  "knowledge-update": { args: ["fileId", "content", "intent"], aliases: ["fileIds", "id", "ids"] },
  "knowledge-index-rebuild": { args: [] },

  "codebase-clusters": { args: ["WorkspacePath", "fileExtension", "matches"] },
  "codebase-cluster-files": { args: ["WorkspacePath", "fileExtension", "clusterName"] },

  "documentation-templates-list": { args: ["templatesDirectory"] },
  "documentation-template-read": { args: ["templateNameOrPath"] },
  "documentation-check": { args: ["templateNameOrPath", "outputFile", "outputContent", "mode"] },
};

// The design operations whose arguments are { sessionId, jobId, request }. Every other command takes its
// arguments at the top level.
export const REQUEST_TOKENS = new Set(Object.keys(COMMANDS).filter((token) => COMMANDS[token].request));

// The arguments of a kept request (contracts/design-model.md, kept requests): accepted beside `request` by every
// design write, and shown only by the refusal that keeps one.
export const KEPT_ARGUMENTS = KEPT;

// Every top-level name a command accepts, lower-cased: the envelope, its arguments and their aliases.
export function acceptedArguments(token) {
  const command = COMMANDS[token];
  const names = [...JOB, "request", ...(command.args ?? []), ...(command.aliases ?? []), ...Object.keys(command.beside ?? {}), ...(command.request ? KEPT : [])];
  return new Set(names.map((name) => name.toLowerCase()));
}
