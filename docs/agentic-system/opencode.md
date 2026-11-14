# Using the agentic system in OpenCode

Roles start as role skills you invoke by name. Each role is the main conversation of its own session; start a new conversation for each one.

## Start a role

| To | Do this |
| --- | --- |
| Run a workflow | invoke the `dr-orchestrator` skill in a new conversation, then name the workflow: `DESIGN`, `FAST_IMPLEMENTATION` or `DOCUMENTATION` |
| Plan from a work item | invoke `plan-bug-from-id` or `plan-user-story-from-id` in a new conversation; each loads the orchestrator itself |
| Ask about the project | invoke the `dr-ask` skill in a new conversation |
| Build or update project knowledge | invoke the `dr-knowledge-builder` skill in a new conversation |

The orchestrator always asks which workflow you want when you have not said it, and asks before it creates or resumes a session.

Two habits keep a run cheap, because everything loaded at the start is carried on every turn:

- Start the role or the planning skill directly. Do not ask the agent to load the repository's skills first: each skill loads its own role and nothing else is needed.
- Run the session without tool servers the roles do not use. Their tool definitions are sent on every turn whether or not a tool is called.

## While a workflow runs

- The orchestrator stops at every halt point and waits for you: an interview question, a decision, or the design review.
- In `DESIGN`, the review document is written into the session's design folder under `agentic-system-sessions/`. Open it in a browser, then approve or ask for changes in the chat.
- Delegates run as native subagents, each with its own context. You see their verdicts in the conversation.
- Runtime commands run as `node agentic-system/bin/agentic-system.mjs <command>`. Allow them when the client asks.

## Verification

What Bootstrap verified for this client:

- Workflow skills: `.agents/skills`, reached natively (documented at https://opencode.ai/docs/skills/ (checked 2026-11-14)).
- agents discovered with permissions: verified-native (`opencode debug agents --standalone` (v2.3.0) on 2026-11-14: five hidden delegate agents and the three primary role agents (orchestrator, ask, knowledge-builder), kept as repository-owned copies beside the skill route in .opencode/skills; the V1 keys are converted to shell/subagent)
- route: plan skills auto-load the orchestrator role: verified-fallback (render checked on 2026-11-14: plan-user-story-from-id and plan-bug-from-id tell OpenCode to read .opencode/skills/dr-orchestrator/SKILL.md before continuing, and to continue without reloading it when the dr-orchestrator agent already runs; verify.mjs passes; not yet exercised in a conversation)
- 1 orchestrator starts, asks, asks workflow type: unverified (needs an interactive session: invoke /dr-orchestrator, or plan-user-story-from-id, which now loads the role itself)
- 2 session created through the runtime: verified-fallback (verify.mjs from the terminal)
- 3 delegate runs in its own context: unverified (needs an interactive session)
- 4 work items (GitHub MCP): blocked (GITHUB_PAT is not exported)
- 4 visual evidence: unverified (needs an interactive session)
- 6 shared workflow skills discovered once: unverified (OpenCode reads both .agents/skills and .claude/skills (symlinks), and role skills now live in .opencode/skills; check the skill list shows each once)
- 5 role skill refuses inside a role: unverified (needs an interactive session)
- 7 runtime-only delegate refused outside its role: verified-fallback (runtime refusal tested; per-command shell permissions shown by opencode debug agents)
