---
name: bootstrap-orchestrator-system
description: "Use when: installing the orchestrator agentic system (an orchestrator role, served DESIGN / FAST_IMPLEMENTATION / DOCUMENTATION workflows, a local runtime and delegates with their own context) into a repository for one or more AI coding clients."
argument-hint: "Target repository, the clients the team uses, and where sessions should live if you already know"
disable-model-invocation: true
---

# Bootstrap Orchestrator System

Install the orchestrator agentic system into the target repository. The system is fixed: eight roles, three workflows served one instruction at a time by a local Node runtime, and the skills that start them. What you decide with the user is how it binds to this repository: the clients, where files live, the tracker and the other integrations.

Bootstrap writes agent-system files only: role files, skills, routers, the runtime and its config, workflows, contracts, client settings for the runtime command, guides and the installation records. It never changes application code, product tests or schema. It changes application configuration only to add the exact tooling exclusions the user approved for the visible system folders.

Run Bootstrap in a plain session of the client, never inside one of the roles it installs. If this conversation already runs a generated role, stop and ask the user to open a new session.

## What ships in this skill

| Path | What it is |
| --- | --- |
| `payload/` | The canonical system: role contracts, skills, router, workflows, contracts, runtime and documentation templates, with `{{SLOT}}` placeholders. `payload/index.json` describes it. Never edit it. |
| `registry/questions.json` | Every decision to settle, with when to ask, the recommendation and where the answer goes. |
| `registry/clients.json` | One profile per supported client: folders, file formats, tool names, routes, delegation, permission files and the documentation each profile was written against. |
| `templates/` | The client guides and the local Markdown tracker contract. |
| `scripts/install.mjs` | Renders and writes every file from `payload/`, the profiles and the answers file: `plan`, `apply`, `check`, `show`. |
| `scripts/verify.mjs` | Static verification of the installed tree and a runtime smoke test. |

The installer is deterministic: the same kit and the same answers always produce the same files. You never write role, skill or runtime files by hand, except for a client without a profile (`contracts/client-bindings.md`).

## Phases

Load each contract when its phase starts, not before.

| Phase | Purpose | Contract |
| --- | --- | --- |
| A Intake | Target repository, the clients and their surfaces, the execution host, Node, plan-only or install. | `contracts/intake-and-decisions.md` |
| B Discovery | Read-only: re-check each selected profile against current documentation, find the tracker, MCP servers, wiki, docs, glossary, validation commands, skill folders, tooling globs and path collisions. | `contracts/intake-and-decisions.md`, `contracts/integrations.md` |
| C Decisions | Settle `registry/questions.json` one material question at a time, routine defaults grouped. Write the answers file. | `contracts/intake-and-decisions.md`, `contracts/locations-and-permissions.md`, `contracts/client-bindings.md` |
| D File plan | `install.mjs plan`, plus the integration setup plan. Wait for explicit approval. | `contracts/install-and-verify.md` |
| E Apply | `install.mjs apply`, then the approved integration registration and authentication. | `contracts/install-and-verify.md`, `contracts/integrations.md` |
| F Verify | `verify.mjs`, then the native checks in each client and surface; record every result in the answers file and re-apply so the guides show them. | `contracts/install-and-verify.md` |
| G Handoff | Report what was installed and verified, and what the team does next. | `contracts/install-and-verify.md` |

## Rules

- A recommendation is never an answer. Record what the user approved.
- Nothing is written before the user approves the file plan. The answers file and the records live in the maintenance folder and are written with the plan.
- Delegates always run with their own context: native subagents, or a separate CLI process where the client has no subagents. Never run a delegate inline in the orchestrator's conversation.
- Install one authoritative copy of each workflow skill in the folder the most selected clients discover. Record the decision; a client-specific copy needs the user's approval.
- A system folder in the repository is always visible: its name never starts with a dot.
- Every location outside the repository must be recorded in the answers file, reachable by every selected client, and verified.
- Never store a credential value in the answers file, the records, a guide or the chat.
- Installed is not verified. Report each client's checks as `verified-native`, `verified-fallback`, `blocked` or `unverified`.
