# Tasks: Cache Components Sweep

**Input**: plan.md, spec.md, research.md, data-model.md, contracts/ (cache components + runtime rules)
**Prerequisites**: plan.md must be complete before implementing tasks; spec user stories drive Phases 3‑5

## Constitution Alignment (required)

- Every task that touches runtime data must keep the work inside `<Suspense>` boundaries that use `components/ui/skeleton.tsx` fallbacks so the prerendered shell never sees `searchParams`/`params`/`cookies()`/`headers()` outside a fallback (Principle I).
- Mutations reuse `lib/actions/*`, call `requireUser()`, and refresh the same `cacheTag` + `revalidateTag` entries they depend on (Principle III).
- UI and layout updates reuse the shared Vision Pro primitives under `components/ui/` (Principle IV).
- Documentation updates to `README.md` and `docs/CACHE_IMPLEMENTATION.md` capture the new streaming flow and caching discipline (Principle V).

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 [P] Create `app/dashboard/fallbacks.tsx` that exports `StatsSkeleton`, `FiltersSkeleton`, `CandidatesListSkeleton`, and `InterviewsSkeleton` wrappers built on `components/ui/skeleton.tsx` so every Suspense boundary reuses the same fallback UI.

---

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T002 Update `lib/actions/candidates.ts` so every mutation calls `requireUser()` and `updateTag("candidates")` immediately after writing to keep the `candidates` cache in sync.
- [ ] T003 Update `lib/actions/interviews.ts` to call `requireUser()` plus `updateTag("interviews")` after every interview mutation so the interview cards/tables see fresh data.
- [ ] T004 Update `lib/actions/positions.ts` to call `requireUser()` and `updateTag("positions")` after any write so the position filters/new candidate defaults stay consistent.

**Checkpoint**: With cache tags wired in `lib/actions/*`, all user stories can now focus on runtime-bound UI sections.

---

## Phase 3: User Story 1 - Streamlined Candidate Dashboard (Priority: P1) 🎯 MVP

**Goal**: Static candidate dashboard shell renders instantly while stats, filters, and the list stream through Suspense fallbacks built from the shared skeletons; runtime parsing (`searchParams`) never leaks outside `<Suspense>` and repeated data is cached with `cacheTag("candidates")`/`revalidateTag("positions")`.

**Independent Test**: Visiting `/dashboard/candidates` in `pnpm dev` shows the header and `StatsSkeleton`/`FiltersSkeleton` before filters or list render, and `pnpm build` / `next build` emits no `Uncached data was accessed outside of <Suspense>` errors.

- [ ] T005 [US1] Create `app/dashboard/candidates/runtime-section.tsx` that parses `searchParams` (status, positionId, sort, view, pagination), defaults invalid values, and renders stats, filters, and candidate list data inside `'use cache'` scopes tagged with `cacheTag("candidates")` / `revalidateTag("positions")` while exposing the data to the page.
- [ ] T006 [US1] Update `app/dashboard/candidates/page.tsx` to render the static shell around `<Suspense fallback={<StatsSkeletonFallback/>}>` (from `app/dashboard/fallbacks.tsx`) and mount the new runtime section so the shell never blocks on query params.
- [ ] T007 [US1] Ensure `app/dashboard/candidates/candidates-actions.ts` triggers the cached helpers (via `lib/actions/candidates.ts`) so any mutations users fire from the dashboard still call `updateTag("candidates")` and keep the cached stats in sync with the streaming runtime section.

**Checkpoint**: Candidate dashboard should now deliver the shell + skeletons immediately and stream runtime data afterward.

---

## Phase 4: User Story 2 - Responsive Interviews Overview (Priority: P2)

**Goal**: `/dashboard/interviews` renders the static status grid immediately while filters/pagination data stream through Suspense, with `cacheTag("interviews")` protecting repeated cards/tables.

**Independent Test**: Reloading `/dashboard/interviews` shows `InterviewsSkeleton` cards instantly and the table populates once the runtime section resolves.

- [ ] T008 [US2] Implement `app/dashboard/interviews/runtime-section.tsx` that parses interview-specific query params, fetches status cards and table rows inside `'use cache'` blocks tagged with `cacheTag("interviews")`, and falls back to the shared `InterviewsSkeleton` from `app/dashboard/fallbacks.tsx` while the data resolves.
- [ ] T009 [US2] Update `app/dashboard/interviews/page.tsx` so the static layout renders first and wraps the new runtime section in `<Suspense fallback={<InterviewsSkeleton />}>`, keeping runtime params out of the cached shell.

**Checkpoint**: Interviews overview now streams data through Suspense without blocking on runtime inputs.

---

## Phase 5: User Story 3 - Guided Candidate Creation (Priority: P3)

**Goal**: `/dashboard/candidates/new` renders its header layout immediately while the optional `positionId` query is validated inside a Suspense section that provides defaults to the form once the runtime check completes.

**Independent Test**: Navigating to `/dashboard/candidates/new?positionId=<id>` renders the surrounding layout quickly, with the runtime validation and auto-selected dropdown resolving inside the Suspense fallback.

- [ ] T010 [US3] Build `app/dashboard/candidates/new/runtime-section.tsx` that fetches cached positions (`cacheTag("positions")`), validates the optional `positionId`, falls back to the latest open position, and exposes `formDefaults` to `CandidateNewForm` once the runtime segment resolves.
- [ ] T011 [US3] Update `app/dashboard/candidates/new/page.tsx` to wrap the runtime section with `<Suspense fallback={<FiltersSkeleton />}>` so the rest of the layout remains unaffected while the position validation settles.

**Checkpoint**: New candidate flow now uses Suspense to keep the layout fast while handling runtime defaults.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Document the streaming patterns and cache tags plus ensure cross-story consistency.

- [ ] T012 [P] Record the new cache component layout and Suspense rules in `README.md` (Cache Components Strategy) and `docs/CACHE_IMPLEMENTATION.md` so contributors know how to add runtime sections safely and trigger `updateTag` after mutations.

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: Can start immediately; sets up shared skeleton fallbacks referenced by all stories.
- **Phase 2 (Foundational)**: Depends on Setup and must finish before any user story work because it wires `updateTag` hooks required by the Streaming sections.
- **Phase 3+ (User Stories)**: Each story depends on Phase 2 but can run in parallel once foundation is ready; they stay independent as long as new files (runtime sections) are story-specific.
- **Phase 6 (Polish)**: Runs last to capture the overall architecture in the docs.

### User Story Dependencies

- **US1 (P1)**: Blocks the MVP but not dependent on US2/US3.
- **US2 (P2)**: Can start once Phase 2 completes; independent from US1.
- **US3 (P3)**: Also independent after Phase 2; focuses on new candidate form defaults.

## Parallel Execution Examples

- **Setup**: `T001` runs alone to establish the fallback exports; once done, multiple developers can tackle separate stories.
- **User Stories**:
  - Developer A works on `T005`/`T006`/`T007` for the candidate dashboard.
  - Developer B works on `T008`/`T009` for interviews.
  - Developer C works on `T010`/`T011` for the new candidate form.
  - All three stories can proceed concurrently after Phase 2.

## Implementation Strategy

1. **MVP First**: Complete Setup `T001` and Foundational `T002`-`T004`, then deliver US1 (`T005`-`T007`) so `/dashboard/candidates` streams correctly before adding other stories.
2. **Incremental Delivery**: After US1, add US2 (`T008`/`T009`), then US3 (`T010`/`T011`), validating each independently before moving to the next.
3. **Parallel Team Strategy**: With multiple contributors, split work by user story as outlined above while keeping Phase 6 documentation in sync once all stories ship.
