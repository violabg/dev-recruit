# Changelog

Versions follow semantic versioning.

## 2.1.0

- OpenCode transcripts: `digest` and `transcript-cost.mjs` read the JSON of `opencode session export <session>`, with usage per turn and every tool call of the main conversation. Subagents run in sessions of their own and are not included.

## 2.0.0

- `digest` reports a design's operations instead of its open points, which designs no longer have since bootstrap 6.0.0. The `openPoints` field of the design summary is replaced by `operations`.

## 1.0.2

- A leading `cd` and a trailing echo of the exit code no longer count as a joined runtime call.
- `digest` warns about a transcript that ran no workflow step.
- `locate` says that OpenCode was not searched.

## 1.0.1

- `locate` counts a runtime call only when the session is its session argument, in a command the transcript actually ran. A mention no longer counts.
- `digest` warns about a transcript that ran no job of the session it was named for, and leaves it out of that session's comparison row and of the recurring causes.

## 1.0.0

- First release: audits one or more sessions of an installed orchestrator system for token waste and drift from the served flow, and for gaps in the runtime, the knowledge and the issue. Each finding goes to its own action after the user approves it.
- A digest script reads the session store and the transcripts the user confirms, so the audit opens little else. Claude Code and Copilot CLI transcripts are supported.
