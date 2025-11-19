# Data Model: Cache Components Sweep

## CandidateDashboardRuntimeSection

- **Purpose**: Wrap the `searchParams`/`params` parsing for `/dashboard/candidates` and stream stats, filters, and the candidate list once runtime values resolve.
- **Fields**:
  - `status: "all" | "active" | "archived"` (default `"all"` when missing, falls back to a safe enum).
  - `positionId: string | null` (optional filter; validated against `positions.id`).
  - `sort: "newest" | "oldest" | "progress"` (default `"newest"`).
  - `view: "table" | "grid"` (default `"table"`).
  - `page: number` (default `1`, coerced to >=1).
  - `pageSize: number` (cached profile, `cacheLife(30, "minutes")`).
  - `cachedStats: CandidateStatsCard[]` (statistics pulled from `lib/data/dashboard.ts`, tagged `cacheTag("candidates")`).
  - `filters: PositionSummary[]` (reuses cached positions via `cacheTag("positions")`).
  - `candidateList: CandidateCard[]` (paginated list read through Prisma, revalidated with the same tag and `revalidateTag`).
- **Relationships**: Ties to `positions` (for filters), `candidates` (list payload), and the `lib/actions/candidates` mutations that emit `updateTag("candidates")`.
- **Validation**: Parser ensures `positionId` exists; if missing or invalid, defaults to `null` without blocking the shell.

## InterviewsRuntimeSection

- **Purpose**: Defer `searchParams` parsing on `/dashboard/interviews` so the status cards render immediate skeletons while runtime content loads.
- **Fields**:
  - `status: "all" | "scheduled" | "completed" | "cancelled"` (default `"all"`).
  - `page: number` (default `1`).
  - `pageSize: number` (default `15`).
  - `interviewerId?: string` (optional runtime filter).
  - `gridCards: InterviewStatusCard[]` (cache-bound, tag `cacheTag("interviews")`).
  - `tableRows: InterviewRow[]` fetched with the same tag and `revalidateTag("interviews")` so actions keep the list fresh.
- **Relationships**: Consumes Prisma raw query helpers from `lib/data/interviews`, matches server actions `lib/actions/interviews` that call `updateTag("interviews")` after mutations.
- **Validation**: Parsing gracefully handles malformed `page`/`status` values by substituting safe defaults (e.g., `status = "all"`, `page = 1`).

## NewCandidateRuntimeSection

- **Purpose**: Validate the optional `positionId` query for `/dashboard/candidates/new` without blocking the rest of the layout.
- **Fields**:
  - `positionId?: string` (optional, validated against `positions.id`).
  - `validPosition?: PositionSummary` (resolved from cached `positions` data).
  - `positionList: PositionSummary[]` (reused from `cacheTag("positions")`).
  - `formDefaults: CandidateFormDefaults` (includes `positionId`, `status`, others derived from runtime data).
- **Validation**: If the runtime `positionId` is missing or stale, the defaults fall back to the most recent open position so the form stays interactive.
- **State Transitions**: The runtime section first resolves `positionList`, then validates `positionId`, and finally streams the `formDefaults` object to `CandidateNewForm`. Each transition is hidden behind `Suspense` with `components/ui/skeleton` fallbacks.

## Cache Tags & Lifetimes

| Tag          | Data Covered           | `cacheLife` Profile        |
| ------------ | ---------------------- | -------------------------- |
| `candidates` | Dashboard stats + list | `cacheLife(15, "minutes")` |
| `positions`  | Filters + dropdowns    | `cacheLife(30, "minutes")` |
| `interviews` | Status cards + tables  | `cacheLife(10, "minutes")` |

All server actions that mutate these domains call `updateTag(tag)` immediately after writing to Neon so Suspense content stays fresh while the static shell remains cached. Each runtime section wraps its fetcher with `<Suspense fallback={<CandidateDashboardSkeleton />}>` (or the equivalent skeleton) so runtime data is isolated from the shell that prerenders under `cacheComponents: true`.
