# Actions

Take each finding through its action, one at a time. Each needs the user's approval of that finding.

## `runtime`: fix here or report to the kit

Ask per finding, and show the exact change:

- **Fix in this repository.** Run `maintain-orchestrator-system` in `patch` mode with this finding and the change. The Maintainer applies and records it (its `contracts/modes.md`, Patch). Write no report for this finding.
- **Report to the kit's maintainer.** Add the finding to the report below. Apply nothing to this repository.

The two are exclusive. Before offering the fix, warn that it stays local to this repository: no other installation receives it, and it does not reach the kit.

If the Maintainer skill is not installed, say so and offer the report.

## `workflow`: report only

Workflow instructions and role contracts are shipped as a unit and depend on their exact text, so they are never patched in a target. Add the finding to the report.

## `knowledge`: ask, then hand over

Ask whether to build the missing knowledge. `knowledge-builder` runs as the main conversation of its own session because it interviews the user, so it cannot be started from here. With the user's approval, print a brief for them to paste when they start the role, and name how to start it for their client (the installation guide in `<guide root>` says how):

```text
Topic: <what the knowledge must cover>
Why: <what the session paid for missing it, with the numbers>
Existing documents: <paths; for a conflict, the two passages and what the code shows>
Audience: an agent with no knowledge of this project, working on <the kind of task>
```

## `issue`: propose, then update through the skill

Show the gap and the exact wording. With the user's approval, follow `manage-work-item` in `update <id>` mode, in this session: find the installed skill, read its `SKILL.md`, and follow it. Its own rules still apply, including presenting the per-field before and after, and re-reading the item before writing. Never write to the tracker in any other way.

If the digest shows `manage-work-item` as skipped, or no tracker binding can write, give the user the text to apply themselves and name what would enable the skill.

## `behaviour`: report only

It stays in the audit report. There is nothing to change.

## The report for the kit's maintainer

Write one file per audit, holding every finding routed to it, from `templates/kit-improvement-report.md`, at:

```text
<maintenance root>/improvements/<YYYY-MM-DD>-<slug>.md
```

Do not commit it. Tell the user the path, and that the file is what they pass to the kit's maintainer.

The file leaves this repository, so it must hold only what the kit's maintainer needs:

- Keep runtime tokens, workflow step names, counts, sizes, and the runtime's own messages.
- Remove repository, company and people names, application code, business content from the issue or the design, paths outside the installed system, and anything resembling a credential.
- Describe a failing payload by its shape, not its values.

Show the file to the user before finishing.
