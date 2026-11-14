# Install and verify

Phases D to G. `<skill>` below is this skill's folder; run the scripts with the target repository as `--repo`.

## Phase D: File plan

```sh
node <skill>/scripts/install.mjs plan --repo <target>
```

The plan lists every file the installer would create, update or delete, with the clients it serves, plus warnings and errors. Present it with:

- the integration setup from `contracts/integrations.md`: configuration changes, logins, scopes;
- every warning, each with a proposed resolution (a duplicate discovery folder, a client that cannot prevent automatic skill use, a client without a permission file);
- every `conflict` and `merge` entry. On a first install a conflict is a file the system did not write already in the way (for example an existing agent with the same name); propose renaming with a different prefix, or replacing it (`--take`) or keeping it (`--keep`) with the user's explicit choice.

Errors stop the plan: fix the answers, never the payload. Approval is false until the user says otherwise. `install.mjs show <path>` prints the exact content of any planned file.

## Phase E: Apply

```sh
node <skill>/scripts/install.mjs apply --repo <target> [--take <path>]... [--keep <path>]...
```

Apply writes the plan, merges client settings, wraps `AGENTS.md`, `CLAUDE.md`, `.gitignore` and the Codex config in managed blocks so content outside them is never touched, keeps a baseline copy of every customizable file (router, skills), and writes `<maintenance root>/manifest.json` with the kit version and the hash of every file. It refuses to run while an entry is unresolved.

Then carry out the approved integration configuration, the approved tooling exclusions, exactly as approved, and the logins the user can complete now.

## Phase F: Verify

Static checks first:

```sh
node <skill>/scripts/verify.mjs --repo <target>
```

It confirms that the installed files match the answers with no unfilled slot and no hidden system folder, that no other copy of a workflow skill sits outside the shared folder, that the runtime starts and serves the three workflows, and that the sessions folder is reachable. If tooling exclusions were added, run the validation commands once to confirm they still work.

Then, in each selected client and on each surface the team uses, in a disposable session (never on product code or a real session):

1. The orchestrator starts through its route, can ask a question, and asks for the workflow type.
2. It creates a session through the runtime; the session appears in the chosen sessions folder.
3. It starts one delegate (for example `explorer`, asked where one symbol is defined) and the delegate runs in its own context and reports back. Where the client can run several subagents at once, it starts two explorers in one batch and both report back.
4. Each bound host token works from the role that uses it: one work item read, one image inspected, one wiki page when bound.
5. On the skill route, a role skill refuses to start inside a conversation that already runs a role.
6. Each shared workflow skill is discovered on this surface, once, with its role activation working. Installed files that parse do not prove it.
7. A runtime-only delegate is refused when it calls a runtime command outside its role, and a long runtime answer reaches it whole, part by part.

Record each check in `environments[].verification` of the answers file as `verified-native`, `verified-fallback`, `blocked` or `unverified`, with a short note. Run `install.mjs apply` again: the guides now show the results. A check you cannot run stays `unverified`; never mark a client compatible because its files parse.

## Phase G: Handoff

Report:

- the clients, their route and delegation, and each verification result;
- where everything lives, including the sessions folder and what each developer does once for an outside location;
- the files installed, and every conflict resolved and how;
- pending logins and deferred decisions;
- the guides: `<guide root>/README.md` and one per client.

Always recommend:

- running `knowledge-builder` to build the project knowledge in the knowledge folder, with the `MustHave`, `PerContext` and `PerComponent` tiers, referencing existing docs where they are;
- `manage-work-item` for creating or updating tracker items, or which binding would enable it when it was skipped;
- `author-repo-skill` for repository-specific procedures;
- `maintain-orchestrator-system` after a hand edit of installed files, a change of decisions, or a newer kit;
- `improve-orchestrator-system` after a session, to audit its token use, its adherence to the flow, and any gaps in the runtime, the knowledge or the issue.
