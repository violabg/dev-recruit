---
name: manage-work-item
description: "Use when: the user explicitly invokes this workflow to create a bug or user story, or to update an existing work item, in this repository's tracker."
invocation: user
---

# Manage Work Item

Use this skill only when the user explicitly invokes `manage-work-item` by name. It is a standalone workflow that runs outside the orchestrator: do not activate a session, start a job, begin a workflow, or start any design or implementation.

## Modes

- `create-bug`
- `create-user-story`
- `update <work-item-id>`

Ask for the mode when the request does not state it. An update names an existing work item ID; never search the tracker to guess which item the user means.

## Create

Clarify the type, required fields, scope, acceptance criteria or reproduction details, and the target tracker before creation. Continue clarification until the proposed work item is specific enough to review. Then present the complete proposed type, title, description, acceptance criteria or reproduction details, and target tracker, and wait for the user's explicit approval before creating it. Approval of the workflow or earlier discussion is not approval of the final proposal.

After approval, create the work item with `#capability:work-item-create`.

## Update

1. Read the requested item with `#capability:work-item-retrieval` and its comments with `#capability:work-item-comment-retrieval`. Read only that ID. If the item is missing, unreadable, or the ID is invalid, stop and report it without changing anything.
2. Present the item's current type, title, state, description, acceptance criteria or reproduction details, and the comments that bear on the requested change.
3. Clarify until every field to change has a specific new value. Leave every other field untouched; do not rewrite or reformat content the user did not ask to change.
4. Present the exact change as a per-field before and after list, plus any comment to add, and wait for the user's explicit approval of that change. Approval of the workflow, the read, or earlier discussion is not approval of the change.
5. Read the item again immediately before writing. If it changed since step 1, show the difference and ask for approval again.
6. Apply only the approved change with `#capability:work-item-update`. Never delete a work item or comment, and never change state, assignee, links, or labels unless the approved change names them.

## Persistence

Use only the tracker bindings approved for this skill, with their supported fields, and report each result. When the approved tracker is the local Markdown tracker, follow `{{LOCAL_MARKDOWN_TRACKER_CONTRACT}}`. Never substitute a shell command, API call, guessed tool, or another client's tool. If a required binding is unavailable or cannot perform the operation, explain the blocker and ask the user to configure or select an approved integration; do not create or change anything.

The explicit invocation is the authorization to run this workflow, but it does not authorize writing: every create or update still requires explicit approval of the final proposal.

## Handoff

Return exactly:

- Mode
- Work-item type
- Work-item ID
- Adapter
- Source link or local Markdown path
- Changed fields, for an update
- Any unresolved fields

Do not design or implement anything. The returned ID is what the user passes to `plan-bug-from-id` or `plan-user-story-from-id` to start the orchestrator.
