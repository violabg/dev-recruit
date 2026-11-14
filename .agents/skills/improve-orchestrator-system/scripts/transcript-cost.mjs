// Attributes model usage per conversation and per response type, from client transcripts, and replays what a change
// to one response type would cost. It reads the transcripts and writes nothing. Character counts locate where the
// context goes; the token figures are the ones the client recorded.
//
//   node transcript-cost.mjs <events.jsonl | session.jsonl> [--json]
//   node transcript-cost.mjs <file> --replay <response type>=<fraction kept>
//   node transcript-cost.mjs <file> --cached-read 0.1 --cache-write 1.25
//
// Copilot CLI (`events.jsonl`), Claude Code (`<session>.jsonl`, with its `subagents/` folder) and OpenCode (the JSON of
// `opencode session export <session>`) are supported. Usage
// a client does not record is reported as unavailable, never as zero.
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const jsonLines = (path) =>
  readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });

// A runtime command is named by its token; any other shell command or tool by its tool name.
export function responseType(tool, input) {
  const runtime = /agentic-system\.mjs"?\s+([a-z][a-z-]*)/.exec(typeof input?.command === "string" ? input.command : "");
  return runtime ? runtime[1] : tool;
}

// What the digest needs to know about one call, beside its size. The input stays only long enough to compare calls.
function detail(tool, input, text, isError) {
  const failedText = typeof input?.command === "string" && responseType(tool, input) !== tool && /^(?:Exit code \d+\n)?[^\n]{0,160}\b(?:rejected|refused|failed)\b/i.test(text);
  const failed = Boolean(isError) || failedText;
  return {
    input,
    failed,
    excerpt: failed ? text.replace(/^Exit code \d+\n/, "").slice(0, 200) : undefined,
    instruction: Number(/^Instruction (\d+)\/\d+\./.exec(text)?.[1]) || undefined,
  };
}

const SPILL = /^Output too large to read at once/;

export function parseCopilot(events) {
  const turns = [];
  const responses = [];
  const starts = new Map();
  // An event inside a subagent carries its `agentId`; the id of the call that started it links that to a name.
  const callNames = new Map();
  const agents = new Map();
  let started = 0;
  const agentOf = (event) => (event.agentId ? (agents.get(event.agentId) ?? "subagent") : "main");
  for (const event of events) {
    const data = event.data ?? {};
    if (event.type === "subagent.started") callNames.set(data.toolCallId, `${data.agentName ?? "subagent"} #${++started}`);
    if (event.agentId && data.parentToolCallId && callNames.has(data.parentToolCallId)) agents.set(event.agentId, callNames.get(data.parentToolCallId));
    if (event.type === "tool.execution_start") starts.set(data.toolCallId, { tool: data.toolName, input: data.arguments, type: responseType(data.toolName, data.arguments), agent: agentOf(event) });
    if (event.type === "tool.execution_complete") {
      const start = starts.get(data.toolCallId);
      const content = typeof data.result?.content === "string" ? data.result.content : "";
      const text = content || (typeof data.error?.message === "string" ? data.error.message : "");
      if (start) responses.push({ agent: start.agent, type: start.type, chars: content.length, spilled: SPILL.test(content), afterTurn: turns.length, ...detail(start.tool, start.input, text, data.success === false) });
    }
    if (event.type === "session.usage_record" && data.usage) {
      const u = data.usage;
      turns.push({ agent: agentOf(event), input: u.inputTokens ?? 0, output: u.outputTokens ?? 0, cacheRead: u.cacheReadTokens ?? 0, cacheWrite: u.cacheWriteTokens ?? 0 });
    }
  }
  return { client: "copilot-cli", turns, responses, usageAvailable: turns.length > 0 };
}

const toolResultText = (content) => (typeof content === "string" ? content : Array.isArray(content) ? content.map((part) => (typeof part?.text === "string" ? part.text : "")).join("") : "");

export function parseClaude(lines, agent = "main") {
  const turns = [];
  const responses = [];
  const calls = new Map();
  const seen = new Set();
  for (const line of lines) {
    if (line.type === "assistant" && line.message) {
      // One API response is written once per content block, with the same id and usage.
      const usage = line.message.usage;
      if (usage && !seen.has(line.message.id)) {
        seen.add(line.message.id);
        turns.push({ agent, input: usage.input_tokens ?? 0, output: usage.output_tokens ?? 0, cacheRead: usage.cache_read_input_tokens ?? 0, cacheWrite: usage.cache_creation_input_tokens ?? 0 });
      }
      for (const block of line.message.content ?? []) if (block.type === "tool_use") calls.set(block.id, block);
    }
    if (line.type === "user" && Array.isArray(line.message?.content)) {
      for (const block of line.message.content) {
        if (block.type !== "tool_result") continue;
        const text = toolResultText(block.content);
        const call = calls.get(block.tool_use_id);
        responses.push({ agent, type: call ? responseType(call.name, call.input) : "unknown", chars: text.length, spilled: /Output too large|Full output saved to/.test(text), afterTurn: turns.length, ...detail(call?.name, call?.input, text, block.is_error) });
      }
    }
  }
  return { client: "claude-code", turns, responses, usageAvailable: turns.length > 0 };
}

// OpenCode, from `opencode session export <session>`: one JSON object whose assistant messages carry their usage and
// their tool calls. A subagent runs in its own session, which this file does not hold.
export function parseOpenCode(exported) {
  const turns = [];
  const responses = [];
  for (const message of exported.messages ?? []) {
    if (message.type !== "assistant") continue;
    const t = message.tokens;
    if (t) turns.push({ agent: "main", input: t.input ?? 0, output: (t.output ?? 0) + (t.reasoning ?? 0), cacheRead: t.cache?.read ?? 0, cacheWrite: t.cache?.write ?? 0 });
    for (const part of message.content ?? []) {
      if (part.type !== "tool") continue;
      const state = part.state ?? {};
      const text = toolResultText(state.content) || (typeof state.error === "string" ? state.error : "");
      responses.push({ agent: "main", type: responseType(part.name, state.input), chars: text.length, spilled: Boolean(state.metadata?.truncated), afterTurn: turns.length, ...detail(part.name, state.input, text, state.status === "error") });
    }
  }
  return { client: "opencode", turns, responses, usageAvailable: turns.length > 0 };
}

const openCodeExport = (path) => {
  const text = readFileSync(path, "utf8").trimStart();
  if (!text.startsWith("{")) return null;
  try {
    const value = JSON.parse(text);
    return value?.info && Array.isArray(value.messages) ? value : null;
  } catch {
    return null;
  }
};

export function load(path) {
  const exported = openCodeExport(path);
  if (exported) return parseOpenCode(exported);
  const lines = jsonLines(path);
  if (lines.some((line) => line.type === "session.usage_record" || line.type === "session.start")) return parseCopilot(lines);
  const main = parseClaude(lines);
  const folder = join(dirname(path), basename(path, ".jsonl"), "subagents");
  if (!existsSync(folder)) return main;
  for (const file of readdirSync(folder).filter((f) => f.endsWith(".jsonl"))) {
    const child = parseClaude(jsonLines(join(folder, file)), basename(file, ".jsonl"));
    main.turns.push(...child.turns);
    main.responses.push(...child.responses);
  }
  return main;
}

export const DEFAULT_PRICES = { input: 1, cacheRead: 0.1, cacheWrite: 1.25, output: 5 };

// Copilot reports `input` including cached tokens, and Claude reports them apart. Both reduce to uncached input.
const uncached = (turn, client) => (client === "copilot-cli" ? Math.max(0, turn.input - turn.cacheRead - turn.cacheWrite) : turn.input);

export function weighted(turn, client, prices) {
  return uncached(turn, client) * prices.input + turn.cacheRead * prices.cacheRead + turn.cacheWrite * prices.cacheWrite + turn.output * prices.output;
}

function group(items, key) {
  const map = new Map();
  for (const item of items) map.set(key(item), [...(map.get(key(item)) ?? []), item]);
  return map;
}

export function summarize(t, prices = DEFAULT_PRICES) {
  const perAgent = [...group(t.turns, (x) => x.agent)].map(([agent, turns]) => ({
    agent,
    turns: turns.length,
    cacheRead: turns.reduce((n, x) => n + x.cacheRead, 0),
    cacheWrite: turns.reduce((n, x) => n + x.cacheWrite, 0),
    output: turns.reduce((n, x) => n + x.output, 0),
    weighted: Math.round(turns.reduce((n, x) => n + weighted(x, t.client, prices), 0)),
  }));
  const perResponse = [...group(t.responses, (x) => x.type)]
    .map(([type, items]) => ({ type, calls: items.length, chars: items.reduce((n, x) => n + x.chars, 0), spilled: items.filter((x) => x.spilled).length }))
    .sort((a, b) => b.chars - a.chars);
  return { client: t.client, usageAvailable: t.usageAvailable, turns: t.turns.length, weighted: perAgent.reduce((n, a) => n + a.weighted, 0), perAgent, perResponse };
}

// Keeping `fraction` of one response type removes the rest from that response and from every later turn of the same
// conversation, at the cache-read price. A model, not a measurement: it holds turn counts and model behavior constant.
export function replay(t, type, fraction, prices = DEFAULT_PRICES, charsPerToken = 4) {
  const base = t.turns.reduce((n, x) => n + weighted(x, t.client, prices), 0);
  const positions = new Map();
  const turnIndex = t.turns.map((turn) => {
    const at = positions.get(turn.agent) ?? 0;
    positions.set(turn.agent, at + 1);
    return { turn, at };
  });
  let saved = 0;
  for (const r of t.responses.filter((x) => x.type === type)) {
    const tokens = (r.chars * (1 - fraction)) / charsPerToken;
    const later = turnIndex.filter(({ turn }) => turn.agent === r.agent).filter(({ turn }) => t.turns.indexOf(turn) >= r.afterTurn).length;
    saved += tokens * prices.cacheWrite + tokens * Math.max(0, later - 1) * prices.cacheRead;
  }
  return { type, fraction, base: Math.round(base), saved: Math.round(saved), percent: base ? Math.round((saved / base) * 1000) / 10 : 0 };
}

function main() {
  const argv = process.argv.slice(2).filter((a) => a !== "--");
  const value = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? undefined : argv[i + 1];
  };
  const file = argv.find((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
  if (!file) {
    console.error("usage: node transcript-cost.mjs <events.jsonl | session.jsonl> [--json] [--replay <type>=<fraction>] [--cached-read <n>] [--cache-write <n>]");
    process.exit(2);
  }
  const prices = { ...DEFAULT_PRICES, cacheRead: Number(value("--cached-read") ?? DEFAULT_PRICES.cacheRead), cacheWrite: Number(value("--cache-write") ?? DEFAULT_PRICES.cacheWrite) };
  const t = load(file);
  const summary = summarize(t, prices);
  const rule = value("--replay");
  const scenario = rule ? replay(t, rule.split("=")[0], Number(rule.split("=")[1]), prices) : undefined;
  if (argv.includes("--json")) {
    console.log(JSON.stringify({ ...summary, replay: scenario }, null, 2));
    return;
  }
  console.log(`${summary.client}: ${summary.turns} model turns. Usage ${summary.usageAvailable ? "recorded" : "unavailable"}. Weighted input-equivalent tokens: ${summary.weighted}.`);
  console.log("\nPer conversation (cache read, cache write, output, weighted):");
  for (const a of summary.perAgent) console.log(`  ${a.agent}: ${a.turns} turns, ${a.cacheRead}, ${a.cacheWrite}, ${a.output}, ${a.weighted}`);
  console.log("\nPer response type (calls, characters, spilled to a file):");
  for (const r of summary.perResponse.slice(0, 15)) console.log(`  ${r.type}: ${r.calls}, ${r.chars}, ${r.spilled}`);
  if (scenario) console.log(`\nReplay keeping ${scenario.fraction} of ${scenario.type}: saves about ${scenario.saved} of ${scenario.base} (${scenario.percent}%). Modelled, at 4 characters per token.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main();
