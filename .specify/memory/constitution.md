<!--
Sync Impact Report
==================
CONSTITUTION_VERSION: 1.0.0 (Initial creation)
RATIFICATION_DATE: 2025-11-20
LAST_AMENDED_DATE: 2025-11-20

Summary:
- Initial constitution establishing 5 core architectural principles for DevRecruit AI
- Defines governance, enforcement mechanisms, and refactoring priorities
- Templates flagged for alignment: spec-template.md, plan-template.md, tasks-template.md

Status: ✅ All core principles established
-->

# DevRecruit AI Constitution

## 📋 Document Information

- **Version:** 1.0.0
- **Ratification Date:** 2025-11-20
- **Last Amended:** 2025-11-20
- **Status:** Active

---

## 🎯 Mission & Values

DevRecruit AI is an intelligent technical recruitment platform powered by Next.js 16, React 19, and Groq AI. This constitution establishes the architectural and engineering standards that ensure the codebase remains:

- **Performant**: Cache-first server architecture with Partial Prerendering
- **Maintainable**: Clear separation of concerns via actions, data, and components
- **Secure**: Server-side validation, Better Auth integration, row-level security
- **User-Centric**: Responsive, accessible, Vision Pro-inspired UI with Tailwind CSS v4

---

## 🏛️ Core Principles

### I. Server Actions Over API Routes (MANDATORY)

**Principle Statement:** All mutations and complex data operations MUST use Next.js server actions in `lib/actions/*` instead of creating new API routes in `app/api/*`. API routes are only acceptable for:

- **Authentication handlers** (Better Auth integration)
- **Public webhooks or integrations** (third-party services)
- **Health checks or monitoring** endpoints

**Rationale:** Server actions are more secure (automatic CSRF protection), simpler to implement, integrate seamlessly with React components, and eliminate the boilerplate of REST handlers. They co-locate request handling with business logic and prevent accidental public exposure of internal operations.

**Implementation:**

- All CRUD operations on `Position`, `Candidate`, `Quiz`, `Interview` models go to `lib/actions/<entity>.ts`
- Form submissions invoke server actions directly via `useActionState` or form `action` prop
- Data fetching queries live in `lib/data/<entity>.ts` for reuse across pages
- API route handlers in `app/api/quiz-edit/*` and `app/api/quiz/*` should be progressively migrated to server actions

**Compliance Check:**

```bash
# Good: Server action for mutation
'use server'
export async function createCandidate(formData: FormData) { ... }

# Avoid: API route for mutation
export async function POST(req: NextRequest) { ... }
```

---

### II. Entity-Separated Actions & Data Folders (MANDATORY)

**Principle Statement:** All server actions MUST be organized by entity in `lib/actions/` and all data queries MUST be organized by entity in `lib/data/`. Each entity owns its actions, data fetches, and schemas.

**Structure:**

```
lib/
├── actions/
│   ├── candidates.ts    # createCandidate, updateCandidate, deleteCandidateAction
│   ├── positions.ts     # createPosition, updatePosition, deletePosition
│   ├── quizzes.ts       # generateQuiz, saveQuiz, updateQuiz
│   ├── interviews.ts    # startInterview, submitAnswers, completeInterview
│   ├── index.ts         # (optional) barrel export for cleaner imports
│   └── auth.ts          # sign up, sign out, password reset (if not delegated to Better Auth)
│
├── data/
│   ├── candidates.ts    # getCandidateById, getCandidatesByPosition, searchCandidates
│   ├── positions.ts     # getAllPositions, getPositionById, getPositionStats
│   ├── quizzes.ts       # getQuizById, getQuizzes, getQuestionsByQuizId
│   ├── interviews.ts    # getInterviewByToken, getInterviewStats, getInterviewsByCandidate
│   ├── dashboard.ts     # getCandidatesCount, getPositionsCount, getRecentPositions
│   └── index.ts         # (optional) barrel export
```

**Rationale:** Organize by entity (not by operation type) so related logic stays together. Makes refactoring, testing, and onboarding easier. Prevents circular dependencies and accidental tight coupling between unrelated features.

**Compliance Check:**

- All mutations for an entity go to one `lib/actions/<entity>.ts` file
- All read-only queries for an entity go to one `lib/data/<entity>.ts` file
- Shared dashboard/analytics queries go to `lib/data/dashboard.ts`
- Cross-entity compositions (like complex filters) stay in the page component or a dedicated helper

---

### III. Cache Components with Tagged Revalidation (MANDATORY)

**Principle Statement:** All pages MUST leverage Next.js 16 Cache Components (Partial Prerendering) enabled via `cacheComponents: true` in `next.config.mjs`. Data queries belonging in the prerendered static shell MUST use `'use cache'` + `cacheLife(...)` and be tagged with `cacheTag()`. All mutations MUST reissue `updateTag()` or `revalidateTag()` to keep cached content in sync.

**Architecture:**

- **Static shell**: Navigation, layout, prerendered metadata, static content
- **Cached content**: Queries inside `'use cache'` with `cacheLife('hours' | 'days' | ...)` – survives builds and requests
- **Suspense boundaries**: Runtime data (`cookies()`, `headers()`, `params`, `searchParams`) wrapped with `<Suspense>` + fallback
- **Revalidation**: After mutations, call `updateTag()` (immediate) or `revalidateTag()` (eventual) to refresh cached entries

**Implementation Pattern:**

```typescript
// lib/data/positions.ts
import { cacheLife, cacheTag } from "next/cache";

export async function getAllPositions() {
  "use cache";
  cacheLife("hours"); // 1h fresh, 24h stale
  cacheTag("positions");

  return prisma.position.findMany();
}

// lib/actions/positions.ts
'use server'
import { updateTag } from "next/cache";

export async function createPosition(values: PositionFormData) {
  const user = await requireUser();
  const position = await prisma.position.create({ ... });

  updateTag("positions"); // Invalidate cached list immediately

  return position;
}

// app/dashboard/positions/page.tsx
import { getAllPositions } from "@/lib/data/positions";

export default async function PositionsPage() {
  return (
    <div>
      <Suspense fallback={<PositionsSkeleton />}>
        <PositionsList />
      </Suspense>
    </div>
  );
}

async function PositionsList() {
  const positions = await getAllPositions(); // Prerendered + cached
  return <div>{positions.map(...)}</div>;
}
```

**Tag Strategy:**

- Use descriptive tags: `positions`, `candidates`, `quizzes`, `interviews`, `dashboard`
- Tag related queries together so a single mutation can invalidate multiple caches
- Use `cacheTag()` at the start of data functions that should be tracked for revalidation

**Compliance Check:**

- All database queries wrapped in `'use cache'` with explicit `cacheLife(...)` profile
- All mutations call `updateTag()` for the affected entity
- Dashboard/analytics queries tagged with both entity tag and `dashboard` tag
- No queries accessing runtime data (cookies, headers) inside `'use cache'` blocks

---

### IV. Suspense Boundaries with Skeleton Fallbacks Over loading.tsx (MANDATORY)

**Principle Statement:** Pages MUST use `<Suspense>` boundaries with fallback UI (skeleton components from `components/ui/skeleton` or custom fallbacks) instead of relying on `loading.tsx` files. Fallbacks MUST stay in the same folder as the component that needs them, co-located for maintainability.

**Rationale:** Inline `<Suspense>` boundaries enable streaming multiple independent sections in parallel, providing partial hydration and better perceived performance. `loading.tsx` files block the entire page; Suspense allows granular control. Skeleton fallbacks ensure loading states visually match the final components (Vision Pro glass morphism aesthetic).

**Implementation Pattern:**

```typescript
// app/dashboard/candidates/fallbacks.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function CandidatesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 mb-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// app/dashboard/candidates/page.tsx
import { Suspense } from "react";
import { CandidatesTableSkeleton } from "./fallbacks";

export default async function CandidatesPage() {
  return (
    <div>
      <h1>Candidates</h1>
      <Suspense fallback={<CandidatesTableSkeleton />}>
        <CandidatesList />
      </Suspense>
    </div>
  );
}

async function CandidatesList() {
  const candidates = await getCandidates(); // Runtime data or dynamic fetch
  return <CandidateTable candidates={candidates} />;
}
```

**File Organization:**

- Page `fallbacks.tsx` in the same route folder: `app/dashboard/candidates/fallbacks.tsx`
- Multiple fallbacks per page allowed: `CandidatesTableSkeleton`, `CandidatesHeaderSkeleton`, etc.
- Share reusable fallback patterns via `components/ui/skeleton.tsx` and custom card skeletons

**Migration Guide for Existing `loading.tsx` Files:**

1. Move fallback UI from `loading.tsx` into a new `fallbacks.tsx` alongside `page.tsx`
2. Wrap dynamic content sections with `<Suspense fallback={<SkeletonComponent />}>`
3. Delete the old `loading.tsx` file
4. Test that sections stream independently (not blocked by slowest section)

**Compliance Check:**

- No `loading.tsx` files in dashboard routes (exceptions: shared layout loading if unavoidable)
- All async data fetches wrapped in `<Suspense>` with a fallback
- Fallback components co-located in `fallbacks.tsx`
- Multiple independent `<Suspense>` sections allowed per page for parallel streaming

---

### V. useActionState & useTransition for Form Handling (RECOMMENDED)

**Principle Statement:** Client components managing form submissions MUST use React's `useActionState` or `useTransition` hook to handle server action invocations, pending states, and error recovery. Forms SHOULD provide optimistic feedback and clear error messages via these hooks.

**Rationale:** These hooks provide built-in pending state, error handling, and seamless integration with server actions. `useActionState` directly binds forms to server actions; `useTransition` offers more control for complex interactions. Both prevent user confusion by showing loading indicators and validation errors inline.

**Implementation Pattern:**

```typescript
// With useActionState (preferred for forms)
"use client";
import { useActionState } from "react";
import { createCandidate } from "@/lib/actions/candidates";

export function CandidateForm() {
  const [state, formAction, isPending] = useActionState(createCandidate, {
    success: false,
    message: "",
  });

  return (
    <form action={formAction}>
      <input name="name" type="text" disabled={isPending} />
      <input name="email" type="email" disabled={isPending} />
      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create"}
      </button>
      {state.message && (
        <p className={state.success ? "text-green-600" : "text-red-600"}>
          {state.message}
        </p>
      )}
    </form>
  );
}

// With useTransition (for more control)
("use client");
import { useTransition } from "react";
import { updateCandidate } from "@/lib/actions/candidates";

export function CandidateEditor({ candidateId }: { candidateId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleSave = async (formData: FormData) => {
    startTransition(async () => {
      await updateCandidate(candidateId, formData);
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave(new FormData(e.target));
      }}
    >
      {/* form fields */}
      <button disabled={isPending}>{isPending ? "Saving..." : "Save"}</button>
    </form>
  );
}
```

**Server Action Contract:**
Server actions used with `useActionState` SHOULD return a structured result object:

```typescript
export async function createCandidate(
  prevState: { success: boolean; message: string },
  formData: FormData
) {
  try {
    const user = await requireUser();
    const candidate = await prisma.candidate.create({
      data: {
        /* ... */
      },
    });
    updateTag("candidates");
    return {
      success: true,
      message: "Candidate created!",
      candidateId: candidate.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "An error occurred",
    };
  }
}
```

**Compliance Check:**

- All form submissions use `useActionState` or `useTransition`
- Server actions return structured results (not just throw/redirect)
- Pending states disable form inputs and show feedback
- Errors are surfaced inline, not via console logs alone

---

## 🔐 Security & Authentication

### Better Auth Integration

- **Location**: `lib/auth.ts` – single source of truth for authentication config
- **Server-side helpers**: `lib/auth-server.ts` exports `getCurrentUser()` and `requireUser()`
- **Client-side helpers**: `lib/auth-client.ts` exposes admin client for client-side auth checks
- **Row-level enforcement**: Every server action calls `requireUser()` to ensure user context

### Database Security

- **Prisma relations**: Enforce user ownership via foreign keys and Prisma queries
- **Better Auth models**: `User`, `Session`, `Account`, `Verification` managed by Better Auth
- **RLS policies**: Defined in `schema.sql` (future: enable Postgres RLS for extra layer)
- **Input validation**: All forms use Zod schemas in `lib/schemas/` before reaching server actions

---

## 📊 Data Flow Architecture

### Query Path (Read-Only)

```
Page Component
  ↓ (awaits)
lib/data/<entity>.ts
  ↓ (contains 'use cache' + cacheTag)
Prisma Client
  ↓
Neon PostgreSQL
```

### Mutation Path (Write Operations)

```
Form / Client Component
  ↓ (useActionState or form action)
lib/actions/<entity>.ts ('use server')
  ↓ (calls requireUser, validates Zod schema)
Prisma Client (transaction recommended)
  ↓
Neon PostgreSQL
  ↓
updateTag() / revalidateTag() → Invalidates cached entries
```

### AI Operations

```
Client requests quiz generation
  ↓
lib/actions/quizzes.ts
  ↓
lib/services/ai-service.ts
  ↓ (retries, fallback models, Zod validation)
Groq API
  ↓ (returns structured Question[])
Validate against quizDataSchema
  ↓
Save to Prisma → Neon
  ↓
updateTag('quizzes') → Refresh cached quizzes lists
```

---

## 🎨 Styling & UI System

### Tailwind CSS v4 & Vision Pro Design

- **Colors**: Use OKLCH format in `app/globals.css`, Tailwind color classes in TSX
- **Glass morphism**: Leverage Vision Pro gradients from `docs/VISION_PRO_STYLE_GUIDE.md`
- **Components**: Reuse primitives from `components/ui/` (Button, Card, Input, Select, Skeleton, etc.)
- **Responsive**: Mobile-first approach with Tailwind breakpoints

### Skeleton & Fallback Components

- **Location**: `components/ui/skeleton.tsx` – base Skeleton component
- **Usage**: Import and compose in `fallbacks.tsx` to match final UI shape
- **Theme**: Skeleton colors respect light/dark theme via CSS variables

---

## 📋 Governance & Enforcement

### Amendment Process

**How to change this constitution:**

1. **Identify the need**: Document the issue or improvement in an ADR (Architecture Decision Record) or discussion
2. **Propose changes**: Create a PR with the amendment, linking to the rationale
3. **Review & consensus**: Team reviews, discusses implications for existing code
4. **Version bump**: Apply semantic versioning:
   - **MAJOR**: Principle removal or incompatible redefinition (rare, requires team alignment)
   - **MINOR**: New principle added or existing principle materially expanded
   - **PATCH**: Clarifications, wording, or non-semantic improvements
5. **Merge & propagate**: Merge PR, update `LAST_AMENDED_DATE`, generate Sync Impact Report
6. **Template updates**: Review `.specify/templates/*.md` to ensure alignment with amended principles

### Compliance Review

**Triggers for review:**

- Before major refactors (> 10 files affected)
- During code review if deviation from principles suspected
- Quarterly architecture sync meetings
- Before shipping to production

**Enforcement:**

- **Pull Request checklist**: Link to constitution principles in PR description
- **Code review**: Flag deviations (e.g., new API route instead of server action)
- **Linting**: Use TypeScript strict mode, ESLint rules to catch common violations
- **Testing**: Ensure server actions return proper shapes, Suspense fallbacks exist

---

## 🚀 Refactoring Roadmap (Priorities)

### Phase 1: Server Actions Migration (URGENT)

**Scope**: Migrate `app/api/quiz/*` and `app/api/quiz-edit/*` to server actions

**Files affected:**

- `app/api/quiz-edit/generate-quiz/route.ts` → `lib/actions/quizzes.ts::generateQuizAction`
- `app/api/quiz-edit/generate-question/route.ts` → `lib/actions/quizzes.ts::generateQuestionAction`
- `app/api/quiz-edit/update/route.ts` → `lib/actions/quizzes.ts::updateQuizAction`
- `app/api/quiz/save/route.ts` → `lib/actions/quizzes.ts::saveQuizAction`

**Acceptance:**

- All mutations accessible via server actions from components
- API route handlers deleted
- Forms updated to use `useActionState`

---

### Phase 2: Data Folder Organization (HIGH)

**Scope**: Ensure all read-only queries organized in `lib/data/<entity>.ts`

**Files to review:**

- `lib/data/candidates.ts` – verify all candidate queries present
- `lib/data/positions.ts` – verify all position queries present
- `lib/data/quizzes.ts` – verify all quiz queries present
- `lib/data/interviews.ts` – verify all interview queries present
- `lib/data/dashboard.ts` – aggregate queries for dashboard stats

**Acceptance:**

- No raw Prisma queries in page components
- All reads go through `lib/data/<entity>`
- Queries tagged with `cacheTag` and `cacheLife`

---

### Phase 3: Suspense & Fallbacks Conversion (MEDIUM)

**Scope**: Replace `loading.tsx` with inline `<Suspense>` + `fallbacks.tsx`

**Routes to refactor:**

- `app/dashboard/candidates/` → use Suspense for table, filters, stats
- `app/dashboard/positions/` → use Suspense for list and creation form
- `app/dashboard/quizzes/` → use Suspense for quiz list
- `app/dashboard/interviews/` → use Suspense for interview stats and list

**Acceptance:**

- No `loading.tsx` files blocking page rendering
- Multiple independent Suspense sections per page
- Fallback UI co-located in `fallbacks.tsx`

---

### Phase 4: Form Hook Modernization (MEDIUM)

**Scope**: Update form components to use `useActionState` and `useTransition`

**Components to refactor:**

- `components/candidates/candidate-new-form.tsx`
- `components/positions/new-position-form.tsx`
- `components/quiz/*-form.tsx` (all quiz editing forms)
- `components/interview/candidate-selection-form.tsx`

**Acceptance:**

- Forms use `useActionState` or `useTransition`
- Pending states managed by hooks, not local state
- Error messages displayed inline via form state

---

### Phase 5: Cache Tag Completion (ONGOING)

**Scope**: Verify all mutations call `updateTag()` or `revalidateTag()`

**Checklist:**

- Position mutations → `updateTag('positions')`
- Candidate mutations → `updateTag('candidates')`
- Quiz mutations → `updateTag('quizzes')`
- Interview mutations → `updateTag('interviews')`
- Dashboard-affecting mutations → `revalidateTag('dashboard')`

---

## 📖 Essential References

### Architecture Docs

- `README.md` – Project overview, features, and structure
- `docs/CACHE_IMPLEMENTATION.md` – Caching strategies and Partial Prerendering details
- `docs/VISION_PRO_STYLE_GUIDE.md` – Design system tokens and components
- `docs/QUIZ_AI_GENERATION_SYSTEM.md` – AI integration flow and error handling

### Key Files

- `lib/auth.ts` – Better Auth configuration
- `lib/auth-server.ts` – Server-side auth helpers
- `lib/actions/*` – Server actions organized by entity
- `lib/data/*` – Cached data queries organized by entity
- `lib/schemas/*` – Zod validation schemas
- `lib/services/ai-service.ts` – Groq AI wrapper with retries/fallbacks
- `components/ui/skeleton.tsx` – Skeleton component for fallbacks
- `app/globals.css` – OKLCH color tokens and theme variables
- `next.config.mjs` – Next.js configuration including `cacheComponents: true`
- `prisma/schema.prisma` – Data model definition

### Commands

- `pnpm dev` – Start dev server (Next.js MCP enabled)
- `pnpm build` – Build for production
- `pnpm lint` – Run ESLint
- `pnpm prisma db push` – Local database migration (dev)
- `pnpm prisma migrate deploy` – Production migration

---

## ✅ Principle Checklist

Use this checklist when reviewing code or PRs:

- [ ] **Server Actions**: Mutations use `lib/actions/<entity>.ts`, not API routes
- [ ] **Data Organization**: Queries in `lib/data/<entity>.ts`, properly tagged with `cacheTag`
- [ ] **Cache Revalidation**: Mutations call `updateTag()` or `revalidateTag()`
- [ ] **Suspense Boundaries**: Runtime data wrapped in `<Suspense>` with fallback
- [ ] **Skeleton Fallbacks**: Fallback UI co-located in `fallbacks.tsx` matching final shape
- [ ] **Form Hooks**: Forms use `useActionState` or `useTransition`, not manual state
- [ ] **Authentication**: Server actions call `requireUser()` for protected operations
- [ ] **Zod Validation**: All inputs validated against schemas before mutation
- [ ] **Error Handling**: Server actions return structured results, not just throw

---

## 📝 Version History

| Version | Date       | Changes                                     |
| ------- | ---------- | ------------------------------------------- |
| 1.0.0   | 2025-11-20 | Initial constitution with 5 core principles |

---

**Last Updated:** 2025-11-20  
**Maintained by:** DevRecruit AI Team  
**Status:** 🟢 Active & Enforced

---

_This constitution serves as the north star for all architectural decisions in DevRecruit AI. When in doubt, refer to these principles._
