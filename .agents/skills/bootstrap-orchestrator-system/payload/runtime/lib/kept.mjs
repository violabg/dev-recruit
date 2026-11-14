// Kept requests (contracts/design-model.md, kept requests). Lab-authored. A design write is applied whole or not at
// all, so a refused one used to be typed again in full: one misplaced property cost the whole payload a second
// time. A refused request of some size is kept instead, and the next call sends only the correction: the kept
// request with the correction applied is validated and applied as one whole request.
import { readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { RuntimeError, arg, findText, pathDrop, pathGet, pathSet, pathSteps, sha256, writeText } from "./util.mjs";

// A smaller request costs less to send again than to correct.
export const KEEP_FROM_BYTES = 600;
const KEPT_MS = 24 * 60 * 60 * 1000;
const DRAFT_ID = /^[0-9a-f]{12}$/;
const CORRECTIONS = ["draft", "set", "drop", "move", "replace"];

const folder = (ctx) => join(ctx.cacheRoot, "requests");

function store(ctx, record) {
  const id = sha256(JSON.stringify(record)).slice(0, 12);
  writeText(join(folder(ctx), `${id}.json`), JSON.stringify(record));
  for (const name of readdirSync(folder(ctx))) {
    const path = join(folder(ctx), name);
    if (Date.now() - statSync(path).mtimeMs > KEPT_MS) rmSync(path, { force: true });
  }
  return id;
}

// Keeps a refused request and answers its id, or null when it is too small to be worth keeping or cannot be written.
export function keepRequest(ctx, token, args) {
  try {
    const kept = Object.fromEntries(Object.entries(args).filter(([key]) => !CORRECTIONS.includes(key.toLowerCase())));
    if (Buffer.byteLength(JSON.stringify(kept), "utf8") < KEEP_FROM_BYTES) return null;
    return store(ctx, { token, args: kept });
  } catch {
    return null;
  }
}

// Keeps the text of a payload that is not valid JSON, so it is repaired with `replace` and not typed again.
export function keepText(ctx, token, text) {
  try {
    if (Buffer.byteLength(text, "utf8") < KEEP_FROM_BYTES) return null;
    return store(ctx, { token, text });
  } catch {
    return null;
  }
}

const listOf = (value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

// The text around the position a JSON parse error names, so the place is found without reading the payload again.
export function jsonContext(text, error) {
  const position = Number(/position (\d+)/.exec(error.message)?.[1]);
  if (!Number.isInteger(position)) return "";
  return `; near: …${text.slice(Math.max(0, position - 60), position + 40).replace(/\s+/g, " ")}…`;
}

// The arguments of a call that names a kept request: the kept arguments with the correction applied.
//   replace  [{ from, to }]   text of a kept payload that was not valid JSON, before it is parsed
//   move     { from: to }     a value sent in the wrong place; onto a list it is appended, onto an object merged
//   set      { path: value }  a new value at a path
//   drop     [path]           a value to remove
// Paths are the ones a refusal reports (`add.contracts[0].premortem`, `/request/rows/3/behavior`).
export function resolveKept(ctx, token, args) {
  const id = String(arg(args, "draft"));
  const refuse = (reason) => {
    throw new RuntimeError(`${token} failed: ${reason} Nothing was applied.`);
  };
  if (!DRAFT_ID.test(id)) refuse(`draft '${id}' is not one this runtime gave.`);
  const path = join(folder(ctx), `${id}.json`);
  if (!statSync(path, { throwIfNoEntry: false })) refuse(`the request '${id}' is no longer kept; send the whole request again.`);
  const kept = JSON.parse(readFileSync(path, "utf8"));
  if (kept.token !== token) refuse(`the request '${id}' was sent to ${kept.token}; correct it there.`);

  let base = kept.args;
  if (kept.text !== undefined) {
    let text = kept.text;
    for (const [index, change] of listOf(arg(args, "replace")).entries()) {
      const found = findText(text, change?.from ?? "");
      if (found.length !== 1) refuse(`replace[${index}]: the text was found ${found.length} times in the kept payload; it must be found once.`);
      text = text.slice(0, found[0][0]) + String(change.to ?? "") + text.slice(found[0][1]);
    }
    try {
      base = JSON.parse(text);
    } catch (error) {
      const again = keepText(ctx, token, text);
      refuse(`the kept payload is still not valid JSON (${error.message})${jsonContext(text, error)}.${again ? ` It is kept as draft ${again}: repair that one with replace.` : ""}`);
    }
    if (base === null || typeof base !== "object" || Array.isArray(base)) refuse("the kept payload must be a JSON object of the operation's arguments.");
  } else if (arg(args, "replace") !== undefined) refuse("replace repairs a payload that was not valid JSON; this kept request is valid JSON, so use set, drop or move.");

  const result = structuredClone(base);
  // The envelope and the arguments sent with the correction win over the kept ones.
  for (const [key, value] of Object.entries(args)) if (!CORRECTIONS.includes(key.toLowerCase())) result[key] = value;
  result.request ??= {};
  const target = result.request;
  for (const [from, to] of Object.entries(arg(args, "move") ?? {})) {
    const steps = pathSteps(from);
    const value = pathGet(target, steps);
    if (value === undefined) refuse(`move: nothing is at '${from}' in the kept request.`);
    pathDrop(target, steps);
    const destination = pathSteps(to);
    const existing = pathGet(target, destination);
    if (Array.isArray(existing) && Array.isArray(value)) existing.push(...value);
    else if (existing && typeof existing === "object" && !Array.isArray(existing) && value && typeof value === "object" && !Array.isArray(value)) Object.assign(existing, value);
    else pathSet(target, destination, value);
  }
  for (const [where, value] of Object.entries(arg(args, "set") ?? {})) pathSet(target, pathSteps(where), value);
  // Later elements of a list are dropped first, so each index still names the element the refusal named.
  const drops = listOf(arg(args, "drop")).map((where) => ({ where, steps: pathSteps(where) }));
  drops.sort((a, b) => b.steps.length - a.steps.length || Number(b.steps.at(-1)) - Number(a.steps.at(-1)) || 0);
  for (const { where, steps } of drops) if (!pathDrop(target, steps)) refuse(`drop: nothing is at '${where}' in the kept request.`);
  return result;
}

// What a refusal says when it kept the request.
export function keptNote(token, id, flags) {
  return `Nothing was applied and the request is kept as draft ${id}. Do not send it again: call ${token} with draft ${id} and only the correction, using the paths reported here: set { "<path>": <value> }, drop ["<path>"], move { "<from path>": "<to path>" } (CLI:${flags} --draft ${id} --json '{"move":{"apis":"add.apis"}}'). The corrected request is validated and applied as a whole.`;
}
