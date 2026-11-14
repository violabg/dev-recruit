# Plan, merge and apply

## Plan

```sh
node <bootstrap skill>/scripts/install.mjs plan --repo <target>
```

The installer renders the files from the current kit and answers, and compares each with the repository and the manifest:

| Action | Meaning | What to do |
| --- | --- | --- |
| `unchanged` | Already matches. | Nothing. |
| `create` | New in this kit or for this decision. | Approve. |
| `update` | The repository copy is untouched since the last apply. | Approve. |
| `delete` | No longer installed, untouched. | Approve. |
| `merge` | A customizable file (router block, skill) was edited by hand and the render changed. | Merge, below. |
| `conflict` | A non-customizable file (role, workflow, contract, runtime, config) was edited by hand, a removed file was edited, or a settings value is set differently. | The user decides, below. |

The maintenance plan states the mode and why, the kit versions, the changed answers, every entry other than `unchanged` with its reason, the clients to re-verify, and rollback notes (git restores every tracked file; files in the user folder are listed separately). Approval is false by default.

A job keeps the list of instructions it was created with. When the changelog between the two kit versions says the upgrade ends running jobs (the workflow steps were removed or renumbered), say so in the plan and ask the user whether a job is in progress: it is finished before the apply, or started again as a new job after it. Never edit a job file to carry it over.

## Merge a customizable file

Three versions exist:

- **base**: `<maintenance root>/baseline/<path>`, the copy installed last time;
- **mine**: the file in the repository now;
- **theirs**: the new render, printed by `install.mjs show <path>`.

Compare by section. A section only theirs changed: take theirs. A section only mine changed: keep mine. A section both changed: show the user both and the kit's reason (from the changelog), and let them choose or merge. Write the merged result into the repository file, then apply with `--keep <path>` so the installer records it as a kept customization.

## Decide a conflict

Show what the repository changed (`git diff`, or the file against `install.mjs show <path>`). The user chooses:

- `--take <path>`: the kit's version replaces the edit. Recommended for roles, workflows, contracts and the runtime: the system depends on their exact text.
- `--keep <path>`: the edit stays and is recorded. It is asked again whenever the kit changes that file.

A repository-specific procedure belongs in its own skill (`author-repo-skill`), never in an edited installed file.

## Apply

```sh
node <bootstrap skill>/scripts/install.mjs apply --repo <target> [--take <path>]... [--keep <path>]...
```

Apply refuses while an entry is unresolved. It refreshes the manifest and the baselines only for what it applied.

When sessions move (evolve), move the existing session folders to the new location after the apply, with the user's approval, without reading their contents. Remove the old `.gitignore` block or client permissions only through the installer: they disappear from the plan when they are no longer rendered.

## Move hidden folders

An installation made before visible folders uses `.agentic-system/`, `.agentic-system-maintenance/` and possibly `.agentic-system-sessions/` or the singular `.agentic-system-session/`. They become `agentic-system/`, `agentic-system-maintenance/` and `agentic-system-sessions/`. Never delete a system folder as a shortcut, and never create a second session store. Sessions outside the repository, such as `~/.agentic-system/sessions/...`, do not move.

Work on a clean git tree, and get the user's approval for the plan first. Run the steps in this order, in one sitting and with no session running:

1. `install.mjs migrate plan --repo <target>` lists each move with its file count and stops on a collision: a destination that exists with content, or two old folders that map to one name. The user resolves those.
2. `install.mjs migrate apply --repo <target>` copies each folder, verifies every copied file by hash, then rewrites the answers, the manifest and the baselines at the new location, and removes the installer's own entries for the old paths from client settings. The old folders stay as the backup.
3. `install.mjs plan`, then `install.mjs apply`, re-render every reference: runtime commands, role files, skills, routers, contracts, guides, `.gitignore` and permission rules.
4. Settle `tooling-exclusions` for the new folder names, then run `verify.mjs` and the native checks. Until step 5, `verify.mjs` reports the old folders as hidden, and it must report nothing else.
5. `install.mjs migrate retire --repo <target>` deletes the old folders. It refuses if an old folder changed after the copy, or if a file that is not rendered by the installer is missing at the new location. Run it before committing: the old sessions folder is no longer ignored by git once step 3 has updated `.gitignore`.

Afterwards a repeated `plan` must report nothing to do and no hidden folder. Search the repository's own scripts and documents for the old names and report them, since the installer does not own those.

## After

Run `verify.mjs`, then the native checks for every client the change touched, record the results in `answers.json` and apply once more so the guides show them. Report what changed, what was kept, what was deferred, and the new kit version in the manifest.
