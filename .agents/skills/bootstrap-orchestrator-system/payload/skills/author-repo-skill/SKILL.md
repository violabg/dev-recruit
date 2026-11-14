---
name: author-repo-skill
description: "Use when: adding a new repository-local skill, or reworking an existing one, so a repeatable procedure lives in a skill instead of being retyped into prompts or grafted onto a role contract."
invocation: user
---

# Author Repo Skill

Use this skill to create or evolve a repository-local skill in this repository's Agentic System.

A skill is a procedure the repository runs more than once and wants to run the same way every time. Anything used once belongs in a prompt. Anything a role must always obey belongs in that role's contract or in a scoped instruction file. A sequence of steps served one at a time with gates belongs to a workflow, not to a skill.

## Decide Whether A Skill Is The Right Home

Answer these before writing anything. If the answer to the first is no, stop and say which of the other homes fits.

- Is the procedure repeated? A one-off request is a prompt, not a skill.
- Is it invoked deliberately? A rule that must apply to every edit under a path is an instruction file with an `applyTo` scope.
- Does it belong to one role? A constraint that defines what a role may do is part of that role's contract.
- Does it have a definite output? A skill that cannot name its artifact or its finished state will not be reusable.
- Does it already exist? Search the skill directory first. Extending an existing skill beats adding a near-duplicate.

Two skills that differ only in a noun are one skill with a parameter.

## Gather Before Writing

Collect the repository facts the procedure depends on, and cite where each came from:

- the existing skills, so the new one matches their structure and does not overlap,
- the role roster, so the skill names the role allowed to run it,
- the conventions the procedure must respect: the session store, the runtime operations it may call, the context glossary, the knowledge catalogue, the validation commands,
- the concrete example that motivated the request, so the skill is written against real repository work rather than an imagined case.

Do not invent a tool, path, tracker, or command that discovery did not find. An unavailable capability is recorded as a recommendation, never as a requirement.

## Required Shape

Every generated skill has:

- frontmatter with `name`, a `description` that begins `Use when:` and states the triggering situation, and, when the skill must be invoked deliberately rather than chosen by the model, the client's setting that prevents automatic invocation,
- a one-line statement of what the skill produces,
- the preconditions that must hold before it runs, and what to do when one is missing,
- the procedure as ordered steps, each with an observable result,
- the output artifact: its path, its shape, and what makes it complete,
- the failure modes: what makes the skill stop and ask instead of guessing.

Rules for frontmatter:

- Do not add a tool list to a skill that a single role runs. Tool surface belongs to the role, and duplicating it in the skill lets the two drift apart.
- When a step needs work the running role should not do inline, delegate it with an explicit delegate instruction in the skill body and state what the delegate returns.

## Write It Repo-Specific

A skill that would read identically in any repository has failed. Name this repository's paths, commands, adapters, roles, and vocabulary. Prefer the repository's own wording over generic agent-system terms.

Keep it short enough to stay true. A long skill accumulates statements nobody verifies. Cut anything the reader can find in the role contract or the instruction files, and point at it instead.

## Evolving An Existing Skill

Changing a skill is the same procedure with one addition: state what breaks.

- Name every caller: roles, other skills, instruction files, and documented workflows that reference it.
- Say whether the change is compatible, and if not, what each caller must do.
- Keep the skill's name and invocation stable unless the change makes the old name wrong. Renaming costs every caller.
- If the change removes a rule, say why it is no longer needed. A removed rule with no reason gets reintroduced later by someone who hits the original problem.

When the repository has a customization register, record the new or changed skill there, so a later maintenance run can tell a deliberate repository addition from generated content.

## Approval And Validation

Propose the file plan and wait for explicit approval before writing. Approval is false by default.

After writing, verify:

- frontmatter parses and `description` states when to use the skill,
- every path, command, tool, and role named in the skill exists in this repository,
- no rule contradicts the role contracts or the instruction files,
- the skill declares which role may run it,
- the output artifact is described precisely enough that two runs produce the same shape,
- the repository's own validation commands were run where they apply, or each skipped command has a reason,
- the skill directory has no near-duplicate of the new skill.

Report the created or changed files, the callers affected, the validation results, and anything left deferred.
