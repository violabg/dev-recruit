<!--
Sync Impact Report
==================
Version: 1.2.0 (MINOR: New principle added)
dev-recruit Constitution Amendment
Status: Active
Date: 2025-11-22

Principles Added (v1.1.0 → v1.2.0):
  1. Cache Components First
  2. Zod Validation (Non-Negotiable)
  3. Server Actions + Prisma with Auth Guards
  4. Type-Safe AI Integration with Retries & Timeouts
  5. Data Queries in lib/data/ Only
  6. Suspense Fallbacks Using shadcn Skeleton
  7. Prisma Types Over Custom Types
  8. DRY: Avoid Code Duplication
  9. useTransition for Form Pending States (NEW)
  10. Component Reuse Before Creation

Sections Updated:
  - Core Principles: expanded from 9 to 10 principles
  - Handling Changes: no updates needed (already comprehensive)

Templates to Review:
  ✅ .specify/templates/plan-template.md (aligns with new principle)
  ✅ .specify/templates/spec-template.md (aligns with new principle)
  ✅ .specify/templates/tasks-template.md (aligns with new principle)
  ⚠ .github/copilot-instructions.md (reference document, already comprehensive)

Deferred Items: None

Follow-up:
  - Code review checklists should verify useTransition usage in form components
  - PR templates should flag any useState usage for form pending states
-->

# dev-recruit Constitution

## Core Principles

### I. Cache Components First

Every route under `app/` renders as a server component using Next.js App Router Cache Components mode. All Prisma queries and AI service calls MUST be wrapped in `'use cache'` scopes with explicit `cacheLife(...)` directives. Runtime APIs (`cookies()`, `headers()`, etc.) MUST be isolated inside Suspense boundaries with skeleton fallbacks. This ensures maximum cacheability, minimal server load, and safe streaming.

**Rationale**: Cache Components enable static shell pre-rendering while dynamic segments stream independently, improving Time to First Byte (TTFB) and reducing Neon database load under concurrent traffic.

### II. Zod Validation (Non-Negotiable)

All AI-generated quiz outputs and form payloads MUST validate against Zod schemas in `lib/schemas/` BEFORE persisting to Prisma or rendering. AI responses use `aiQuizGenerationSchema` and `questionSchemas` (flexible for creation, strict for final validation). Forms pair `react-hook-form` with Zod resolvers. Invalid data MUST be rejected with clear error messages.

**Rationale**: Zod provides compile-time safety and runtime type guards, preventing malformed AI outputs or user input from corrupting the database or frontend state.

### III. Server Actions + Prisma with Auth Guards

All data mutations live in `lib/actions/` and are marked `"use server"`. Every action MUST call `requireUser()` from `lib/auth-server.ts` before mutating state. Prisma client is centralized in `lib/prisma.ts` (Neon/Postgres with PrismaPg adapter). Cache invalidation after mutations MUST update tags (e.g., `updateTag('quizzes')`) and call `utils/revalidateQuizCache()` when supporting legacy paths.

**Rationale**: Server actions enforce row-level security, ensure authenticated access, and provide a single abstraction layer for tracing and cache invalidation.

### IV. Type-Safe AI Integration with Retries & Timeouts

The `lib/services/ai-service.ts` exports `aiQuizService`, which MUST orchestrate all Groq AI requests using `sanitizeInput`, `withRetry` (configurable backoff), timeouts, and `getOptimalModel` selection. All quiz/question text MUST be generated in Italian per system prompts. AI responses validate via Zod schemas. If a generation fails after retries, responses MUST surface the error to the user with remediation options (retry, cancel, etc.).

**Rationale**: Structured AI integration with retries/timeouts prevents cascading failures, enforces language consistency (Italian), and provides deterministic error handling for reliability.

### V. Data Queries in `lib/data/` Only

All database queries—pagination, filtering, aggregation, and dashboard data fetching—MUST live in `lib/data/`. Queries MUST be wrapped in `'use cache'` scopes with explicit `cacheLife(...)` directives. Server components import and call these queries directly; never invoke Prisma or construct queries inside components. This centralizes data logic, improves cacheability, and enforces a single source of truth for business logic.

**Rationale**: Centralized data layer prevents query duplication, simplifies cache invalidation, and enables consistent error handling and logging.

### VI. Suspense Fallbacks Using shadcn Skeleton

Whenever `<Suspense>` boundaries wrap runtime data fetches, fallback UI MUST use shadcn `<Skeleton>` components (from `components/ui/skeleton.tsx`). Skeleton loading states MUST match the final component layout (same grid, card counts, text line widths). Never render empty placeholders or generic loaders without skeleton structure.

**Rationale**: Skeleton fallbacks reduce Cumulative Layout Shift (CLS), improve perceived performance, and provide a professional loading experience.

### VII. Prisma Types Over Custom Types

Use Prisma-generated types (e.g., `Prisma.User`, `Prisma.Quiz`, etc.) directly in components and server actions whenever possible. Avoid creating custom interface definitions that duplicate Prisma schema fields. Only create custom types for composite views or API contracts that extend Prisma models. This reduces type maintenance burden and keeps types in sync with the database schema.

**Rationale**: Single source of truth for types (Prisma schema) prevents type drift, reduces bugs, and simplifies schema migrations.

### VIII. DRY: Avoid Code Duplication

Reusable logic patterns MUST be extracted into helper functions in `lib/` or utility folders before duplicating across multiple files. Common patterns include:

- Data fetching helpers (in `lib/data/`)
- Form validation logic (in `lib/schemas/`)
- Action workflows (in `lib/actions/`)
- UI component composition (in `components/`)

If the same code appears twice, it MUST be refactored into a shared function before the second occurrence is committed.

**Rationale**: DRY reduces bugs, simplifies maintenance, and improves code clarity. Single source of truth for each behavior ensures consistent behavior across the application.

### IX. useTransition for Form Pending States (Not useState)

All form components MUST use React's `useTransition` hook (from `'react'`) to manage pending states during server action submission. Never use `useState` to track loading/pending state on forms. The `isPending` boolean from `useTransition` provides accurate synchronization with server action execution and automatically disables submit buttons during action completion. This ensures consistent UX and prevents double-submission bugs.

**Rationale**: `useTransition` correctly tracks server action lifecycle; `useState` cannot distinguish between client-side state changes and server-side work, causing stale UI state and potential race conditions.

### X. Component Reuse Before Creation

UI primitives in `components/ui/` and dashboard components in `components/dashboard/` MUST be reused or extended before creating new low-level components. Styling uses Tailwind v4 utilities, OKLCH tokens (`app/globals.css`), and Vision Pro gradients. Forms use `rhf-input` components or extend them as needed. No custom primitives unless justified by design system standards.

**Rationale**: Reuse reduces code bloat, maintains visual consistency, and lowers maintenance burden across routes.

## Development Workflow

- **Dev server**: `pnpm dev` (Next.js MCP enabled for runtime diagnostics and fast feedback).
- **Build, lint**: `pnpm build`, `pnpm lint`.
- **Database**: local iterative schema with `pnpm prisma db push`; production migrations via `pnpm prisma migrate deploy`.
- **Environment**: `DATABASE_URL` and Groq AI credentials MUST be set before running server actions involving DB/AI.

## Handling Changes

Before editing a route or component:

1. Inspect `layout.tsx`, `page.tsx`, and `error.tsx` for current structure.
2. All data queries MUST be in `lib/data/` wrapped in `'use cache'` scopes; never construct Prisma queries in components.
3. For Suspense fallbacks, use shadcn `<Skeleton>` components matching the final layout; never generic loaders.
4. Use Prisma-generated types directly; avoid creating custom types that duplicate Prisma fields.
5. Before duplicating logic, check for existing helpers in `lib/` (data, schemas, actions, components).
6. In form components, use `useTransition` (from React) for pending states during server action submission; never `useState` for loading states.
7. Ensure new server actions call `requireUser()` and update cache tags.
8. Reuse `components/ui/` and `components/dashboard/` primitives; justify any new low-level components.
9. Run `pnpm dev` and use Next.js MCP to catch hydration and runtime errors early.

## Governance

This constitution supersedes all prior practices and guides all architectural decisions. Amendments require:

- Documentation of the principle change in this file.
- Update to CONSTITUTION_VERSION following semantic versioning (MAJOR for backward incompatibilities, MINOR for new principles, PATCH for clarifications).
- Validation that dependent templates (`.specify/templates/`) align with amended principles.
- Commit message summarizing the change.

All PRs must verify compliance with these principles. Complexity introducing exceptions MUST be justified in comments or docs/. Runtime guidance for developers lives in `.github/copilot-instructions.md`; when that conflicts with this constitution, escalate for amendment.

**Version**: 1.2.0 | **Ratified**: 2025-11-22 | **Last Amended**: 2025-11-22
