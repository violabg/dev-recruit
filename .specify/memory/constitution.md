<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0
- Modified principles: I. Cache-First Server Architecture (expanded to cover runtime data boundaries)
- Added sections: None
- Removed sections: None
- Templates requiring updates: plan-template.md ✅ spec-template.md ✅ tasks-template.md ✅
- Follow-up TODOs: None
-->

# DevRecruit AI Constitution

## Core Principles

### I. Cache-First Server Architecture (NON-NEGOTIABLE)

With `cacheComponents: true` enabled, every route under `app/` renders as a server component whose static shell is prerendered. Prisma queries, Groq AI requests, and other repeated external calls belong inside `'use cache'` scopes defined with explicit `cacheLife(...)` profiles and tagged by `cacheTag` so their results live in cached entries instead of blocking each render. Runtime data (`cookies()`, `headers()`, `searchParams`, `params`) and any non-deterministic work require request context and therefore must be deferred to request time by wrapping the consuming subtree in `<Suspense>` with clear fallbacks (see `app/dashboard/positions/page.tsx`). Server actions must reissue `updateTag` calls for the same caches after mutations so Suspense content stays fresh while the cached shell remains fast. Keeping Suspense boundaries tight around runtime work preserves the static shell, enables streaming, and prevents Next.js from raising the blocking-route error when uncached data escapes outside the fallback.

### II. Safe AI Workflows

AI operations must reuse `lib/services/ai-service.ts` and the prompts, retry/fallback logic, and schema guards defined in `lib/schemas/`. `getOptimalModel` should pick the right Groq model, responses must pass the Zod validation described in `docs/QUIZ_AI_GENERATION_SYSTEM.md`, and every server action invoking AI needs explicit error handling, logging, and fallback paths before persisting outputs to Neon.

### III. Action-Driven Mutations

All mutations run through `lib/actions/*` so `requireUser()` from `lib/auth-server.ts` can enforce Better Auth context and row-level security. Server actions must return structured results, update tags with `cacheTag`/`revalidateTag`, and surface any changes to Prisma through reusable helpers instead of ad-hoc queries.

### IV. Vision Pro UI System

UI work lives in `components/ui/` or the domain folders under `components/`. Every new component honors Tailwind v4 utilities, OKLCH color tokens from `app/globals.css`, and the glassmorphism guidance in `docs/VISION_PRO_STYLE_GUIDE.md`. Forms use `react-hook-form` + Zod resolvers (schemas in `lib/schemas/`), Radix primitives for accessibility, and consistent button/card variants defined by the shared design system.

### V. Documented Workflow Discipline

Development aligns with the documented commands (`pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm storybook`) and rigorous documentation in `README.md`, `docs/QUIZ_AI_GENERATION_SYSTEM.md`, and `docs/CACHE_IMPLEMENTATION.md`. Every architectural decision (caching, AI, authentication, layout) must be captured in the docs before releasing.

## Operational Constraints

- With `cacheComponents` enabled, runtime APIs (`cookies()`, `headers()`, `searchParams`, `params`) must execute inside `<Suspense>` boundaries with fallbacks built from `components/ui/skeleton`; they cannot be mixed into `'use cache'` scopes because they rely on request-time context. Use `'use cache'`, `cacheLife`, and cache tags for repeated data so the static shell stays fast, and call `updateTag` from mutations so cached stats refresh immediately.
- Groq requests must be funneled through `lib/services/ai-service.ts`, validated against Zod, timed/retried, and fail gracefully with descriptive errors before hitting the database.
- Authentication relies on Better Auth (`lib/auth.ts`, `lib/auth-server.ts`, `lib/auth-client.ts`). All server actions mutate data only after `requireUser()` returns a user with appropriate row-level scope.
- Prisma access uses `lib/prisma.ts` and the shared helpers in `lib/actions`, `lib/data`, or domain-specific folders. Keep raw SQL (e.g., `search_interviews`, `get_candidates_for_quiz_assignment`) close to the server action that needs it.
- Styling must reuse `components/ui` primitives whenever possible, follow OKLCH color rules, and respect Vision Pro gradients referenced in `docs/VISION_PRO_STYLE_GUIDE.md`.

## Development Workflow & Review Process

- Start with `pnpm dev` for local work, then `pnpm lint`, `pnpm test`, and `pnpm storybook` before merging. Migrations use `pnpm prisma migrate deploy` (prod) or `pnpm prisma db push` (local).
- Feature planning must reference the constitution, especially before touching caching, AI, or authentication. Document how UI changes fit the Vision Pro tokens and confirm server actions abide by the shared helpers.
- Code reviews must verify cache boundaries, form validation, and AI schemas. Add documentation updates in `docs/` whenever the behavior linked to caching or AI changes.
- Governance expects explicit `cacheLife` choices, Suspense fallback strategies, Zod validation, and test coverage for AI pipelines. If a change introduces new primitives, update `components/ui/` or `docs/VISION_PRO_STYLE_GUIDE.md` accordingly before merging.

## Governance

The constitution governs all architectural and behavioral rules. Any amendment must be recorded in `docs/` and receive explicit agreement from the maintainers. Larger changes must include a migration or rollback plan and mention relevant documentation updates in the PR description.

**Version**: 1.1.0 | **Ratified**: 2025-11-19 | **Last Amended**: 2025-11-19
