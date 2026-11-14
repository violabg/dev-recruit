---
name: improve-orchestrator-system
description: "Use when: auditing one or more finished or stopped sessions of an installed orchestrator agentic system, by session id, for wasted tokens, drift from the served flow, and gaps in the runtime, the knowledge or the issue."
argument-hint: "Target repository and one or more session ids"
disable-model-invocation: true
---

# Improve Orchestrator System

Audit what a session actually did and turn each cause of waste or drift into one concrete action. The goal is the most token-efficient run that still follows the canonical flow for the issue being worked on. Adherence comes first: never propose saving tokens by removing, weakening or reordering a served step, a check, a verifier or the approval gate.

Run it in a plain session, never inside one of the installed roles. Audit one session by default, and several only when the user names several ids. Never choose sessions yourself.

## Rules

- Sessions are evidence. Never change one, and never run a runtime operation against one: an operation can write to the session or the response cache. Read with file tools.
- Read a client transcript only after the user confirms it (step 2).
- Keep the audit itself cheap: start from the digest, and open a file only to confirm a specific finding, by search or line range. Never read a whole transcript, `design.json` or session.
- Change nothing without the user's approval of that specific finding. Approving one finding approves no other.
- Measured facts come from the scripts, judged ones from you. Label each. Report usage a client did not record as unavailable, never as zero.

## Procedure

`<skill>` below is this skill's folder.

### 1. Check the installation and the sessions

The target needs `answers.json` in its maintenance folder. If it has none, there is nothing to audit: offer `bootstrap-orchestrator-system`. The digest stops and names any session id it cannot find.

### 2. Find the transcripts

```sh
node <skill>/scripts/digest.mjs locate --repo <target> --session <id> [--session <id>]...
```

It lists, per session, the Claude Code and Copilot CLI transcripts whose runtime calls name that session, and prints no content. A file can hold more than one session, and a resumed session can span several files. Show the list and ask the user to confirm the files to read, in one question for all the sessions. For OpenCode, ask the user to run `opencode session export <session> > <file>` in the repository, with the session from `opencode session list`, and pass that file to the digest: it holds the main conversation, not the subagents' sessions. For another client, ask for the path; if there is no parser for it, continue with the session store only and say so.

### 3. Build the digest

```sh
node <skill>/scripts/digest.mjs digest --repo <target> --session <id>... --transcript <id>=<file>...
```

### 4. Audit

Load `contracts/audit.md`. Read the issue once per distinct issue. Produce one finding per cause, with several sessions merged into one finding.

### 5. Report, then act finding by finding

Present the report in the format of `contracts/audit.md`, most costly first. Then load `contracts/actions.md` and take each finding through its action, asking the user per finding. End with what was applied, what was written, and what was left.
