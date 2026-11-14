# {{REPO_NAME}} agentic system

This repository runs an orchestrator-based agentic system. You choose one of three workflows, and a local runtime serves it one instruction at a time:

- `DESIGN`: a structured design (obligations, decisions, contracts, filesystem, operations) that the orchestrator verifies against itself and you approve in a review document, then implementation and review.
- `FAST_IMPLEMENTATION`: a quick path for simple or mechanical changes, with no design and no approval step.
- `DOCUMENTATION`: a guide written from a template, then reviewed.

In `DESIGN` the orchestrator never writes production code: it hands the operations to the code implementor, which works in its own context, and reviews every work unit itself. In `FAST_IMPLEMENTATION` the orchestrator implements the change directly. In both it does not search the codebase itself: it starts read-only explorers, several at once, each for one fact, and works from the positions they return.

## Where things live

| What | Where |
| --- | --- |
| Runtime, workflows, contracts | `{{RUNTIME_ROOT}}/` |
| Sessions (memory, log, artifacts, designs) | `{{SESSIONS_ROOT}}/` |
| Project knowledge | `{{KNOWLEDGE_ROOT}}/` |
| Vocabulary | `{{CONTEXT_GLOSSARY_PATH}}` |
| Personal documentation templates | `{{USER_RUNTIME_ROOT}}/documentation/templates/` |

The runtime needs Node.js. Never edit files under the sessions folder by hand: designs and jobs change only through the runtime.

## Guides per client

{{CLIENT_LIST}}

## Keeping it current

The installation is recorded in the maintenance folder. To change a decision or move to a newer kit, run the `maintain-orchestrator-system` skill in a plain session, not inside one of the roles. To audit how a session went (token use, adherence to the flow, gaps in the runtime, the knowledge or the issue), run `improve-orchestrator-system` there with the session id.
