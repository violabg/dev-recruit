#!/usr/bin/env node
// Static verification of an installed target: no drift from the answers, no unfilled slot, and a runtime that
// starts with the installed config and reaches the sessions folder. Native checks (a role starts, a delegate
// gets a fresh context, a host binding works) run in the client and are recorded by Bootstrap, not here.
//
//   node verify.mjs [--repo <dir>] [--answers <file>]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { normalizeAnswers } from "./lib/answers.mjs";
import { loadKit } from "./lib/kit.mjs";
import { findAnswers } from "./lib/migrate.mjs";
import { check } from "./lib/plan.mjs";
import { InstallError, absolutePath, readJson } from "./lib/util.mjs";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

const results = [];
const record = (name, ok, detail) => results.push({ name, ok, detail });

try {
  const repo = resolve(arg("--repo") ?? process.cwd());
  const kit = loadKit();
  const answersFile = resolve(findAnswers(repo, arg("--answers")));
  const answers = normalizeAnswers(readJson(answersFile), kit.profiles);

  const { problems } = check(kit, answers, repo);
  record("installed files match the answers", problems.length === 0, problems.join("\n") || "no drift, no unfilled slot");

  const cli = join(repo, answers.locations.runtimeRoot, "bin", "agentic-system.mjs");
  const run = (...args) => execFileSync(process.execPath, [cli, ...args], { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  try {
    const types = run("workflow-types-list");
    record("the runtime starts and serves the workflows", /DESIGN/.test(types) && /FAST_IMPLEMENTATION/.test(types) && /DOCUMENTATION/.test(types), types.split("\n")[0]);
  } catch (error) {
    record("the runtime starts and serves the workflows", false, String(error.stderr || error.message));
  }
  const sessions = absolutePath(repo, answers.locations.sessionsRoot);
  try {
    mkdirSync(sessions, { recursive: true });
    run("session-list");
    record("the sessions folder is reachable", existsSync(sessions), sessions);
  } catch (error) {
    record("the sessions folder is reachable", false, String(error.stderr || error.message));
  }
} catch (error) {
  if (!(error instanceof InstallError)) throw error;
  record("answers", false, error.message);
}

for (const r of results) console.log(`${r.ok ? "pass" : "FAIL"}  ${r.name}\n      ${r.detail.split("\n").join("\n      ")}`);
process.exitCode = results.every((r) => r.ok) ? 0 : 1;
