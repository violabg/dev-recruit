# Feature Specification: Upgrade to Next.js 16 and React 19 Compiler

**Feature Branch**: `001-upgrade-next16`  
**Created**: 2025-10-29  
**Status**: Draft  
**Input**: User description: "i want to migrate to nextjs 16 and use react 19 compiler" (see: [Next.js 16 blog](https://nextjs.org/blog/next-16))

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Production-grade Build & Compatibility (Priority: P1)

As a developer/owner, I need the application to build and run successfully under Next.js 16 and the React 19 compiler so that
all production and developer workflows continue to operate without regressions.

**Why this priority**: The Next.js and React compiler change touches the build/runtime layer. A successful build and runtime
compatibility is the gating requirement for all higher-level features (AI generation, DB access, auth).

**Independent Test**: Check out `001-upgrade-next16`, run the full CI build and a local production build, then start the app in
production mode and run smoke tests for core flows.

**Acceptance Scenarios**:

1. **Given** the upgraded code on the branch, **When** the CI pipeline runs the production build, **Then** the build completes
   successfully and artifacts are produced.
2. **Given** the deployed staging instance built from the branch, **When** a user performs core flows (create position → generate
   quiz → invite candidate → run interview), **Then** all flows complete with no errors and expected results.

---

### User Story 2 - CI, Tests & Storybook (Priority: P2)

As a developer, I need the repo CI pipeline, unit/integration tests, and Storybook to pass under the upgraded toolchain so that
developer productivity and regression detection remain intact.

**Why this priority**: Tests and Storybook verify components, server actions, and contracts; they catch regressions early.

**Independent Test**: Run CI job locally or in CI: lint, typecheck, unit tests, integration tests, Storybook build.

**Acceptance Scenarios**:

1. **Given** the branch, **When** CI runs lint/typecheck/tests/storybook build, **Then** all steps pass without new failing tests in
   core flows.

---

### User Story 3 - Staged Rollout & Rollback Plan (Priority: P3)

As an ops engineer, I need a staged rollout and a clear rollback plan so that if unexpected regressions occur they can be
rapidly mitigated.

**Why this priority**: Migration risk should be minimized with a staged rollout (staging → canary/prod) and tested rollback.

**Independent Test**: Deploy to staging, run smoke tests; promote to a canary subset of traffic and compare metrics; then promote
or rollback based on results.

**Acceptance Scenarios**:

1. **Given** a successful staging run, **When** the team promotes to canary, **Then** key metrics (error rate, latency, successful
   completion of interviews) remain within agreed thresholds.
2. **Given** a failed canary, **When** the team triggers rollback, **Then** production is restored to the previous release within the
   documented recovery time objective.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens if a third-party dependency used by the UI has no compatible release for Next.js 16?
- How does the system handle differences in server-action or edge-runtime behavior introduced by Next.js 16?

## Requirements _(mandatory)_

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: The repository MUST build successfully under Next.js 16 and the React 19 compiler using the project's production
  build command (e.g., `pnpm build`), producing deployable artifacts.
- **FR-002**: All server-side functionality (server actions, API routes, Supabase integration) MUST continue to operate and pass
  existing integration tests.
- **FR-003**: Client-side flows (position creation, quiz generation UI, interview playback) MUST render and operate as before in a
  staging environment.
- **FR-004**: CI pipelines MUST be updated (if necessary) to use the Node runtime and toolchain versions compatible with Next.js 16
  and the React 19 compiler and still pass lint/typecheck/tests.
- **FR-005**: A migration guide MUST be produced documenting steps, known incompatibilities, and rollback instructions.

_Example of marking unclear requirements:_

**FR-006**: Dependency update strategy: Upgrade Next.js, React and update all direct dependencies to their latest compatible
versions where possible. This includes devDependencies and direct runtime deps; transitive deps will be resolved via the
package manager. The migration guide will list per-package upgrade notes and any manual fixes applied.

**FR-007**: Release policy: The migration SHALL be released as a MAJOR version (breaking). The release must include clear
migration notes, a migration guide, and a staged rollout plan (staging → canary → production).

### Key Entities

- **Build Pipeline**: CI job definitions, Node/runtime versions, build artifacts, and deployment manifests.
- **Staging Environment**: Deployment instance used for validation (staging URL, environment variables, secrets scoped for staging).
- **Migration Guide**: The documentation artifact describing steps, compatibility notes, and rollback procedures.

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: The production build for the branch completes successfully and artifacts are produced (PASS/FAIL).
- **SC-002**: All CI checks (lint, typecheck, unit/integration tests) pass on the branch (PASS/FAIL).
- **SC-003**: Staging smoke tests for core flows (create position → generate quiz → invite candidate → complete interview)
  succeed with 100% pass rate for scripted checks.
- **SC-004**: No new high-severity runtime errors are introduced in staging for 24 hours after deployment (monitored error rate
  remains within baseline).

### Non-functional Expectations (informative)

- Developer experience (local dev server) should remain usable; build times may increase but should not prevent iterative work.
- Document any known breaking changes in the migration guide.
