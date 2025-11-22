# Copilot Instructions

## Architecture Snapshot

- **App Router + cache components:** every route under `app/` renders as a server component. Keep Prisma/AI calls in `'use cache'` scopes, use `cacheLife`, and wrap any runtime data (`cookies()`, `headers()`, etc.) inside Suspense boundaries (see `app/dashboard/candidates/page.tsx`).
- **Dashboard shell:** `app/dashboard/layout.tsx` wires the sidebar, breadcrumbs, theme toggle, and content surface. Shared navigation and helpers live under `components/dashboard/`.
- **Lib layer:** `lib/actions/` contains server actions for quiz generation, candidate management, and interviews. `lib/services/ai-service.ts` orchestrates Groq AI requests with retries/fallbacks and Zod validation. `lib/prisma.ts` exposes the Neon-backed Prisma client used everywhere.
- **UI/design system:** base primitives in `components/ui/` power buttons, cards, tabs, skeletons, etc. Styling relies on Tailwind v4 utilities, OKLCH tokens in `app/globals.css`, and Vision Pro gradients from `docs/VISION_PRO_STYLE_GUIDE.md`.

## Data & Flow Patterns

- **Server actions + Prisma:** mutate state inside `lib/actions/*`, typically calling `requireUser()` from `lib/auth-server.ts`. Reuse helpers from `lib/data/` when filtering/aggregating dashboard data (e.g., `lib/data/dashboard.ts`).
- **AI prompts:** `AIQuizService` builds prompts, selects models via `getOptimalModel`, validates responses with schemas under `lib/schemas/`, and applies retries/fallbacks. Refer to `docs/QUIZ_AI_GENERATION_SYSTEM.md` for the full flow and error-handling knobs.
- **Dashboard pages:** split UI into Suspense-backed sections that fetch data independently so cached parts stay in the static shell while runtime segments stream separately.

## Workflows & Commands

- Dev server: `pnpm dev` (Next.js MCP enabled).
- Build/lint/test/storybook: `pnpm build`, `pnpm lint`, `pnpm test` (if available), `pnpm storybook`.
- Database migrations: `pnpm prisma migrate deploy` (prod) or `pnpm prisma db push` (local dev).
- Cache updates should use `cacheLife(...)` and tagged scopes (`cacheTag`/`revalidateTag`) as described in `docs/CACHE_IMPLEMENTATION.md`.

## Project-Specific Conventions

- **Styling:** favor Tailwind v4 utilities, gradients, and Vision Pro glass tokens. CSS files must declare colors in OKLCH format (`oklch(...)`). Compose classes with `clsx`, `cn`, or `tailwind-merge` helpers.
- **Forms:** always pair `react-hook-form` with Zod resolvers using schemas from `lib/schemas/`; validate before invoking server actions. Use rhf-input components from `components/` when using forms, create new components there as needed.
- **Data fetching:** keep Prisma queries in server components. Only mark components `use client` when necessary for interactivity, and wrap runtime APIs inside Suspense with skeleton fallbacks.
- **Authentication:** Better Auth config lives in `lib/auth.ts`; prefer `getCurrentUser()`/`requireUser()` helpers to enforce row-level security in server actions and routes.

## Essential References

- `lib/services/ai-service.ts` + `lib/schemas/` – model selection, retries, and Zod guards.
- `app/dashboard/layout.tsx` + `components/dashboard/` – layout, navigation, and theme wiring.
- `prisma/schema.prisma` + `schema.sql` – data model, migrations, and SQL helpers.
- `lib/data/` + `lib/actions/` – shared helpers to reuse instead of duplicating logic.
- `app/globals.css` & `docs/VISION_PRO_STYLE_GUIDE.md` – color tokens, gradients, and animation utilities.

## Handling Requests

1. Inspect the affected route (`layout.tsx`, `page.tsx`, `error.tsx`) before editing.
2. Keep Prisma/AI calls inside `'use cache'` scopes and wrap runtime APIs with Suspense + skeleton fallbacks.
3. Reuse UI primitives from `components/ui` or existing dashboard components before building new ones.
4. Document substantial behavior changes in `docs/` (e.g., caching, AI flows, layout shifts).
5. Follow the constitutional governance in `.specify/memory/constitution.md` for all architectural decisions.

## Cache & Streaming Patterns

### Data Layer Caching

All data queries in `lib/data/` follow this pattern:

# Copilot Instructions (Concise, repo-specific)

## Quick Orientation

- **Repo type:** Next.js App Router (Next 16), server components by default. Heavy use of Prisma (Neon) and AI services under `lib/services`.
- **Primary goal for agents:** Make safe, cached server-side changes (keep AI/DB calls in `"use cache"` scopes), follow Zod schemas in `lib/schemas`, and preserve UI primitives from `components/ui/`.

## Architecture Snapshot (what matters)

- **Routes & rendering:** every page under `app/` is a server component; interactive pieces use `use client` sparingly (see `app/dashboard/layout.tsx`).
- **Cache Components:** code uses `"use cache"`, `cacheLife(...)`, and `cacheTag(...)` patterns (see `lib/data/` and `docs/CACHE_IMPLEMENTATION.md`).
- **Server actions:** mutation logic lives in `lib/actions/*` and is invoked from forms (`"use server"`). Use `requireUser()` from `lib/auth-server.ts` to guard actions (example: `lib/actions/quizzes.ts`).
- **AI layer:** `lib/services/ai-service.ts` (exported `aiQuizService`) builds prompts, applies `sanitizeInput`, retries (`withRetry`), timeouts, model selection (`getOptimalModel`) and validates via Zod schemas. Questions are expected in Italian and strict JSON structure.
- **DB:** `lib/prisma.ts` builds a Prisma client with `PrismaPg` adapter (expects `DATABASE_URL`); Neon/Postgres-backed.

## Project-specific patterns (concrete)

- **AI outputs:** Generated quiz JSON must match the schemas in `lib/schemas` (see `aiQuizGenerationSchema` and `questionSchemas.flexible`). Example enforcement: `aiQuizService.generateQuiz` validates presence of `title` and `questions`.
- **Language rule:** quiz/question text must be in Italian (system prompts in `lib/services/ai-service.ts`).
- **Form-server contract:** `upsertQuizAction(formData)` expects `title`, `questions` (JSON string), optional `time_limit`, and `position_id` for creation — see `lib/actions/quizzes.ts` for exact behavior.
- **Cache invalidation:** after mutations update cache tags (e.g., `updateTag("quizzes")`) and call helper revalidation (`utils/revalidateQuizCache`) to support both Cache Components and legacy paths.
- **Validation:** prefer Zod strict parsing in server actions (see `lib/actions/quizzes.ts` usage of `questionSchemas.strict`).

## Developer workflows & commands (run these)

- **Dev server (MCP enabled):** `pnpm dev` (Next 16 MCP; fast feedback).
- **Build / lint / tests / storybook:** `pnpm build`, `pnpm lint`, `pnpm test` (if present), `pnpm storybook`.
- **DB (local vs prod):** local: `pnpm prisma db push`; prod migrations: `pnpm prisma migrate deploy`.
- **Environment:** ensure `DATABASE_URL` and AI credentials are set in env before running server actions that touch DB/AI.

## Editing guidance (practical rules for agents)

- Inspect the route's `layout.tsx`, `page.tsx`, and `error.tsx` before changing behavior. Example: `app/dashboard/layout.tsx` uses `SidebarProvider` and `Suspense` for `Breadcrumbs`.
- Keep Prisma/AI calls inside `'use cache'` or server actions and wrap runtime APIs (`cookies()`, `headers()`) in Suspense boundaries when used in server components.
- Reuse UI primitives from `components/ui/` and existing dashboard components in `components/dashboard/` — avoid creating new low-level primitives.
- When mutating data: call `updateTag(...)` for cache components and the repo helper `revalidateQuizCache(...)` for legacy revalidation (see `lib/actions/quizzes.ts`).

## Key files to inspect (first stop when editing)

- `lib/services/ai-service.ts` — AI prompt builders, sanitization, retries, model fallbacks.
- `lib/actions/*.ts` — server actions for domain logic (quizzes, positions, interviews).
- `lib/prisma.ts` — Prisma client setup (Neon adapter).
- `lib/schemas/*` — Zod schemas that validate AI and form data.
- `app/globals.css` — OKLCH color tokens and Tailwind utilities (CSS rules are required to use OKLCH values).
- `docs/CACHE_IMPLEMENTATION.md` — caching guidelines and `cacheLife` timings.

## Integrations & external requirements

- AI SDKs: `@ai-sdk/groq`, `@ai-sdk/react`, `ai` — used via `generateObject` and Groq model selection.
- DB: Neon/Postgres via Prisma (`PrismaPg` adapter). `DATABASE_URL` required.
- Auth: `better-auth` / `@better-auth/next-js` and helpers in `lib/auth-server.ts` / `lib/auth.ts`.

If anything in these points is unclear or you want me to expand a section (examples, exact schema fields, or automation steps like a pre-commit lint hook), tell me which part to deepen and I’ll iterate.

## Styling

- All colors must be specified in OKLCH format in css files (e.g., `oklch(0.7 0.1 200)`), but you can use Tailwind defauts colors in the code, lihe `bg-blue-500`, `text-red`.
- Use Tailwind CSS utility classes wherever possible.
- Do not use deprecated or removed Tailwind features from earlier versions.

## General

- Prefer functional React components.
- Use Zod for schema validation.
- Use React Hook Form for form management.
- Use Radix UI components.
- Use Prisma (via `lib/prisma.ts`) for database interactions backed by Neon.
- Use arrow functions for methods and new components.
- Use types over interface# Copilot Instructions

## Project Context

- **Frameworks & Languages:**
  - Next.js (v16.0.3), React (v19.2.0), TypeScript (v5.8.3)
- **Styling:**
  - Tailwind CSS v4.x (use only v4 features and syntax)
- **Core Libraries:**
  - AI: `@ai-sdk/groq`, `@ai-sdk/react`, `ai`
  - Forms: `react-hook-form`, `@hookform/resolvers`
  - UI: `@radix-ui/react-*` (dialog, dropdown-menu, label, popover, select, slot), `lucide-react`, `shadcn/ui`
  - Auth: `better-auth`, `@better-auth/next-js`
  - Database: `@prisma/client`, `@neondatabase/serverless`
  - Utilities: `class-variance-authority`, `clsx`, `next-themes`, `sonner`, `tailwind-merge`, `tw-animate-css`, `zod`

## Styling Guidelines

- **Colors:**
  - In CSS files, specify all colors in OKLCH format (e.g., `oklch(0.7 0.1 200)`).
  - In code, use Tailwind default color classes (e.g., `bg-blue-500`, `text-red`).
- **Utilities:**
  - Use Tailwind CSS utility classes wherever possible.
  - Do **not** use deprecated or removed Tailwind features.
- **Gradients:**
  - Apply border and text gradients for a modern look.
- **Themes:**
  - Support both light and dark themes.
  - Use CSS custom properties (`--var`) for OKLCH colors.
