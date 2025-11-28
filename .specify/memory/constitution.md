<!--
Sync Impact Report
==================
Version: 1.4.0 (MINOR: Centralized cache utilities and logging)
dev-recruit Constitution Amendment
Status: Active
Date: 2025-11-27

Principles Updated (v1.3.0 → v1.4.0):
  3. Server Actions + Prisma → added centralized cache utilities requirement
  4. Type-Safe AI Integration → updated to reference modular AI service and logger

Principles List:
  1. Cache Components First
  2. Zod Validation (Non-Negotiable)
  3. Server Actions + Prisma with Auth Guards (Centralized Cache Utils) - UPDATED
  4. Type-Safe AI Integration with Retries & Timeouts (Modular, Logger) - UPDATED
  5. Data Queries in lib/data/ Only
  6. Suspense Fallbacks Using shadcn Skeleton
  7. Prisma Types Over Custom Types
  8. DRY: Avoid Code Duplication
  9. useTransition for Form Pending States
  10. Component Reuse Before Creation

Sections Updated:
  - Principle III: Cache invalidation now requires lib/utils/cache-utils.ts helpers
  - Principle IV: AI service is now modular (lib/services/ai/), requires scoped loggers

Templates to Review:
  ✅ .specify/templates/plan-template.md (aligns with updated principles)
  ✅ .specify/templates/spec-template.md (aligns with updated principles)
  ✅ .specify/templates/tasks-template.md (aligns with updated principles)
  ✅ .github/copilot-instructions.md (updated to reference new utilities)

Deferred Items: None

Follow-up:
  - Ensure all action files use centralized cache helpers (completed)
  - Ensure all services use scoped loggers (completed)
-->

# dev-recruit Constitution

## Core Principles

### I. Cache Components First

Every route under `app/` renders as a server component using Next.js App Router Cache Components mode. All Prisma queries and AI service calls MUST be wrapped in `'use cache'` scopes with explicit `cacheLife(...)` directives. Runtime APIs (`cookies()`, `headers()`, etc.) MUST be isolated inside Suspense boundaries with skeleton fallbacks. This ensures maximum cacheability, minimal server load, and safe streaming.

**Rationale**: Cache Components enable static shell pre-rendering while dynamic segments stream independently, improving Time to First Byte (TTFB) and reducing Neon database load under concurrent traffic.

### II. Zod Validation (Non-Negotiable)

All AI-generated quiz outputs and form payloads MUST validate against Zod schemas in `lib/schemas/` BEFORE persisting to Prisma or rendering. AI responses use `aiQuizGenerationSchema` and `questionSchemas` (flexible for creation, strict for final validation). Forms pair `react-hook-form` with Zod resolvers. Invalid data MUST be rejected with clear error messages.

**Rationale**: Zod provides compile-time safety and runtime type guards, preventing malformed AI outputs or user input from corrupting the database or frontend state.

### III. Server Actions + Prisma with Auth Guards (No Ownership Filtering)

All data mutations live in `lib/actions/` and are marked `"use server"`. Every action MUST call `requireUser()` from `lib/auth-server.ts` to verify the user is authenticated. The `createdBy` field is set on entity creation (required by schema foreign key to User), but queries MUST NOT filter by `createdBy` for access control. This project does not implement entity ownership filtering—all authenticated users can access all entities. Prisma client is centralized in `lib/prisma.ts` (Neon/Postgres with PrismaPg adapter). Cache invalidation after mutations MUST use centralized helpers from `lib/utils/cache-utils.ts` (e.g., `invalidateQuizCache()`, `invalidateCandidateCache()`) instead of direct `updateTag()` calls.

**Data Model**: Questions are reusable entities linked to Quizzes via `QuizQuestion` join table. Evaluations use polymorphic pattern (either `interviewId` for quiz-based or `candidateId`+`positionId` for resume-based). Presets define question generation templates. Candidate resumes stored in Cloudflare R2.

**Rationale**: Single-tenant or shared-access model simplifies data layer queries and improves cache efficiency. The `createdBy` field exists for auditing and future multi-tenancy if needed, but is not used for access control. Centralized cache helpers ensure consistent invalidation patterns.

### IV. Type-Safe AI Integration with Retries & Timeouts

The modular AI service in `lib/services/ai/` (re-exported via `lib/services/ai-service.ts`) MUST orchestrate all Groq AI requests using `sanitizeInput`, `withRetry` (configurable backoff), timeouts, and `getOptimalModel` selection. All quiz/question text MUST be generated in Italian per system prompts. AI responses validate via Zod schemas. If a generation fails after retries, responses MUST surface the error to the user with remediation options (retry, cancel, etc.). Logging MUST use scoped loggers from `lib/services/logger.ts` (`aiLogger`, `storageLogger`, `authLogger`) instead of raw `console.error/warn/log`.

AI capabilities include:

- Quiz and question generation with type-specific prompts
- Interview answer evaluation with structured feedback
- Candidate resume evaluation against position requirements
- Streaming position description generation via `streamPositionDescription`
- Audio transcription via `transcribeAudioAction` using Whisper models

**Rationale**: Structured AI integration with retries/timeouts prevents cascading failures, enforces language consistency (Italian), and provides deterministic error handling for reliability. Multiple AI use cases share common infrastructure for consistency.

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

UI primitives in `components/ui/` and dashboard components in `components/dashboard/` MUST be reused or extended before creating new low-level components. Styling uses Tailwind v4 utilities, OKLCH tokens (`app/globals.css`). Forms use `rhf-input` components or extend them as needed. No custom primitives unless justified by design system standards.

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
10. **Update documentation for all architectural or major changes**. Documentation files MUST be updated when changing:
    - AI service logic, prompts, or model selection → `docs/AI_QUIZ_GENERATION.md`
    - Caching strategies or patterns → `docs/CACHE_IMPLEMENTATION.md`
    - Question schemas or validation logic → `docs/QUESTION_SCHEMAS.md`
    - Core features, setup, or dependencies → `README.md`

## Governance

This constitution supersedes all prior practices and guides all architectural decisions. Amendments require:

- Documentation of the principle change in this file.
- Update to CONSTITUTION_VERSION following semantic versioning (MAJOR for backward incompatibilities, MINOR for new principles, PATCH for clarifications).
- Validation that dependent templates (`.specify/templates/`) align with amended principles.
- Commit message summarizing the change.
- **Update relevant documentation in `docs/`** when principles affect documented systems (AI generation, caching, schemas).

All PRs must verify compliance with these principles. Complexity introducing exceptions MUST be justified in comments or docs/. Runtime guidance for developers lives in `.github/copilot-instructions.md`; when that conflicts with this constitution, escalate for amendment.

### Documentation Requirements

Architectural or major changes MUST be reflected in the project documentation:

| Change Type                                | Documentation File                |
| ------------------------------------------ | --------------------------------- |
| AI service, prompts, models, evaluations   | `docs/AI_QUIZ_GENERATION.md`      |
| Caching strategies, patterns, tags         | `docs/CACHE_IMPLEMENTATION.md`    |
| Question schemas, Question entity, presets | `docs/QUESTION_SCHEMAS.md`        |
| Features, setup, dependencies, data model  | `README.md`                       |
| Development workflow, new entities         | `.github/copilot-instructions.md` |
| Core principles, governance                | `.specify/memory/constitution.md` |

Documentation updates are considered part of the implementation and MUST be completed before a change is considered done.

**Version**: 1.4.0 | **Ratified**: 2025-11-22 | **Last Amended**: 2025-11-27
