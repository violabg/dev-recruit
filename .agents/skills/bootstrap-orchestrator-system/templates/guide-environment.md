# Using the agentic system in {{CLIENT}}

Roles start as {{ROUTE}}. Each role is the main conversation of its own session; start a new conversation for each one.

## Start a role

| To | Do this |
| --- | --- |
| Run a workflow | {{START_ORCHESTRATOR}}, then name the workflow: `DESIGN`, `FAST_IMPLEMENTATION` or `DOCUMENTATION` |
| Plan from a work item | {{PLAN_SKILLS}} |
| Ask about the project | {{START_ASK}} |
| Build or update project knowledge | {{START_KNOWLEDGE_BUILDER}} |

The orchestrator always asks which workflow you want when you have not said it, and asks before it creates or resumes a session.

Two habits keep a run cheap, because everything loaded at the start is carried on every turn:

- Start the role or the planning skill directly. Do not ask the agent to load the repository's skills first: each skill loads its own role and nothing else is needed.
- Run the session without tool servers the roles do not use. Their tool definitions are sent on every turn whether or not a tool is called.

## While a workflow runs

- The orchestrator stops at every halt point and waits for you: an interview question, a decision, or the design review.
- In `DESIGN`, the review document is written into the session's design folder under `{{SESSIONS_ROOT}}/`. Open it in a browser, then approve or ask for changes in the chat.
- Delegates run as {{DELEGATION}}. You see their verdicts in the conversation.
- Runtime commands run as `{{RUNTIME_COMMAND}} <command>`. Allow them when the client asks.

## Verification

What Bootstrap verified for this client:

{{VERIFICATION}}
