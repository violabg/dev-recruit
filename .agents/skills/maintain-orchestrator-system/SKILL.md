---
name: maintain-orchestrator-system
description: "Use when: upgrading an installed orchestrator agentic system to a newer kit, changing its installation decisions (clients, locations, tracker, bindings), applying and recording an approved local runtime fix, or auditing whether the installed files still match them."
argument-hint: "Target repository, mode (upgrade, evolve, patch or audit), and what changed"
disable-model-invocation: true
---

# Maintain Orchestrator System

Keep an installed orchestrator agentic system current without losing what the repository deliberately changed. Maintenance works from the records Bootstrap left in the maintenance folder: `answers.json` (every decision), `manifest.json` (the kit version and the hash of every installed file) and `baseline/` (the last installed copy of each customizable file).

It uses the installer of the sibling `bootstrap-orchestrator-system` skill: `node <bootstrap skill>/scripts/install.mjs`. The installed kit version is the first heading of that skill's `CHANGELOG.md`.

Run maintenance in a plain session, never inside one of the installed roles. Write nothing before the user approves the maintenance plan; in `audit` mode write nothing at all.

## Modes

| Mode | When | What changes |
| --- | --- | --- |
| `upgrade` | A newer Bootstrap kit is installed than the manifest's `kit.version`. | The rendered files follow the new kit; the answers stay. |
| `evolve` | A decision changed: a client added or removed, sessions moved, a new tracker or integration, new validation commands. | The answers, then the rendered files. |
| `patch` | The user approved a fix to the installed runtime, usually a finding of `improve-orchestrator-system`. | The named runtime files, recorded as kept customizations. |
| `audit` | The user wants to know where the installation stands. | Nothing. |

Load `contracts/modes.md` to detect the installation and settle the mode, and `contracts/upgrade.md` for the plan, the merge rules and the apply.

## Rules

- Never read or change session contents. The sessions folder is a configured path, not evidence. The one exception is moving a hidden sessions folder (`contracts/upgrade.md`, Move hidden folders): the installer copies and hashes its files without interpreting them.
- Never hand-edit an installed role, workflow, contract or runtime file to "fix" it: change the answers or upgrade the kit, then re-render. The one exception is `patch` mode (`contracts/modes.md`, Patch), for runtime files and the contracts describing them.
- A customizable file the repository edited (the router block, a skill) is merged, never overwritten silently. A non-customizable file the repository edited is a conflict the user decides.
- Re-run the verification of `bootstrap-orchestrator-system` (`contracts/install-and-verify.md`, phase F) for every client a change touches, and keep each result honest.
