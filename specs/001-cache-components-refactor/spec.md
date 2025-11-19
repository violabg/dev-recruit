# Feature Specification: Cache Components Sweep

**Feature Branch**: `001-cache-components-refactor`  
**Created**: 2025-11-19  
**Status**: Draft  
**Input**: User description: "refactor to use cache componets on every pages"

## Constitution Alignment (mandatory)

- All updated routes keep Prisma/AI fetches inside `'use cache'` + `cacheLife` scopes, tag cached entries with `cacheTag`, defer runtime data (`cookies()`, `headers()`, `searchParams`, `params`) to dedicated `<Suspense>` trees, and call `updateTag` from their server actions so the `cacheComponents: true` shell never sees stale work outside a fallback (Principle I).
- No AI-specific changes are required, so `lib/services/ai-service.ts` and its Zod guards remain untouched, but the new Suspense-driven runtime flows reference the existing dashboards, not Groq requests (Principle II).
- Any mutations triggered from these routes already reuse `lib/actions/*` and will keep calling `requireUser()`; after the refactor the cache tags those mutations already emit (`cacheTag("candidates")`, `cacheTag("positions")`, etc.) continue to revalidate the prefetched cards and lists (Principle III).
- UI work reuses the Tailwind v4 + Vision Pro token primitives inside `components/ui/` and the dashboard feature components (e.g., cards, tables, skeletons) while the form updates keep using React Hook Form + Zod schemas defined under `components/candidates` (Principle IV).
- The README `Cache Components Strategy` section and `docs/CACHE_IMPLEMENTATION.md` (referenced there) will document how runtime data now streams through Suspense fallbacks, keeping the constitution linked to the planned changes (Principle V).

## Clarifications

### Session 2025-11-19

- Q: Should this refactor touch routes outside `/dashboard/*`? → A: Keep the refactor scoped to `/dashboard/*` routes only.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Streamlined Candidate Dashboard (Priority: P1)

As a recruiting manager, I want the candidate dashboard to render its static shell instantly while runtime filters, stats, and the list stream in through Suspense fallbacks so the page never halts waiting for query params.

**Why this priority**: The candidate list is the landing screen for most users, and the existing blocking error shows that runtime searchParams currently break prerendering.

**Independent Test**: Visiting `/dashboard/candidates` in `pnpm dev` should render the header/card skeleton before the filters or list render, and `next build` should not emit the "Uncached data was accessed outside of &lt;Suspense&gt;" error.

**Acceptance Scenarios**:

1. **Given** the dashboard is rendered, **when** search params arrive, **then** the Suspense fallback displays `StatsSkeleton`, `FiltersSkeleton`, and `CandidatesListSkeleton` while runtime data resolves.
2. **Given** invalid or missing query params, **when** the runtime component resolves, **then** defaults (`status=all`, `position=all`, `sort=newest`, `view=table`) appear and the candidate list renders without throwing runtime errors.

---

### User Story 2 - Responsive Interviews Overview (Priority: P2)

As a hiring lead, I want the interviews page to keep showing status cards and skeletons while runtime searchParams (filters, pagination) resolve so the page can stream rather than block.

**Why this priority**: The interviews page currently awaits `searchParams` before anything renders, which violates the cache-components contract.

**Independent Test**: Refreshing `/dashboard/interviews` in `pnpm dev` shows the status grid immediately while the filters and table content fill in after the Suspense boundary settles.

**Acceptance Scenarios**:

1. **Given** a user navigates with multiple query params, **when** the runtime component loads, **then** the fallback cards remain visible until `fetchInterviewsData` resolves and the table populates.

---

### User Story 3 - Guided Candidate Creation (Priority: P3)

As a recruiting coordinator, I want the new candidate form to use the `positionId` query without blocking the entire page so the rest of the layout can render immediately.

**Why this priority**: Optional filters such as `positionId` should only affect the form defaults and not gate the page render when the query is missing.

**Independent Test**: Loading `/dashboard/candidates/new?positionId=<id>` renders the surrounding header/card while the props that validate the position ID are resolved in a Suspense section.

**Acceptance Scenarios**:

1. **Given** the requester provides a `positionId`, **when** the runtime wrapper resolves, **then** the form receives `validPositionId` and the dropdown preselects that position without blocking the initial layout.

---

### Edge Cases

- What happens when runtime search params contain IDs that no longer exist? The runtime component must fall back to the default position and still let the skeleton expire gracefully.
- How does the system handle slow data (e.g., the interviews fetch takes >2 seconds)? Suspense boundaries must continue to show skeletons until the final list renders, with no blocking-route errors.
- How are query params validated when they are malformed (e.g., non-numeric `page`)? Runtime parse helpers should default to safe values (page=1) and keep streaming data.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Every runtime API call (`searchParams`, `params`, `cookies`, `headers`) in the affected routes must run inside a component that is itself wrapped by `<Suspense fallback={...}>` so the static shell never sees uncached data.
- **FR-002**: Repeated data sections (stats cards, recent positions, candidate counts) must live in `'use cache'` scopes opened within the Suspense content and declare explicit `cacheLife(...)` profiles plus `cacheTag`/`revalidateTag` hooks so cached shells update when actions mutate data.
- **FR-003**: Each Suspense fallback must reuse the existing skeleton primitives (`StatsSkeleton`, `FiltersSkeleton`, `CandidatesListSkeleton`, `PositionsSkeleton`, `DashboardStatsSkeleton`, `RecentPositionsSkeleton`) built on `components/ui/skeleton` so styling matches the shadcn component structure.
- **FR-004**: Document the resulting page structure in `README.md` and `docs/CACHE_IMPLEMENTATION.md`, detailing which sections now stream at request time and how to add new runtime segments.
- **FR-005**: All server actions invoked from these pages continue to call `requireUser()` and refresh their respective cache tags so the cached components stay current after mutations.
- **FR-006**: Actions that mutate positions, candidates, or interviews data must call `updateTag` for the corresponding caches immediately after a write so the stats/cards refresh for the next request.
- **FR-007**: Every `/dashboard/*/page.tsx` route that touches runtime search params or filters must keep that work inside `'use cache'` + Suspense boundaries (with `components/ui/skeleton` fallbacks) so the prerendered shell never blocks.
- **FR-008**: Confine the cache components refactor to existing `/dashboard/*` routes so other app areas remain untouched during this feature.

### Key Entities _(include if feature involves data)_

- **CandidateDashboardRuntimeSection**: Wraps `searchParams` parsing and query defaults for stats, filters, and the list under Suspense fallbacks.
- **InterviewsRuntimeSection**: Parses interview-specific query params, calls `fetchInterviewsData`, and renders status cards/table inside a Suspense boundary.
- **NewCandidateRuntimeSection**: Validates optional `positionId`, fetches shared data (positions list), and surfaces defaults to `CandidateNewForm` only after runtime checks complete.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Running `pnpm lint`/`pnpm build` no longer emits `Uncached data was accessed outside of &lt;Suspense&gt;` for any `/dashboard/*` route; the build logs show Suspense streaming instead.
- **SC-002**: Users see the header and skeleton cards on each affected page within 200 ms of navigation, and the runtime content replaces the fallback without additional layout shifts.
- **SC-003**: Cache tags for `positions`, `candidates`, and `interviews` revalidate within the expected `cacheLife` windows after any server action, keeping the cached stats in sync.
- **SC-004**: The README `Cache Components Strategy` section and `docs/CACHE_IMPLEMENTATION.md` now describe the new Suspense boundaries so future contributors know how to add runtime segments safely.
- **SC-005**: Every Suspense fallback in `/dashboard/*` renders with the shared `components/ui/skeleton` primitives, so the loading UI visually matches the component structures it is replacing.

## Assumptions

- `cacheComponents: true` stays enabled so the static shell can leverage cached segments while runtime data streams through Suspense.
- The skeleton fallbacks (`StatsSkeleton`, `FiltersSkeleton`, etc.) will continue to be implemented with `components/ui/skeleton`, matching the shadcn component structure the team already uses.
