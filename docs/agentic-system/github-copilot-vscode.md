# Using the agentic system in GitHub Copilot in VS Code

Roles start as native agents (the client's agent picker). Each role is the main conversation of its own session; start a new conversation for each one.

## Start a role

| To | Do this |
| --- | --- |
| Run a workflow | select `dr-orchestrator` in the Chat view's agent picker, then name the workflow: `DESIGN`, `FAST_IMPLEMENTATION` or `DOCUMENTATION` |
| Plan from a work item | select `dr-orchestrator` first, then invoke `plan-bug-from-id` or `plan-user-story-from-id` |
| Ask about the project | select `dr-ask` in the Chat view's agent picker |
| Build or update project knowledge | select `dr-knowledge-builder` in the Chat view's agent picker |

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

- Workflow skills: `.agents/skills`, reached through a symlink (the default Copilot harness reads only .github/skills; symlink support is undocumented, so it is verified in phase F (fallback: an approved copy)).
- 1 orchestrator starts, asks, asks workflow type: unverified (select dr-orchestrator in the VS Code agent picker; the Copilot harness has no documented question tool)
- 2 session created through the runtime: verified-fallback (verify.mjs from the terminal)
- 3 delegate runs in its own context: unverified (needs a VS Code session)
- 4 work items (GitHub MCP): unverified (github server added to .vscode/mcp.json; OAuth sign-in pending)
- 4 visual evidence: unverified (needs a VS Code session)
- 6 shared workflow skills discovered once: unverified (.github/skills symlinks are undocumented for the Copilot harness; fall back to an approved copy if they are not listed)
- 7 runtime-only delegate refused outside its role: verified-fallback (runtime refusal tested; Copilot has no per-command limit)
