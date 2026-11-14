# {{REPO_NAME}} Agentic System

Route the current request through this file, then load only what that request needs. Keep this file under 80 lines: it is a router, not a knowledge base.

## Roles

Started by the developer, each as the main conversation of its session:

- `orchestrator` — drives one workflow the developer chooses explicitly: `DESIGN`, `FAST_IMPLEMENTATION` or `DOCUMENTATION`. In `DESIGN` it never writes production code; in `FAST_IMPLEMENTATION` it implements the requirement itself.
- `ask` — answers project and programming questions; never implements.
- `knowledge-builder` — builds and updates project knowledge.

Started only by the orchestrator, each in a fresh context with only its prompt, reporting back in the same conversation:

- `explorer`, `code-implementor`, `design-verifier`, `implementation-verifier`, `documentation-reviewer`.

Full role contracts live in `{{AGENT_ROOT}}`. Do not restate them here.

## Runtime

Every `#capability:<token>` in a role, skill or workflow instruction is an operation of the agentic system runtime or of an approved integration, bound for this repository. Runtime operations run as `node {{RUNTIME_ROOT}}/bin/agentic-system.mjs <token>`; pass large payloads with `--json <file>`. The JSON payload is the operation's argument object, defined in `{{RUNTIME_ROOT}}/contracts/`: design operations take `{ "sessionId", "jobId", "request": { ... } }`, and fields such as `operation`, `rows` and `ids` go inside `request`; every other operation takes its arguments at the top level. Your role file lists the arguments of each command, and an instruction defines the design writes it names, so do not probe a command first; run it with `--help` only when a call is refused. A refused design write is kept: correct it with the `draft` its refusal names instead of sending it again, and change text inside a stored field with `edit` instead of resending the field. A long answer arrives in parts: when it ends with `[part N of M. The answer continues: …]`, make the call it names and read every part before acting on any of it. Run one runtime operation per shell command: never join two calls with `;`, `&&` or a loop, and never pipe an answer through `head`, `tail`, `cut`, `sed` or `dd`.

- Session memory, the event log and artifacts are the session files under `{{SESSIONS_ROOT}}/<sessionId>/`, never the client's own memory feature.
- Workflow instructions are served one at a time by the runtime. Never open `{{RUNTIME_ROOT}}/workflows/` directly.
- Never edit runtime-owned files by hand: designs, jobs and integrity seals change only through runtime operations.
- A delegate that returns its report is never a stop point: continue the active instruction.
- When your context was compacted or the session was resumed in the middle of a job, what you read earlier is gone: before you continue, read your role file again, get the active instruction with `#capability:workflow-step-pending`, and read again with `#capability:knowledge-read` the knowledge the design cites.

## Skills

Repository skills live in `{{SKILL_ROOT}}`. Read a skill's `SKILL.md` before running its workflow.

## Knowledge

- Read the knowledge catalogue with `#capability:knowledge-catalog`. Every `MustHave` document is read in full; `PerContext` and `PerComponent` documents are read when the work touches them.
- Knowledge documents live in `{{KNOWLEDGE_ROOT}}`. Resolve repository vocabulary in `{{CONTEXT_GLOSSARY_PATH}}`.
- Only `knowledge-builder` changes knowledge. No workflow and no delegate creates, edits or deletes a file in `{{KNOWLEDGE_ROOT}}`, in a correction round either. A knowledge statement the work made stale is never fixed in place: report it to the developer, who takes it to `knowledge-builder`.

## Validation

Validate every change with `{{VALIDATION_COMMANDS}}` before handing work back.
