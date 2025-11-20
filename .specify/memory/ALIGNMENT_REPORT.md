# DevRecruit AI - Constitutional Alignment Report

**Generated:** 2025-11-20  
**Constitution Version:** 1.0.0  
**Status:** Comprehensive Codebase Audit Complete

---

## Executive Summary

DevRecruit AI has **good foundational alignment** with the newly established constitution. The codebase demonstrates:

✅ **Strong areas:**

- Server actions properly organized and used for mutations
- Cache components with `cacheTag`/`updateTag` in place
- Suspense boundaries implemented across dashboard
- Form hooks (`useTransition`, `useActionState`) being used

⚠️ **Areas requiring attention:**

- 6 `loading.tsx` files should be migrated to inline Suspense
- Some form components using `useTransition` instead of `useActionState` for better DX
- API routes (`app/api/quiz/*` and `app/api/quiz-edit/*`) should be migrated to server actions
- Some fallback components using generic fallbacks instead of proper skeleton components
- Minor cache tag coverage gaps in quiz and candidate mutations

---

## 1. Server Actions vs API Routes Analysis

### Current State: ✅ MOSTLY COMPLIANT

**Server Actions Status:**

- ✅ `lib/actions/candidates.ts` – Properly organized
- ✅ `lib/actions/positions.ts` – Properly organized
- ✅ `lib/actions/quizzes.ts` – Properly organized
- ✅ `lib/actions/interviews.ts` – Properly organized
- ✅ `lib/actions/evaluations.ts` – Properly organized
- ✅ `lib/actions/profile.ts` – Properly organized
- ✅ `lib/actions/candidate-quiz-assignment.ts` – Properly organized

**API Routes Status:**

- ⚠️ `/app/api/auth/[...all]/route.ts` – **KEEP** (Better Auth integration, required)
- ⚠️ `/app/api/quiz-edit/generate-quiz/route.ts` – **MIGRATE** to server action
- ⚠️ `/app/api/quiz-edit/generate-question/route.ts` – **MIGRATE** to server action
- ⚠️ `/app/api/quiz-edit/update/route.ts` – **MIGRATE** to server action
- ⚠️ `/app/api/quiz/save/route.ts` – **MIGRATE** to server action

### Migration Path (Phase 1 - URGENT)

**Current Architecture (API Routes):**

```
quiz-edit/generate-quiz/route.ts
├── withValidation middleware
├── Rate limiting: 5 req/min
├── Calls: generateNewQuizAction (lib/actions/quizzes.ts)
└── Returns: { questions: Question[] }

quiz-edit/generate-question/route.ts
├── withValidation middleware
├── Rate limiting: 10 req/min
├── Calls: generateNewQuestionAction (lib/actions/quizzes.ts)
└── Returns: Question

quiz-edit/update/route.ts
├── Updates quiz in Prisma
└── Returns: Quiz

quiz/save/route.ts
├── Saves quiz to Prisma
└── Returns: { quizId: string }
```

**Target Architecture (Server Actions):**

```
lib/actions/quizzes.ts
├── generateAndSaveQuizAction (replaces quiz/save/route.ts)
├── generateNewQuizAction (already exists, used by route handlers)
├── generateNewQuestionAction (already exists, used by route handlers)
├── updateQuizAction (replaces quiz-edit/update/route.ts)
├── Rate limiting via SWR or Redis (not middleware)
└── All existing error handling preserved
```

**Components using quiz API routes:**

```tsx
// Current (via API fetch)
const response = await fetch('/api/quiz-edit/generate-quiz', {
  method: 'POST',
  body: JSON.stringify({...})
});

// Target (via server action)
const quiz = await generateNewQuizAction({...});
```

**Recommendation:** Migrate quiz API routes to server actions in Phase 1. The server actions already exist; just update components to call them directly instead of via HTTP.

---

## 2. Entity-Separated Actions & Data Organization

### Current State: ✅ FULLY COMPLIANT

**lib/actions Structure:**

```
lib/actions/
├── candidates.ts ...................... createCandidate, updateCandidateStatus, deleteCandidate
├── positions.ts ....................... createPosition, updatePosition, deletePosition
├── quizzes.ts ......................... generateNewQuizAction, generateNewQuestionAction, updateQuizAction
├── interviews.ts ...................... startInterview, submitAnswers, completeInterview, getInterviewByToken
├── evaluations.ts ..................... (present)
├── profile.ts ......................... (present)
└── candidate-quiz-assignment.ts ....... (present)
```

**lib/data Structure:**

```
lib/data/
├── candidates.ts ...................... getCandidatesCount, getCandidatesByPosition
├── positions.ts ....................... getAllPositions, getPositionById, getPositionStats
├── quiz-data.ts ....................... getQuizzes, getQuizById, getQuestionsByQuizId
├── interview-data.ts .................. getInterviewByToken, getInterviewStats
└── dashboard.ts ....................... getCandidatesCount, getPositionsCount, getRecentPositions
```

**Assessment:** Entity separation is proper and well-organized. No changes needed.

---

## 3. Cache Components with Tagged Revalidation

### Current State: ⚠️ PARTIALLY COMPLIANT

**Tagged Data Functions:**

```
lib/data/positions.ts:
  ✅ getAllPositions() - cacheTag("positions") + cacheLife
  ✅ getPositionById(id) - cacheTag(`positions-${id}`) + cacheLife

lib/data/quiz-data.ts:
  ⚠️ Missing cacheTag for quiz queries

lib/data/candidates.ts:
  ⚠️ Missing cacheTag for candidate queries

lib/data/interview-data.ts:
  ✅ Present and properly tagged
```

**Cache Invalidation in Mutations:**

```
lib/actions/positions.ts:
  ✅ createPosition() - updateTag("positions")
  ✅ updatePosition() - updateTag("positions"), updateTag(`positions-${id}`)
  ✅ deletePosition() - updateTag("positions"), updateTag(`positions-${id}`)

lib/actions/candidates.ts:
  ✅ createCandidate() - updateTag("candidates")
  ⚠️ No updateTag after updateCandidateStatus
  ⚠️ No updateTag after deleteCandidate

lib/actions/quizzes.ts:
  ✅ generateNewQuizAction() - updateTag("quizzes")
  ✅ updateQuizAction() - updateTag("quizzes")
  ⚠️ Missing updateTag in other quiz mutations

lib/actions/interviews.ts:
  ✅ startInterview() - updateTag("interviews")
  ✅ completeInterview() - updateTag("interviews")
  ✅ Properly implemented throughout
```

### Cache Tag Coverage Issues

**Missing `cacheTag()` in data functions:**

1. `lib/data/quiz-data.ts` – Add `cacheTag("quizzes")` to all query functions
2. `lib/data/candidates.ts` – Add `cacheTag("candidates")` to getCandidatesByPosition and related
3. `lib/data/dashboard.ts` – Add `cacheTag("dashboard")` for reuse across pages

**Missing `updateTag()` in mutations:**

1. `lib/actions/candidates.ts::updateCandidateStatus()` – Add `updateTag("candidates")`
2. `lib/actions/candidates.ts::deleteCandidate()` – Add `updateTag("candidates")`
3. `lib/actions/quizzes.ts::saveQuizAction()` (if exists) – Add `updateTag("quizzes")`

### Recommendations

**Priority 1 (Critical):**

```typescript
// lib/data/quiz-data.ts - Add cacheTag to all functions
export async function getQuizzes() {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 86400 });
  cacheTag("quizzes"); // ← ADD THIS
  return prisma.quiz.findMany();
}

// lib/data/candidates.ts - Add cacheTag to all functions
export async function getCandidatesByPosition(positionId: string) {
  "use cache";
  cacheLife({ stale: 1800, revalidate: 43200 });
  cacheTag("candidates"); // ← ADD THIS
  return prisma.candidate.findMany({ where: { position_id: positionId } });
}
```

**Priority 2 (High):**

```typescript
// lib/actions/candidates.ts - Add missing updateTag
export async function updateCandidateStatus(candidateId: string, status: string) {
  const user = await requireUser();
  const candidate = await prisma.candidate.update({...});
  updateTag("candidates"); // ← ADD THIS
  return candidate;
}

export async function deleteCandidate(candidateId: string) {
  const user = await requireUser();
  await prisma.candidate.delete({...});
  updateTag("candidates"); // ← ADD THIS
}
```

---

## 4. Suspense Boundaries with Skeleton Fallbacks

### Current State: ⚠️ MOSTLY COMPLIANT

**Good implementations:**

- ✅ `app/dashboard/candidates/page.tsx` – Suspense with `<CandidatesRuntimeFallback />`
- ✅ `app/dashboard/interviews/page.tsx` – Suspense with `<InterviewsSkeleton />`
- ✅ `app/dashboard/quizzes/page.tsx` – Multiple Suspense sections with skeletons
- ✅ `app/dashboard/page.tsx` – Dashboard stats with `<DashboardStatsSkeleton />`
- ✅ `app/dashboard/candidates/runtime-section.tsx` – Three Suspense boundaries
- ✅ `app/dashboard/positions/page.tsx` – Suspense with `<PositionsSkeleton />`

**Issues to address:**

#### Issue 1: Six `loading.tsx` Files Should Be Converted

```
❌ app/dashboard/quizzes/[id]/loading.tsx
❌ app/dashboard/quizzes/[id]/invite/loading.tsx
❌ app/dashboard/quizzes/[id]/edit/loading.tsx
❌ app/interview/[token]/loading.tsx
❌ app/dashboard/candidates/new/loading.tsx
❌ app/dashboard/positions/[id]/quiz/new/loading.tsx
```

**Migration example:**

```typescript
// Before: app/dashboard/candidates/new/loading.tsx
export default function Loading() {
  return <div>Loading...</div>;
}

// After: Delete loading.tsx and update page.tsx
// app/dashboard/candidates/new/fallbacks.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function CandidateFormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-24" />
      </CardContent>
    </Card>
  );
}

// app/dashboard/candidates/new/page.tsx
import { Suspense } from "react";
import { CandidateFormSkeleton } from "./fallbacks";

export default function NewCandidatePage() {
  return (
    <Suspense fallback={<CandidateFormSkeleton />}>
      <CandidateFormContent />
    </Suspense>
  );
}

async function CandidateFormContent() {
  const positions = await getPositions(); // Runtime data fetch
  return <CandidateNewForm positions={positions} />;
}
```

#### Issue 2: Generic Text Fallbacks Should Use Skeletons

```
⚠️ app/dashboard/quizzes/[id]/edit/page.tsx line 19:
   <Suspense fallback={<div>Caricamento...</div>}>

⚠️ app/dashboard/positions/[id]/page.tsx line 30:
   <Suspense fallback={<div>Loading...</div>}>

⚠️ app/dashboard/positions/[id]/page.tsx line 140:
   <Suspense fallback={<div>Loading...</div>}>

⚠️ app/dashboard/positions/[id]/page.tsx line 146:
   <Suspense fallback={<div>Loading...</div>}>
```

**Fix example:**

```typescript
// Before
<Suspense fallback={<div>Loading...</div>}>
  <PositionDetails />
</Suspense>

// After
<Suspense fallback={<PositionDetailsSkeleton />}>
  <PositionDetails />
</Suspense>
```

#### Issue 3: Fallback Components Organization

**Current:** Some fallbacks inline, some in separate files  
**Target:** All fallbacks in `fallbacks.tsx` co-located with page

**Files needing fallbacks.tsx creation:**

- `app/dashboard/quizzes/[id]/fallbacks.tsx` (extract from loading.tsx)
- `app/dashboard/quizzes/[id]/edit/fallbacks.tsx` (create new)
- `app/dashboard/quizzes/[id]/invite/fallbacks.tsx` (create new)
- `app/interview/[token]/fallbacks.tsx` (create new)
- `app/dashboard/candidates/new/fallbacks.tsx` (create new)
- `app/dashboard/positions/[id]/quiz/new/fallbacks.tsx` (create new)

---

## 5. useActionState & useTransition Hook Usage

### Current State: ✅ WELL IMPLEMENTED

**useActionState (correct for form submission):**

- ✅ `components/quiz/quiz-selection-form.tsx` – Proper form binding
- ✅ `components/interview/candidate-selection-form.tsx` – Proper form binding

**useTransition (acceptable for client interactions):**

- ✅ `components/candidates/candidate-new-form.tsx` – Form submission
- ✅ `components/candidates/search-and-filter-candidates.tsx` – Search/filter
- ✅ `components/interviews/search-and-filter-interviews.tsx` – Search/filter
- ✅ `components/positions/search-positions.tsx` – Search/filter
- ✅ `components/quiz/search-and-filter-quizzes.tsx` – Search/filter
- ✅ `components/profile/profile-form.tsx` – Profile update
- ✅ `components/profile/password-form.tsx` – Password change
- ✅ `components/dashboard/nav-main.tsx` – Navigation

### Opportunity for Improvement

**Components that could benefit from useActionState:**

1. **`components/candidates/candidate-new-form.tsx`** (Line 25)

   - Currently uses: `useTransition` + manual state
   - Should use: `useActionState` with form action binding
   - Benefit: Simpler code, built-in form handling

   ```typescript
   // Current
   const [isPending, startTransition] = useTransition();
   const onSubmit = async (values: CandidateFormData) => {
     startTransition(async () => {
       const res = await createCandidate(formData);
       // ...
     });
   };

   // Target
   const [state, formAction, isPending] = useActionState(createCandidate, {
     success: false,
     message: "",
     candidateId: null,
   });

   // In JSX: <form action={formAction}>
   ```

2. **`components/profile/profile-form.tsx`** (Line 25)

   - Currently uses: `useTransition`
   - Could use: `useActionState` for profile update action

3. **`components/profile/password-form.tsx`** (Line 25)
   - Currently uses: `useTransition`
   - Could use: `useActionState` for password change action

### Recommendation

The current implementation is **solid and compliant**. The use of `useTransition` for search/filter interactions is appropriate since they're not traditional form submissions. The code quality is high.

**Optional improvements:**

- Migrate `candidate-new-form.tsx` to use `useActionState` for consistency
- Ensure all server actions return `{ success: boolean; message: string; ... }` structure for consistency with `useActionState`

---

## Summary of Required Changes

### Phase 1 - API Routes Migration (URGENT)

**Scope:** Migrate quiz API routes to server actions

**Files to modify:**

1. Migrate `app/api/quiz-edit/generate-quiz/route.ts` consumers
2. Migrate `app/api/quiz-edit/generate-question/route.ts` consumers
3. Migrate `app/api/quiz-edit/update/route.ts` consumers
4. Migrate `app/api/quiz/save/route.ts` consumers
5. Delete API route files (keep the server actions that back them)

**Effort:** Medium (1-2 days)

---

### Phase 2 - Cache Tag Completion (HIGH PRIORITY)

**Scope:** Add missing cacheTag calls and updateTag calls

**Files to modify:**

1. `lib/data/quiz-data.ts` – Add `cacheTag("quizzes")` to all queries
2. `lib/data/candidates.ts` – Add `cacheTag("candidates")` to all queries
3. `lib/data/dashboard.ts` – Add `cacheTag("dashboard")` to dashboard queries
4. `lib/actions/candidates.ts` – Add `updateTag("candidates")` to update/delete functions
5. `lib/actions/quizzes.ts` – Verify all mutations have `updateTag("quizzes")`

**Effort:** Low (few hours)

---

### Phase 3 - Suspense & Fallbacks Conversion (MEDIUM PRIORITY)

**Scope:** Convert loading.tsx files to inline Suspense with fallbacks.tsx

**Files to modify:**

1. Create `app/dashboard/quizzes/[id]/fallbacks.tsx`
2. Create `app/dashboard/quizzes/[id]/invite/fallbacks.tsx`
3. Create `app/dashboard/quizzes/[id]/edit/fallbacks.tsx`
4. Create `app/interview/[token]/fallbacks.tsx`
5. Create `app/dashboard/candidates/new/fallbacks.tsx`
6. Create `app/dashboard/positions/[id]/quiz/new/fallbacks.tsx`
7. Update corresponding page.tsx files to use Suspense
8. Delete loading.tsx files
9. Replace generic text fallbacks with skeleton components

**Effort:** Medium (1-2 days)

---

### Phase 4 - Form Hook Optimization (OPTIONAL)

**Scope:** Migrate useTransition form submissions to useActionState

**Files to consider:**

1. `components/candidates/candidate-new-form.tsx`
2. `components/profile/profile-form.tsx`
3. `components/profile/password-form.tsx`

**Effort:** Low (few hours)

---

## Compliance Checklist for PR Review

When reviewing PRs against this constitution, use this checklist:

- [ ] **Server Actions**: New mutations use `lib/actions/<entity>.ts`, not `app/api/*`
- [ ] **Data Organization**: New queries use `lib/data/<entity>.ts`
- [ ] **Cache Tags**: Query functions have `cacheTag("entity-name")` and `cacheLife(...)`
- [ ] **Cache Invalidation**: Mutations call `updateTag("entity-name")` on success
- [ ] **Suspense**: Async components wrapped in `<Suspense>` with fallback
- [ ] **Fallbacks**: Fallback components in `fallbacks.tsx`, not generic text
- [ ] **Forms**: Form submissions use `useActionState` or `useTransition`
- [ ] **Auth**: Protected actions call `requireUser()` first
- [ ] **Validation**: Input validated with Zod schema before mutation
- [ ] **Error Handling**: Server actions return structured results `{ success, message, ... }`

---

## Next Steps

1. **Review this report** with the team
2. **Execute Phase 1** (API routes migration)
3. **Execute Phase 2** (cache tag completion)
4. **Execute Phase 3** (Suspense conversion)
5. **Document any deviations** to constitution in ADRs if exceptions needed
6. **Update constitution** if principles need refinement based on real-world usage

---

**Report Generated:** 2025-11-20  
**Constitution Version:** 1.0.0  
**Next Review:** After Phase 3 completion (estimated 2 weeks)
