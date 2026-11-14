#!/usr/bin/env node
// Thin CLI adapter over lib/api.mjs.
//
//   node agentic-system.mjs <token> [--json <file> | --json - | --json '<object>'] [--<argument> <value> ...]
//   node agentic-system.mjs --help [--role <role>]   every command's arguments, one line each
//   node agentic-system.mjs <token> --help           the token's arguments, from its contract
//   --role <role>                                    runs the token as that role; a token outside the role is refused
//   --client <id>                                    the client that calls, which selects its part limit
//
// The JSON payload is the operation's argument object (e.g. { "sessionId", "jobId", "request" }). Flags
// set top-level arguments and override the payload. Large payloads must go through a file or stdin:
// inline JSON is refused above INLINE_LIMIT characters so shell quoting never mangles a design.
import { readFileSync } from "node:fs";
import { call, handlers, roleRefusal } from "../lib/api.mjs";
import { createContext } from "../lib/context.mjs";
import { commandsHelp, tokenHelp } from "../lib/help.mjs";
import { jsonContext, keepText } from "../lib/kept.mjs";
import { bounded } from "../lib/responses.mjs";

const INLINE_LIMIT = 2000;

function refuseLongInline(name, value) {
  if (value.length > INLINE_LIMIT) throw new Error(`--${name} carries ${value.length} characters of inline JSON; write it to a file and pass --json <file>, or send it on stdin with --json -`);
}

// The argument object of `--json`: stdin for `-`, the text itself for an inline object, or else a file.
function payloadOf(value) {
  const inline = value.trimStart().startsWith("{");
  if (inline) refuseLongInline("json", value);
  let text = value;
  if (!inline) {
    try {
      text = readFileSync(value === "-" ? 0 : value, "utf8");
    } catch (error) {
      throw new Error(`--json could not read ${value === "-" ? "stdin" : `the file '${value}'`} (${error.code ?? error.message}). It takes a file path, - for stdin, or one quoted JSON object`);
    }
  }
  const source = inline ? "the inline value" : value === "-" ? "stdin" : `the file '${value}'`;
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    // The text travels with the error: a long payload is kept and repaired, not typed again (lib/kept.mjs).
    throw Object.assign(new Error(`--json: ${source} is not valid JSON (${error.message})${jsonContext(text, error)}`), { payloadText: text });
  }
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) throw new Error(`--json: ${source} must be a JSON object of the operation's arguments`);
  return payload;
}

function flagValue(name, value) {
  if (value.startsWith("{") || value.startsWith("[")) refuseLongInline(name, value);
  try {
    return value.startsWith("{") || value.startsWith("[") ? JSON.parse(value) : value;
  } catch {
    return value;
  }
}

// A flag takes every value up to the next flag, and a repeated flag adds to the earlier ones, so
// `--fileIds 6 11` and `--fileIds 6 --fileIds 11` both pass [6, 11]; a single value stays a scalar.
function parse(argv) {
  const [token, ...rest] = argv;
  const values = new Map();
  let payload = {};
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    if (!flag.startsWith("--")) throw new Error(`unexpected argument '${flag}'`);
    const name = flag.slice(2);
    const taken = [];
    while (i + 1 < rest.length && !rest[i + 1].startsWith("--")) taken.push(rest[++i]);
    if (name === "json") {
      if (taken.length !== 1) throw new Error("--json takes exactly one value: a file path, - for stdin, or one quoted JSON object");
      payload = payloadOf(taken[0]);
      continue;
    }
    if (!values.has(name)) values.set(name, []);
    values.get(name).push(...(taken.length ? taken.map((v) => flagValue(name, v)) : ["true"]));
  }
  const args = Object.fromEntries([...values].map(([name, list]) => [name, list.length === 1 ? list[0] : list.flat()]));
  return { token, args: { ...payload, ...args } };
}

const argv = process.argv.slice(2);
// Writes to a pipe are asynchronous: exit only once the output is flushed, or a reader gets the first 64 KB.
function finish(stream, text, exitCode) {
  stream.write(text.endsWith("\n") ? text : `${text}\n`, () => process.exit(exitCode));
}

if (argv.length === 0 || argv[0] === "--help" || argv[0] === "help") {
  const role = argv[argv.indexOf("--role") + 1];
  const ctx = createContext();
  finish(process.stdout, commandsHelp(ctx, argv.includes("--role") ? role : undefined), argv.length === 0 ? 2 : 0);
} else if (handlers[argv[0]] && argv.slice(1).some((a) => a === "--help" || a === "-h")) {
  const ctx = createContext();
  finish(process.stdout, bounded(ctx, argv[0], { output: tokenHelp(ctx, argv[0]), exitCode: 0 }).output, 0);
} else {
  let parsed;
  try {
    parsed = parse(argv);
  } catch (error) {
    const kept = error.payloadText !== undefined && handlers[argv[0]] ? keepText(createContext(), argv[0], error.payloadText) : null;
    const how = kept ? ` The payload is kept as draft ${kept}: do not send it again. Repair it on the same command with --draft ${kept} --json '{"replace":[{"from":"<the wrong text>","to":"<the right text>"}]}'.` : "";
    console.error(`agentic-system: ${error.message}${how}`);
    process.exit(2);
  }
  const { role, client, ...args } = parsed.args;
  const ctx = createContext();
  const refusal = roleRefusal(ctx, role, parsed.token);
  const result = refusal ? { output: refusal, exitCode: 2 } : await call(ctx, parsed.token, args, { role, client });
  finish(result.exitCode === 0 ? process.stdout : process.stderr, result.output, result.exitCode);
}
