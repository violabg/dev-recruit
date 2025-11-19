# Implementation Plan: Cache Components Sweep

**Branch**: `001-cache-components-refactor` | **Date**: 2025-11-19 | **Spec**: `/specs/001-cache-components-refactor/spec.md`
**Input**: Feature specification from `/specs/001-cache-components-refactor/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command and mirrors the cache-focused constitution guidance.

## Summary

Refactor the `/dashboard/*` routes so every runtime dependency (`searchParams`, `params`, server actions, filters) stays inside Suspense-bound runtime sections backed by shared skeleton fallbacks, while their repeated data lives inside `'use cache'` scopes with explicit `cacheLife`/`cacheTag` profiles and `updateTag` after mutations. The shell remains fast thanks to Next.js Cache Components, and the README/docs capture the new streaming layout and revalidation steps.

## Technical Context

**Language/Version**: TypeScript 5.8.3 (Next.js 16 + React 19 stack)  
**Primary Dependencies**: Next.js 16 app router, React 19, Tailwind v4, Prisma (Neon Postgres), Better Auth, Radix UI, `@ai-sdk/*` (unused for this feature), `react-hook-form` + Zod  
**Storage**: Neon PostgreSQL via Prisma client  
**Testing**: `pnpm lint`, `pnpm build`, `pnpm test` (when available)  
**Target Platform**: Server-rendered web pages (Next.js App Router)  
**Project Type**: Full-stack web application with shared UI + Prisma backend  
**Performance Goals**: `/dashboard/*` shells display headers/fallback skeletons within ~200 ms of navigation and avoid Next.js `Uncached data` errors  
**Constraints**: Cache components must remain statically rendered; runtime API calls (`searchParams`, `params`, `cookies`, `headers`) are deferred to Suspense fallbacks that use shared skeletons per the constitution; actions update the same cache tags they read  
**Scale/Scope**: Affects all routes under `/dashboard/*` (candidates, interviews, positions, profile sections) while keeping other areas untouched for now

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Plan pins all repeated data to `'use cache'` + `cacheLife`/`cacheTag` scopes and keeps runtime data inside Suspense boundaries with `components/ui/skeleton` fallbacks (Principle I).
- No AI changes are touched; dashboard runtime flows stay within existing UI/data helpers (Principle II).
- Mutations remain inside `lib/actions/*` with `requireUser()` invoked and cache tags revalidated via `updateTag` (Principle III).
- UI updates reuse the shared Vision Pro primitives under `components/ui/` and the relevant dashboard components (Principle IV).
- The constitution is referenced here and in the plan summary so the documentation stays aligned (Principle V).

## Project Structure

### Documentation (this feature)

```text
specs/001-cache-components-refactor/
├── plan.md        # This file (/speckit.plan command output)
├── research.md    # Phase 0 output (/speckit.plan command)
├── data-model.md  # Phase 1 output (/speckit.plan command)
├── quickstart.md  # Phase 1 output (/speckit.plan command)
├── contracts/     # Phase 1 output (/speckit.plan command)
└── tasks.md       # Phase 2 output (future /speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── api/           # existing API routes (auth, quiz, etc.)
├── auth/          # auth pages (login, confirm, etc.)
├── dashboard/     # target area: layouts, fallback, page.tsx per section
│   ├── candidates/
│   ├── interviews/
│   ├── positions/
│   └── profile/
├── globals.css    # OKLCH tokens
├── layout.tsx     # app-wide providers & theme
└── page.tsx       # marketing homepage
components/
├── ui/            # skeletons, buttons, cards, etc.
├── dashboard/     # sidebar, nav, headers, etc.
├── candidates/    # cards, tables, forms reused by dashboard
└── auth/           # forms & buttons
lib/
├── actions/       # server action helpers (candidate, interview, position mutations)
├── data/          # shared query helpers
├── prisma.ts      # Prisma client
└── services/       # AI services (unchanged)
```

**Structure Decision**: Keep the Next.js app router layout with `app/dashboard/*` as the implementation surface, reusing shared UI primitives in `components/` and server helpers in `lib/`. The refactor targets only the dashboard routes so other folders stay untouched.
