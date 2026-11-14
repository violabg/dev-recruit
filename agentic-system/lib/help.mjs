// What a command takes, from the command table and the request schema: `--help`, the role bindings and the command
// definitions a served step carries all read it here, so an agent learns the arguments from the source of truth
// instead of guessing them.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { COMMANDS, REQUEST_TOKENS } from "./commands.mjs";

const usage = (token) => `usage: node agentic-system.mjs ${token} [--json <file>|-|'<inline JSON>'] [--<argument> <value> ...]`;

// The `## <token>` section of a contract or the paragraph that defines the token, best match first: its own
// definition, then a definition it shares with other tokens, then a paragraph that opens by naming it. A paragraph
// that ends with a colon or inside a code fence continues into the next one, so the shape it announces comes along.
function definition(text, token, tier) {
  const lines = text.split("\n");
  const heading = lines.findIndex((l) => l.trim() === `## ${token}`);
  if (heading !== -1) {
    if (tier !== 0) return undefined;
    const end = lines.findIndex((l, i) => i > heading && /^## /.test(l));
    return lines.slice(heading, end === -1 ? undefined : end).join("\n").trim();
  }
  const named = `\`#capability:${token}\``;
  const first = (p) => p.trim().split("\n")[0];
  const matches = [
    (p) => new RegExp(`^\`(#capability:)?${token}\` —`).test(p.trim()),
    (p) => first(p).startsWith("`#capability:") && first(p).includes(" — ") && first(p).includes(named),
    (p) => first(p).includes(named),
  ][tier];
  const paragraphs = text.split(/\n\s*\n/);
  const at = paragraphs.findIndex(matches);
  if (at === -1) return undefined;
  let end = at;
  const unfinished = () => {
    const shown = paragraphs.slice(at, end + 1).join("\n\n");
    return shown.trim().endsWith(":") || (shown.match(/^```/gm) ?? []).length % 2 === 1;
  };
  while (end + 1 < paragraphs.length && unfinished()) end += 1;
  return paragraphs.slice(at, end + 1).join("\n\n").trim();
}

let cachedSchema = null;
export function requestSchema(ctx) {
  cachedSchema ??= JSON.parse(readFileSync(join(ctx.assetsRoot, "design-requests.schema.json"), "utf8"));
  return cachedSchema;
}
const requestDef = (schema, token) => schema.$defs[COMMANDS[token]?.request];

// The fields of `request` for a design operation that takes one, as the schema names them.
export function requestProperties(ctx, token) {
  return Object.keys(requestDef(requestSchema(ctx), token)?.properties ?? {});
}

// The fields shown: a second spelling of a field the schema accepts (`WorkspacePath` beside `workspacePath`) is not.
function requestFields(ctx, token) {
  const seen = new Set();
  return requestProperties(ctx, token).filter((name) => !seen.has(name.toLowerCase()) && seen.add(name.toLowerCase()));
}

const refName = (field) => field?.$ref?.split("/").pop();

function typeText(field) {
  if (field.$ref) return refName(field);
  if (field.enum) return field.enum.join(" | ");
  if (field.type === "array") return `list of ${field.items ? typeText(field.items) : "values"}`;
  return [field.type ?? "any"].flat().join(" or ");
}

// One line per field: name (* when required), type, and the schema's description and first example.
function fieldLines(def, rowDef, pad, refs) {
  const lines = [];
  for (const [name, declared] of Object.entries(def.properties ?? {})) {
    const field = name === "rows" && rowDef ? { type: "array", items: { $ref: `#/$defs/${rowDef}` } } : declared;
    const inner = field.type === "array" ? field.items : field;
    if (refName(inner)) refs.add(refName(inner));
    const required = def.required?.includes(name) ? "*" : "";
    const note = declared.description ? ` — ${declared.description}` : "";
    const example = declared.examples?.length ? ` (example: ${JSON.stringify(declared.examples[0])})` : "";
    lines.push(`${pad}- ${name}${required}: ${typeText(field)}${note}${example}`);
    if (inner?.properties) lines.push(...fieldLines(inner, null, `${pad}  `, refs));
  }
  return lines;
}

// Lab-authored: upstream takes the shape of a submission from the argument descriptions its server gives the
// client. A command line has no such channel, so the fields are printed from the schema the runtime validates by.
function requestFieldsHelp(ctx, token) {
  const schema = requestSchema(ctx);
  const def = requestDef(schema, token);
  if (!def) return "";
  const refs = new Set();
  const out = ["Fields of request (* = required):", ...fieldLines(def, COMMANDS[token].rows, "", refs)];
  for (const name of refs) out.push("", `Fields of ${name}:`, ...fieldLines(schema.$defs[name], null, "", refs));
  return `\n${out.join("\n")}\n`;
}

const noted = (notes = {}) => (name) => (notes[name] ? `${name} (${notes[name]})` : name);

// The arguments of one command on one line, from the command table and the request schema.
function argumentsLine(ctx, token) {
  const command = COMMANDS[token];
  if (command.request) {
    const beside = Object.keys(command.beside ?? {}).map(noted(command.beside));
    return `sessionId, jobId, request { ${requestFields(ctx, token).join(", ")} }${beside.length ? `, ${beside.join(", ")}` : ""}`;
  }
  if (command.freeText) return "sessionId, and the text under any field name";
  return command.args.length ? command.args.map(noted(command.notes)).join(", ") : "no arguments";
}

// One line per command with the arguments it accepts, so an agent learns every command's arguments in one call, or
// from its role file, instead of one `--help` call per command.
export function commandArguments(ctx, role) {
  const allowed = role ? ctx.roles?.[role] : null;
  return Object.keys(COMMANDS)
    .filter((token) => !allowed || allowed.includes(token))
    .map((token) => `${token}: ${argumentsLine(ctx, token)}`);
}

// Lab-authored: what a served step says about a command it names (contracts/workflow-loop.md, Command definitions):
// its arguments and, for a design write, every field of its request, so the step is followed without a `--help` call.
export function commandDefinition(ctx, token) {
  const fields = REQUEST_TOKENS.has(token) ? requestFieldsHelp(ctx, token).trimEnd() : "";
  return `### ${token}\nArguments: ${argumentsLine(ctx, token)}${fields ? `\n${fields.trimStart()}` : ""}`;
}

export function commandsHelp(ctx, role) {
  return [
    "usage: node agentic-system.mjs <command> [--json <file>|-|'<inline JSON>'] [--<argument> <value> ...]",
    "       node agentic-system.mjs <command> --help   (one command's full definition, from its contract)",
    "",
    "commands and their arguments:",
    ...commandArguments(ctx, role).map((line) => `  ${line}`),
  ].join("\n");
}

export function tokenHelp(ctx, token) {
  const shape = REQUEST_TOKENS.has(token)
    ? 'Arguments: { "sessionId", "jobId", "request": { ... } }; the fields below go inside request.'
    : "Arguments are top-level: never wrap them in request.";
  const root = ctx.contractsRoot;
  const files = existsSync(root) ? readdirSync(root).filter((f) => f.endsWith(".md")).sort() : [];
  const fields = REQUEST_TOKENS.has(token) ? requestFieldsHelp(ctx, token) : "";
  for (const tier of [0, 1, 2]) {
    for (const file of files) {
      const found = definition(readFileSync(join(root, file), "utf8"), token, tier);
      if (found) return `${usage(token)}\n${shape}\n${fields}\nFrom ${join(root, file)}:\n\n${found}\n`;
    }
  }
  return `${usage(token)}\n${shape}\n${fields}\nNo contract section defines ${token}; read the contracts in ${root}.\n`;
}
