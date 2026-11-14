# Modes and detection

## Detect the installation

An installation has a maintenance folder (default `agentic-system-maintenance/`) with `answers.json` and `manifest.json`. Read both, and the installed Bootstrap version from the sibling skill's `CHANGELOG.md`.

- A hidden `.agentic-system-maintenance/` folder: the installation predates visible folders. Follow `contracts/upgrade.md`, Move hidden folders, before anything else.
- No maintenance folder: there is nothing to maintain. Offer `bootstrap-orchestrator-system`. A repository that still runs the earlier Planner/Implementor system is a fresh install of this system, not an upgrade.
- `answers.json` without `manifest.json`: the last apply did not finish. Run `install.mjs plan` and treat every existing file as a conflict to review.
- A `manifest.json` written by a newer kit than the one installed: stop and ask the user to install that kit first.

## Settle the mode

- The installed kit is newer than `manifest.kit.version`: `upgrade`. Read the Bootstrap `CHANGELOG.md` entries between the two versions and summarize what changes for this repository.
- The user describes a changed decision: `evolve`. Find its question in the Bootstrap `registry/questions.json` and settle it again the way Bootstrap does (evidence, recommendation, the user's answer). Update `answers.json` only after approval.
- Both: keep the two sets of changes apart in the plan so the user can approve one and defer the other.
- The user brings an approved runtime fix: `patch`.
- Neither, or the user asks: `audit`.

## Audit

Run:

```sh
node <bootstrap skill>/scripts/install.mjs check --repo <target>
node <bootstrap skill>/scripts/verify.mjs --repo <target>
```

Report every drifted file (edited by hand, missing, or not yet installed), every unfilled slot, the runtime and sessions checks, and the recorded verification of each client. Compare each selected client's profile with its current documentation and report differences as proposed overrides. Write nothing.

## Patch

Apply one approved fix to the installed runtime and record it, so the next upgrade finds a known customization and not an unexplained edit.

**Scope.** Only `<runtime root>/bin`, `lib` and `assets`, and the `<runtime root>/contracts` file describing the changed behavior. A workflow instruction or a role contract is out of scope: stop and say it goes to the kit's maintainer as a report. A fix must not remove, weaken or reorder a served step, a check, a verifier or the approval gate.

**Preconditions.** Stop and report if any fails:

- the installed kit is the same version as `manifest.kit.version`; otherwise upgrade first, since the newer kit may already hold the fix;
- `install.mjs plan` reports nothing to do;
- the files to change have no uncommitted edits, and no session is running.

**Steps.**

1. Show the exact diff and why it is needed. Approval is false by default. A diff the user already approved in `improve-orchestrator-system` needs no second approval, unless it changed.
2. Change the files.
3. Run `install.mjs plan`. It must list exactly the changed files as `conflict` and everything else as `unchanged`. If not, restore the files and stop.
4. Record them: `install.mjs apply --repo <target> --keep <path>...`.
5. Run `verify.mjs` and `node <runtime root>/bin/agentic-system.mjs --help`. Reproduce the original failure on a scratch session you create for this, never on the audited one, then delete that scratch session. If any of this fails, restore each file with `install.mjs apply --repo <target> --take <path>` and report the failure.
6. Report the kept paths and suggest a commit message that names the finding. Do not commit.

**What it means afterwards.** The fix stays local to this repository and does not reach the kit. `plan` reports the file as `unchanged` while the kit's version of it stays the same. When a newer kit changes that file, the upgrade shows it as a `conflict` to decide: `--take` if the kit now holds the fix, `--keep` otherwise. An upgrade that leaves the file alone does not ask.

## New questions

The recorded `skillSharing` decision is preserved: an upgrade never recreates per-client skill copies. A kit that first asks for it makes the installer stop and name it, so settle `skills-folder` with the user. Every client copy the previous install wrote then appears as `delete`, and the symlinks as `create`.

A newer kit can add a question to `registry/questions.json` or a requirement to the answers file. The installer names missing answers when it refuses to plan. Settle each new question with the user before planning, and record it in `answers.json` with how it was settled.
