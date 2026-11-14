# Locations and permissions

Where each part of the system lives, and what makes a location outside the repository work.

## Location groups

| Group | Location | Choice |
| --- | --- | --- |
| Client discovery files: role files, skills, `AGENTS.md` / `CLAUDE.md`, client settings | where each client discovers them, in the repository | none |
| Runtime, its `config.json`, workflows, contracts | `locations.runtimeRoot`, default `agentic-system/`, tracked | derived |
| Sessions and the runtime cache | `locations.sessionsRoot` | **the user chooses** |
| Installation records: answers, manifest, baselines | `locations.maintenanceRoot`, default `agentic-system-maintenance/`, tracked | derived |
| Project knowledge | `locations.knowledgeRoot`, default `knowledge/`, tracked | derived |
| Client guides | `locations.guideRoot`, default `docs/agentic-system/`, tracked | derived |
| Example documentation templates | the user folder (`locations.userRuntimeRoot`) or the workspace folder `<runtime root>/documentation/templates/` | the user chooses |

The runtime, the records, the knowledge and the guides stay in the repository so that a teammate's clone works and anyone can run maintenance.

Every system folder in the repository is visible: its name never starts with a dot, and the installer refuses one that does. This concerns the system's own folders (`agentic-system/`, `agentic-system-maintenance/`, `agentic-system-sessions/`), not the discovery folders a client requires, such as `.claude/`, `.github/`, `.opencode/` or `.agents/`, which keep their names. Visibility does not change version control: sessions stay ignored by git, the runtime and the records stay tracked.

A broad compiler, lint or test glob can now pick up these folders. Find those tools in phase B and settle the `tooling-exclusions` question: the exact lines the user approved are the one change Bootstrap makes to application configuration.

## Shared skills folder

Install one authoritative copy of each workflow skill, in the folder the most selected clients discover. Choose from verified capabilities, not from a folder's branding or a fixed preference for `.agents`, `.claude` or `.github`. Role skills on the skill route and role files stay per client, because their tool lists and permissions differ.

1. Identify the selected clients and their actual surfaces. Copilot CLI and the VS Code harness are different surfaces, and a folder that works on one may not work on the other.
2. Run `install.mjs skills-folder` for the ranking from the profiles, and check each entry against the client's current documentation. Keep apart what is documented, what you verified live and what is still unknown.
3. Prefer a folder common to all selected clients. If several qualify, keep the one already in use, to avoid a migration.
4. If none works for all, take the widest one. Each remaining client reaches it through a symlink where that is supported. If it is not, explain the limit and get the user's approval for a client-specific copy.
5. Record the decision in `skillSharing` in the answers file:

```json
"skillSharing": {
  "folder": ".agents/skills",
  "clients": {
    "codex": { "via": "native", "evidence": "documented; verified in a session on 2026-10-31" },
    "claude-code": { "via": "symlink", "evidence": "symlinked skill entries are documented" },
    "cursor": { "via": "copy", "reason": "the user approved it: ..." }
  }
}
```

The installer renders from this decision, and a newer kit keeps it. A shared skill carries no client suffix. What differs per client, such as role activation and tool bindings, is written out per client in its one body. Before consolidating, compare what each client's copy would do: if bindings, permissions or behavior differ materially, resolve that or keep an approved exception, and never silently take one client's version. `disable-model-invocation` only works on a client that supports it, and the installer warns about each client that does not. Never treat metadata a client ignores as enforcement.

Do not assume an untested folder works. Phase F validates discovery on each selected surface, and a check you could not run stays recorded as a gap.

Before moving skills in an existing repository, look for copies, local edits and symlinks. The installer never writes through a symlink, and it reports any copy outside the shared folder that discovery could load instead, for the user to reconcile. It never deletes a skill it did not install.

## Sessions

Recommend a folder outside the repository, `~/.agentic-system/sessions/<repo-name>`. Sessions belong to one developer, change constantly and must not pollute the repository or its search results. The alternative is the visible repository folder `agentic-system-sessions/`; the installer then adds it to `.gitignore` inside a managed block.

The runtime keeps its cache in `<sessions root>/.cache`, so the tracked runtime folder never receives generated files. The cache holds the catalogue index and, under `responses/`, a copy of each long answer for a day, so its parts can be read; these copies hold design and session text, as the sessions do.

## Locations outside the repository

A location outside the repository works only when all of these hold:

1. **Recorded.** It is in the answers file and in `<runtime root>/config.json`, which the runtime reads. The installer writes the config.
2. **Portable.** It is written with `~` (or another path that resolves on every teammate's machine), never as one person's absolute path. The runtime expands `~`.
3. **Reachable.** Every selected client may read and write it from the roles that need it. The installer adds the client setting where the profile names one: `additionalDirectories` for Claude Code, `writable_roots` for the Codex sandbox, `external_directory` for OpenCode. For a client without a project permission file the user approves on first use; record that.
4. **Verified.** `verify.mjs` creates a session through the runtime; phase F repeats it from each client.

Some clients may not expand `~` in their own settings. When phase B finds that, record an override with the form the client documents and say in the guide what each developer does once on their machine.

## Runtime command

Every role that uses the runtime runs `node <runtime root>/bin/agentic-system.mjs <command> --role <role>` from the repository root. `config.json` lists each role's commands, and the runtime refuses any other command for that role. The installer allows exactly that command in the client settings where the profile has a permission file (`Bash(node agentic-system/bin/agentic-system.mjs *)` for Claude Code, a terminal auto-approve entry for VS Code, a `bash` permission for OpenCode). Never allow a broader shell pattern for it. A role whose only terminal use is the runtime is limited further where the client can do it: a `PreToolUse` hook on the Claude Code subagent, per-command `bash` permissions on OpenCode. Copilot, Codex and Cursor have no such limit in their profiles, so there the role's limit is the runtime refusal and an instruction. Claude Code runs a project subagent's hook only after the folder is trusted.

`config.json` also sets `partLimit`, the largest runtime answer of any command in bytes, to the smallest `runtime.partLimit` of the selected clients. A delegate without a file tool cannot read output the client saved to a file, so a limit that is too high loses its input. A selected client whose limit is larger than the smallest has it under its id in `partLimits`, and its role files pass `--client <id>` on every runtime command, so it is not held to another client's limit. A workflow skill is shared between clients and names none, so its calls use `partLimit`. Settings files are merged: existing entries stay, and a value already set differently is a conflict for the user to resolve.
