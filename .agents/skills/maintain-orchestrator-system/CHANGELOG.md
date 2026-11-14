# Changelog

Versions follow semantic versioning.

## 1.2.1

- The maintenance plan says when an upgrade ends running jobs, as the Bootstrap changelog states it, and asks whether a job is in progress. A job file is never edited to carry it over.

## 1.2.0

- New `patch` mode: applies an approved fix to the installed runtime and records it as a kept customization, so the next upgrade recognizes it. Workflows and role contracts stay out of scope.

## 1.1.0

- Moves an installation from hidden system folders to visible ones without losing session data, answers, manifests, baselines or customizations.
- Upgrades keep the recorded shared skills folder and never recreate per-client copies.

## 1.0.0

- First release: `upgrade`, `evolve` and `audit` for installations made by `bootstrap-orchestrator-system`, driven by its installer and the answers, manifest and baselines it records.
