#!/usr/bin/env node
// A client hook for a role whose only terminal use is the runtime: it allows one runtime command the role may
// run and blocks every other shell command. Input: the hook's JSON on stdin ({ tool_input: { command } }).
// Exit 2 blocks the call and shows the reason to the agent (contracts/workflow-loop.md, Roles).
//
//   node role-guard.mjs <role>
import { readFileSync } from "node:fs";
import { createContext } from "../lib/context.mjs";

const RUNTIME_COMMAND = /^node\s+"?[^\s";&|]*agentic-system\.mjs"?\s+([a-z-]+)(\s[^;&|`$<>\n]*)?$/;
const QUOTED_HEREDOC = /\s<<(['"])([A-Za-z_][A-Za-z0-9_]*)\1$/;

// The command line a shell would run, or null. A quoted heredoc is literal text, so its payload may hold anything.
// It counts only as the `--json -` payload of the one command, and the first line that closes it must be the last
// line of the whole text, because anything after that line would be a second command.
function commandLine(command) {
  const [first, ...rest] = command.trim().split("\n");
  const heredoc = QUOTED_HEREDOC.exec(first);
  if (!heredoc) return rest.length ? null : first;
  const closes = rest.indexOf(heredoc[2]);
  if (closes === -1 || closes !== rest.length - 1) return null;
  const line = first.slice(0, heredoc.index);
  return /\s--json\s+-(\s|$)/.test(line) ? line : null;
}

function refusal(role, command, roles) {
  const tokens = roles?.[role];
  if (!tokens) return `no runtime commands are recorded for the role '${role}'`;
  const match = RUNTIME_COMMAND.exec(commandLine(command) ?? "");
  if (!match) return "this role may only run one runtime command at a time, with nothing chained, piped or redirected; a payload goes in one quoted heredoc (`--json - <<'JSON'`), as inline JSON or in a file";
  if (!tokens.includes(match[1])) return `'${match[1]}' is not available to the ${role} role. Its runtime commands: ${tokens.join(", ")}`;
  return null;
}

const role = process.argv[2];
const input = JSON.parse(readFileSync(0, "utf8") || "{}");
const reason = refusal(role, String(input.tool_input?.command ?? ""), createContext().roles);
if (reason) {
  console.error(`Blocked: ${reason}.`);
  process.exit(2);
}
