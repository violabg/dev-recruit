// The response size guarantee (contracts/workflow-loop.md, Parts). Any answer longer than the part limit that no
// operation paged itself, a write's or a refusal's included, is kept as an immutable copy and served in parts. A later
// part reads the copy, so asking for it never runs the operation again: a write is not repeated, and parts asked in
// parallel always belong to one answer.
import { readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { RuntimeError, arg, callerFlags, servePart, sha256, writeText } from "./util.mjs";

// Lab-authored: how long a long answer stays available. An agent reads the parts right after the call.
const KEPT_MS = 24 * 60 * 60 * 1000;
const RESPONSE_ID = /^[0-9a-f]{16}$/;
// A part starts at a heading, a list item or a row of lined JSON, so none of them is split unless it alone is too long.
const UNIT_START = /^(?:#{1,6} |- |\{|"[A-Za-z]+":)/;

const folder = (ctx) => join(ctx.cacheRoot, "responses");

function discardOld(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (Date.now() - statSync(path).mtimeMs > KEPT_MS) rmSync(path, { force: true });
  }
}

function partOf(ctx, token, id, text, part, caller) {
  return servePart(text, part === undefined ? {} : { part }, {
    tool: token,
    limit: ctx.partLimit,
    starts: (line) => UNIT_START.test(line),
    next: (k) => `call ${token} again with responseId ${id} and part ${k} (CLI:${callerFlags(caller)} --responseId ${id} --part ${k}); it serves the same answer and does not run the operation again.`,
  });
}

// The answer as it is when it fits, counting the newline the CLI ends it with; otherwise its first part. When the
// copy cannot be written the answer is returned whole: a spilled answer can be recovered, a lost one cannot.
export function bounded(ctx, token, { output, exitCode }, caller = {}) {
  if (Buffer.byteLength(output, "utf8") + 1 <= ctx.partLimit) return { output, exitCode };
  const id = sha256(`${token}\0${exitCode}\0${output}`).slice(0, 16);
  try {
    writeText(join(folder(ctx), `${id}.json`), JSON.stringify({ token, exitCode, text: output }));
    discardOld(folder(ctx));
  } catch {
    return { output, exitCode };
  }
  return { output: partOf(ctx, token, id, output, undefined, caller), exitCode };
}

export function storedPart(ctx, token, args, caller = {}) {
  const id = arg(args, "responseId");
  const refused = (reason) => {
    throw new RuntimeError(`${token} failed: ${reason}`);
  };
  try {
    if (typeof id !== "string" || !RESPONSE_ID.test(id)) refused(`responseId '${id}' is not one this runtime gave.`);
    const path = join(folder(ctx), `${id}.json`);
    const stat = statSync(path, { throwIfNoEntry: false });
    if (!stat) refused(`the response '${id}' is no longer kept. The operation already ran: for a read, make the call again; after a write, read the result with the matching read or design-checks. Do not repeat the write unseen.`);
    const stored = JSON.parse(readFileSync(path, "utf8"));
    if (stored.token !== token) refused(`the response '${id}' belongs to ${stored.token}; ask that command for it.`);
    return { output: partOf(ctx, token, id, stored.text, arg(args, "part"), caller), exitCode: stored.exitCode };
  } catch (error) {
    if (error instanceof RuntimeError) return { output: error.message, exitCode: 1 };
    throw error;
  }
}
