# Copilot Instructions

## Architecture Snapshot

- **App Router + cache components:** every route under `app/` renders as a server component. Keep Prisma/AI calls in `'use cache'` scopes, use `cacheLife`, and wrap any runtime data (`cookies()`, `headers()`, etc.) inside Suspense boundaries (see `app/dashboard/candidates/page.tsx`).
- **Dashboard shell:** `app/dashboard/layout.tsx` wires the sidebar, breadcrumbs, theme toggle, and content surface. Shared navigation and helpers live under `components/dashboard/`.
- **Lib layer:** `lib/actions/` contains server actions for quiz generation, candidate management, and interviews. `lib/services/ai-service.ts` orchestrates Groq AI requests with retries/fallbacks and Zod validation. `lib/prisma.ts` exposes the Neon-backed Prisma client used everywhere.
- **UI/design system:** base primitives in `components/ui/` power buttons, cards, tabs, skeletons, etc. Styling relies on Tailwind v4 utilities, OKLCH tokens in `app/globals.css`.

## Data & Flow Patterns

- **Server actions + Prisma:** mutate state inside `lib/actions/*`, typically calling `requireUser()` from `lib/auth-server.ts`. Reuse helpers from `lib/data/` when filtering/aggregating dashboard data (e.g., `lib/data/dashboard.ts`).
- **AI prompts:** `AIQuizService` builds prompts, selects models via `getOptimalModel`, validates responses with schemas under `lib/schemas/`, and applies retries/fallbacks. Refer to `docs/QUIZ_AI_GENERATION_SYSTEM.md` for the full flow and error-handling knobs.
- **Dashboard pages:** split UI into Suspense-backed sections that fetch data independently so cached parts stay in the static shell while runtime segments stream separately.

## Workflows & Commands

- Dev server: `pnpm dev` (Next.js MCP enabled).
- Build/lint/test: `pnpm build`, `pnpm lint`, `pnpm test` (if available).
- Database migrations: `pnpm prisma migrate deploy` (prod) or `pnpm prisma db push` (local dev).
- Cache updates should use `cacheLife(...)` and tagged scopes (`cacheTag`/`revalidateTag`) as described in `docs/CACHE_IMPLEMENTATION.md`.

## Project-Specific Conventions

- **Styling:** favor Tailwind v4 utilities. CSS files must declare colors in OKLCH format (`oklch(...)`). Compose classes with `clsx`, `cn`, or `tailwind-merge` helpers.
- **Forms:** always pair `react-hook-form` with Zod resolvers using schemas from `lib/schemas/`; validate before invoking server actions. Use rhf-input components from `components/` when using forms, create new components there as needed.
- **Data fetching:** keep Prisma queries in server components. Only mark components `use client` when necessary for interactivity, and wrap runtime APIs inside Suspense with skeleton fallbacks.
- **Authentication:** Better Auth config lives in `lib/auth.ts`; prefer `getCurrentUser()`/`requireUser()` helpers to enforce row-level security in server actions and routes.

## Essential References

- `lib/services/ai-service.ts` + `lib/schemas/` – model selection, retries, and Zod guards.
- `app/dashboard/layout.tsx` + `components/dashboard/` – layout, navigation, and theme wiring.
- `prisma/schema.prisma` + `schema.sql` – data model, migrations, and SQL helpers.
- `lib/data/` + `lib/actions/` – shared helpers to reuse instead of duplicating logic.
- `app/globals.css` – color tokens.

## Handling Requests

1. Inspect the affected route (`layout.tsx`, `page.tsx`, `error.tsx`) before editing.
2. Keep Prisma/AI calls inside `'use cache'` scopes and wrap runtime APIs with Suspense + skeleton fallbacks.
3. Reuse UI primitives from `components/ui` or existing dashboard components before building new ones.
4. Document substantial behavior changes in `docs/` (e.g., caching, AI flows, layout shifts).
5. Follow the constitutional governance in `.specify/memory/constitution.md` for all architectural decisions.
6. **Update documentation for architectural changes**: Any major or architectural changes MUST be reflected in the relevant documentation files under `docs/` (see `docs/AI_QUIZ_GENERATION.md`, `docs/CACHE_IMPLEMENTATION.md`, `docs/QUESTION_SCHEMAS.md`).

## Cache & Streaming Patterns

### Data Layer Caching

All data queries in `lib/data/` follow this pattern:

# Copilot Instructions (Concise, repo-specific)

## Quick Orientation

- **Repo type:** Next.js App Router (Next 16), server components by default. Heavy use of Prisma (Neon) and AI services under `lib/services`.
- **Primary goal for agents:** Make safe, cached server-side changes (keep AI/DB calls in `"use cache"` scopes), follow Zod (v4) schemas in `lib/schemas`, and preserve UI primitives from `components/ui/`.

## Architecture Snapshot (what matters)

- **Routes & rendering:** every page under `app/` is a server component; interactive pieces use `use client` sparingly (see `app/dashboard/layout.tsx`).
- **Cache Components:** code uses `"use cache"`, `cacheLife(...)`, and `cacheTag(...)` patterns (see `lib/data/`).
- **Server actions:** mutation logic lives in `lib/actions/*` and is invoked from forms (`"use server"`). Use `requireUser()` from `lib/auth-server.ts` to guard actions (example: `lib/actions/quizzes.ts`).
- **AI layer:** `lib/services/ai-service.ts` (exported `aiQuizService`) builds prompts, applies `sanitizeInput`, retries (`withRetry`), timeouts, model selection (`getOptimalModel`) and validates via Zod schemas. Questions are expected in Italian and strict JSON structure.
- **DB:** `lib/prisma.ts` builds a Prisma client with `PrismaPg` adapter (expects `DATABASE_URL`); Neon/Postgres-backed.

## Project-specific patterns (concrete)

- **AI outputs:** Generated quiz JSON must match the schemas in `lib/schemas` (see `aiQuizGenerationSchema` and `questionSchemas.flexible`). Example enforcement: `aiQuizService.generateQuiz` validates presence of `title` and `questions`.
- **Language rule:** quiz/question text must be in Italian (system prompts in `lib/services/ai-service.ts`).
- **Form-server contract:** `upsertQuizAction(formData)` expects `title`, `questions` (JSON string), optional `timeLimit`, and `positionId` for creation — see `lib/actions/quizzes.ts` for exact behavior.
- **Cache invalidation:** after mutations update cache tags (e.g., `updateTag("quizzes")`) and call helper revalidation (`utils/revalidateQuizCache`) to support both Cache Components and legacy paths.
- **Validation:** prefer Zod strict parsing in server actions (see `lib/actions/quizzes.ts` usage of `questionSchemas.strict`).

## Developer workflows & commands (run these)

- **Dev server (MCP enabled):** `pnpm dev` (Next 16 MCP; fast feedback).
- **Build / lint / tests:** `pnpm build`, `pnpm lint`, `pnpm test` (if present).
- **DB (local vs prod):** local: `pnpm prisma db push`; prod migrations: `pnpm prisma migrate deploy`.
- **Environment:** ensure `DATABASE_URL` and AI credentials are set in env before running server actions that touch DB/AI.

## Editing guidance (practical rules for agents)

- Inspect the route's `layout.tsx`, `page.tsx`, and `error.tsx` before changing behavior. Example: `app/dashboard/layout.tsx` uses `SidebarProvider` and `Suspense` for `Breadcrumbs`.
- Keep Prisma/AI calls inside `'use cache'` or server actions and wrap runtime APIs (`cookies()`, `headers()`) in Suspense boundaries when used in server components.
- Reuse UI primitives from `components/ui/` and existing dashboard components in `components/dashboard/` — avoid creating new low-level primitives.
- When mutating data: call `updateTag(...)` for cache components and the repo helper `revalidateQuizCache(...)` for legacy revalidation (see `lib/actions/quizzes.ts`).

# Copilot instructions — dev-recruit (concise)

This file gives an agent the minimal, actionable knowledge to be productive in this repo.

**Architecture Snapshot**

- **App Router (Next.js App)**: every route under `app/` is a server component by default. Inspect `layout.tsx`, `page.tsx`, and `error.tsx` for the route's surface before editing.
- **Cache Components**: code uses `"use cache"`, `cacheLife(...)`, `cacheTag(...)` and Suspense boundaries. See `docs/CACHE_IMPLEMENTATION.md` and `app/dashboard/candidates/page.tsx` for examples.
- **Server actions & DB**: mutations live in `lib/actions/` (use `"use server"`). Use `requireUser()` from `lib/auth-server.ts` for auth checks. Prisma is centralized in `lib/prisma.ts` (Neon/Postgres).
- **AI layer**: `lib/services/ai-service.ts` (exported as `aiQuizService`) builds prompts, picks models via `getOptimalModel`, retries/fallbacks and validates outputs against Zod schemas in `lib/schemas/`.

**Key Developer Workflows**

- **Run dev**: `pnpm dev` (Next 16 with MCP enabled for fast runtime diagnostics).
- **Build / lint / tests:** `pnpm build`, `pnpm lint`, `pnpm test` (if present).
- **Database**: local iterative schema: `pnpm prisma db push`. Production migrations: `pnpm prisma migrate deploy`.
- **Env**: set `DATABASE_URL` and AI credentials before running server actions that call DB/AI.

**Project-Specific Conventions**

- **Cache-first edits**: Keep Prisma/AI calls inside `'use cache'` or server actions. Wrap runtime APIs (`cookies()`, `headers()`) in Suspense with skeletons for client-visible routes.
- **Zod validation**: AI and form payloads must match schemas in `lib/schemas/`. Example: `aiQuizGenerationSchema` and `questionSchemas` validate `aiQuizService` outputs.
- **AI language rule**: quiz content is generated in Italian — prompts and system messages enforce this in `lib/services/ai-service.ts`.
- **Form contracts**: server action `upsertQuizAction(formData)` expects `title`, `questions` (JSON string), optional `timeLimit`, and `positionId` — see `lib/actions/quizzes.ts`.
- **Cache invalidation**: after mutations update cache tags (e.g., `updateTag('quizzes')`) and call `utils/revalidateQuizCache()` when needed.
- **Styling**: CSS files must use OKLCH color values (see `app/globals.css`). In code, prefer Tailwind v4 utilities and UI primitives in `components/ui/`.

**Files to Inspect First (examples)**

- `app/dashboard/layout.tsx` — dashboard shell, Suspense usage, sidebar wiring.
- `lib/services/ai-service.ts` — prompt construction, model selection, retries.
- `lib/actions/quizzes.ts` — server action contracts and cache invalidation.
- `lib/prisma.ts` — Prisma client and DB conventions.
- `lib/schemas/` — Zod schemas for AI and forms.

**Editing Guidance (practical rules)**

- Always run the dev server (`pnpm dev`) and use Next.js MCP runtime when changing routes or debugging hydration/runtime errors.
- Reuse existing UI primitives in `components/ui/` and `components/dashboard/` instead of creating new low-level components.
- When adding or modifying server actions: validate inputs with Zod, call `requireUser()`, update cache tags, and document the change in `docs/`.
- **Documentation updates are mandatory** for architectural or major changes. Update the relevant docs:
  - `docs/AI_QUIZ_GENERATION.md` — AI service changes, prompt modifications, model updates
  - `docs/CACHE_IMPLEMENTATION.md` — Caching strategy changes, new cache patterns
  - `docs/QUESTION_SCHEMAS.md` — Schema changes, new question types, validation updates
  - `README.md` — New features, setup changes, dependency updates

If a section is unclear or you want examples (exact schema fields, sample prompts, or a pre-commit lint hook), say which area to expand and I will iterate.
