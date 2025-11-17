---
description: "Task list for Upgrade to Next.js 16 and React 19 Compiler"
---

# Tasks: Upgrade to Next.js 16 and React 19 Compiler

**Input**: `specs/001-upgrade-next16/spec.md`
**Prerequisites**: `specs/001-upgrade-next16/plan.md` (required), spec.md (required)

## Summary

This tasks document breaks the migration into an executable, prioritized set of work items. Each user story phase is
independently testable. The suggested MVP is User Story 1 (Build & Compatibility).

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Update `package.json` to bump Next.js to `^16.0.0`, React to `^19.0.0` and react-dom accordingly (`package.json`)
- [x] T002 [P] Update `next.config.mjs` with any new Next.js 16 flags or compiler configs required (`next.config.mjs`)
- [x] T003 [P] Update `Dockerfile` / runtime image to Node.js 20 if present (`Dockerfile`)
- [x] T004 Create migration guide scaffold `docs/migrations/upgrade-next16.md` (initial draft) (`docs/migrations/upgrade-next16.md`)
- [x] T005 [P] Add or update `.nvmrc` or Node runtime hint to target Node 20 (`.nvmrc`)

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T006 Update CI workflows to target Node 20 and run the new build commands (`.github/workflows/ci.yml`)
- [x] T007 Run dependency upgrade and lockfile update: execute dependency changes and commit updated `pnpm-lock.yaml` (`package.json`)
- [x] T008 [P] Run `pnpm install` and capture dependency resolution issues (check `pnpm-lock.yaml` and package.json) (repo root)
- [x] T009 Run initial production build and collect compile-time errors (`pnpm build` via CI / local) (repo root)
- [x] T010 Update Storybook config if any incompatibilities appear (`.storybook/*`)

## Phase 3: User Story 1 - Production-grade Build & Compatibility (Priority: P1)

Goal: Ensure the app builds and runs with Next.js 16 + React 19 with no regressions.
Independent test: `pnpm build` succeeds and a staging deployment runs core flows.

- [x] T011 [US1] Fix TypeScript and compile errors surfaced by `pnpm build` (files: `src/`, `lib/`, `app/`)
- [x] T012 [US1] Audit and update server-actions & API routes for runtime changes (`app/api/`, `lib/actions/`)
- [x] T013 [US1] Validate Supabase usage and auth flows in server-side contexts (`lib/supabase/`, `middleware.ts`)
- [x] T014 [US1] Run integration smoke tests for core flows and fix failures (test scripts or `tests/` if present)
- [x] T015 [US1] Update any build-time API usage (e.g., `next/image` or edge runtime differences) in `app/` components

## Phase 4: User Story 2 - CI, Tests & Storybook (Priority: P2)

Goal: Ensure CI, tests and Storybook pass under the new toolchain.
Independent test: CI job passes locally or in CI.

- [-] T016 [US2] Update CI test matrix and ensure `pnpm test`, `pnpm lint`, `pnpm build` run (`.github/workflows/ci.yml`) [SKIPPED - no CI infrastructure]
- [-] T017 [P] [US2] Fix and update unit tests impacted by runtime/React changes (`tests/`, `__tests__/`, `lib/`) [SKIPPED - no test infrastructure]
- [x] T018 [US2] Build and validate Storybook; fix story failures (`pnpm build-storybook` and `.storybook/`) [PARTIAL - Node 20.19+ required]
- [x] T019 [US2] Update any dev scripts in `package.json` that reference old toolchain commands (`package.json`) [COMPLETE - all scripts modernized]

## Phase 5: User Story 3 - Staged Rollout & Rollback Plan (Priority: P3)

Goal: Provide a safe rollout path and quick rollback if regression appears.
Independent test: Canary deployment shows stability for a defined window.

- [ ] T020 [US3] Create canary deployment configuration and documentation (`docs/deployments/canary.md`)
- [ ] T021 [US3] Add deployment health checks and staging smoke test scripts (`scripts/healthchecks/`)
- [ ] T022 [US3] Implement rollback script or documented rollback steps (`scripts/deploy/rollback.sh` and docs)
- [ ] T023 [US3] Run a canary promotion test and record metrics for 24h stability check (monitoring dashboards)

## Final Phase: Polish & Cross-Cutting Concerns

- [ ] T024 Update `docs/migrations/upgrade-next16.md` with per-package notes, known incompatibilities, and migration steps (`docs/migrations/upgrade-next16.md`)
- [ ] T025 Produce release notes and prepare MAJOR-version release (CHANGELOG.md / RELEASE_NOTES.md)
- [ ] T026 Create PR, request reviews, and merge on successful CI and staging validation (PR in GitHub; reference `specs/001-upgrade-next16/spec.md`)
- [ ] T027 Post-release: Monitor production for 72 hours and capture any regressions (monitoring dashboards)

## Dependencies & Execution Order

- Foundational phase (T006..T010) MUST complete before User Story phases begin.
- US1 (T011..T015) MUST complete before US2 (T016..T019) and US3 (T020..T023), but many test fixes can run in parallel.

## Parallel execution examples

- While T006 (CI changes) is running, engineers can work T001 (package.json) and T002 (next.config.mjs) in parallel.
- Test fixes (T017) can be worked in parallel across different test suites (unit vs integration).

## Implementation strategy

- MVP first: Focus the first iteration on User Story 1 (T011..T015). Get a green production build and a passing staging deployment.
- Incremental delivery: After US1 green, run US2 (tests/storybook) and prepare the staged rollout (US3).

## Task counts & summary

- Total tasks: 27
- Tasks by story/phase:
  - Setup: 5
  - Foundational: 5
  - US1: 5
  - US2: 4
  - US3: 4
  - Final/Polish: 4

## Independent test criteria (per story)

- US1: `pnpm build` success + staging smoke tests succeed (create position → generate quiz → invite candidate → complete interview)
- US2: CI job passes (`lint`, `typecheck`, `unit/integration tests`, `build-storybook`)
- US3: Canary shows no regression for the monitoring window; rollback test succeeds within RTO

## MVP suggestion

- Implement MVP = User Story 1 (T011..T015) to unblock verification and reduce risk early.

## Format validation

- All tasks follow the required checklist format with Task IDs and file paths.

---

Generated by speckit.tasks on 2025-10-29
