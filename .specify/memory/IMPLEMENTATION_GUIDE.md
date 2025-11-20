# DevRecruit AI - Implementation Guide for Constitutional Alignment

**Version:** 1.0  
**Date:** 2025-11-20  
**Purpose:** Step-by-step guide to align the codebase with the DevRecruit AI Constitution

---

## Quick Reference

### The 5 Core Principles (Refresher)

1. **Server Actions Over API Routes** – All mutations via `lib/actions/*`, not `app/api/*`
2. **Entity-Separated Actions & Data** – Organize by entity, not operation type
3. **Cache Components with Tagged Revalidation** – Use `cacheTag`/`updateTag` for cache invalidation
4. **Suspense Boundaries with Skeleton Fallbacks** – No `loading.tsx`, use inline `<Suspense>` + `fallbacks.tsx`
5. **useActionState & useTransition** – Prefer `useActionState` for forms, `useTransition` for interactions

---

## Phase 1: API Routes Migration (URGENT)

**Timeline:** 1-2 days  
**Complexity:** Medium

### Step 1.1: Create Server Action Wrappers (if needed)

The server actions already exist in `lib/actions/quizzes.ts`:

- ✅ `generateNewQuizAction` (exists)
- ✅ `generateNewQuestionAction` (exists)

**Need to create:**

- ❌ `updateQuizAction` – Currently in API route only
- ❌ `saveQuizAction` – Currently in API route only

### Step 1.2: Wrap API Route Logic in Server Actions

**File: `lib/actions/quizzes.ts`**

Add these two new server actions (around line 340):

```typescript
// Update existing quiz
export async function updateQuizAction(
  quizId: string,
  values: {
    title: string;
    timeLimit?: number;
    questions: FlexibleQuestion[];
  }
) {
  "use server";

  try {
    const user = await requireUser();

    // Verify ownership
    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId },
      include: { position: true },
    });

    if (!quiz || quiz.position.createdBy !== user.id) {
      throw new Error("Quiz not found or access denied");
    }

    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title: values.title,
        timeLimit: values.timeLimit,
        questions: values.questions,
        updatedAt: new Date(),
      },
    });

    updateTag("quizzes");
    return { success: true, quiz: updatedQuiz };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update quiz";
    return { success: false, message };
  }
}

// Save new quiz
export async function saveQuizAction(quizData: {
  positionId: string;
  title: string;
  timeLimit?: number;
  questions: FlexibleQuestion[];
}) {
  "use server";

  try {
    const user = await requireUser();

    // Verify position ownership
    const position = await prisma.position.findFirst({
      where: {
        id: quizData.positionId,
        createdBy: user.id,
      },
    });

    if (!position) {
      throw new Error("Position not found or access denied");
    }

    const quiz = await prisma.quiz.create({
      data: {
        title: quizData.title,
        positionId: quizData.positionId,
        timeLimit: quizData.timeLimit,
        questions: quizData.questions,
        createdBy: user.id,
      },
    });

    updateTag("quizzes");
    return { success: true, quizId: quiz.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save quiz";
    return { success: false, message };
  }
}
```

### Step 1.3: Update Client Components (Quiz Editor)

Find all references to these API routes:

```bash
grep -r "api/quiz-edit" --include="*.ts" --include="*.tsx" .
grep -r "api/quiz/save" --include="*.ts" --include="*.tsx" .
```

Update components to call server actions directly instead of via fetch:

**Before:**

```typescript
const response = await fetch("/api/quiz-edit/generate-quiz", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(params),
});
const quiz = await response.json();
```

**After:**

```typescript
import { generateNewQuizAction } from "@/lib/actions/quizzes";

const result = await generateNewQuizAction({
  positionId: params.positionId,
  // ... other params
});

if (!result.questions) {
  throw new Error("Failed to generate quiz");
}
```

### Step 1.4: Delete API Route Files

Once all references updated:

```bash
rm app/api/quiz-edit/generate-quiz/route.ts
rm app/api/quiz-edit/generate-question/route.ts
rm app/api/quiz-edit/update/route.ts
rm app/api/quiz/save/route.ts
rm -rf app/api/quiz-edit/
rm -rf app/api/quiz/
```

### Step 1.5: Test

- [ ] Quiz generation still works from UI
- [ ] Question generation still works from editor
- [ ] Quiz saving persists to database
- [ ] Quiz updates reflect in list immediately (due to updateTag)
- [ ] Error handling shows user-friendly messages

---

## Phase 2: Cache Tag Completion (HIGH PRIORITY)

**Timeline:** Few hours  
**Complexity:** Low

### Step 2.1: Add cacheTag to Quiz Data Functions

**File: `lib/data/quiz-data.ts`**

Example fix (apply to all query functions):

```typescript
// Before
export async function getQuizzes() {
  "use cache";
  cacheLife("hours");

  return prisma.quiz.findMany();
}

// After
export async function getQuizzes() {
  "use cache";
  cacheLife("hours");
  cacheTag("quizzes"); // ← ADD THIS LINE

  return prisma.quiz.findMany();
}
```

**Apply to all functions:**

- `getQuizzes()`
- `getQuizById(id)`
- `getQuestionsByQuizId(quizId)`
- Any other quiz queries

### Step 2.2: Add cacheTag to Candidate Data Functions

**File: `lib/data/candidates.ts`**

```typescript
export async function getCandidatesByPosition(positionId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("candidates"); // ← ADD THIS LINE

  return prisma.candidate.findMany({
    where: { position_id: positionId },
  });
}
```

### Step 2.3: Add cacheTag to Dashboard Data Functions

**File: `lib/data/dashboard.ts`**

```typescript
export async function getPositionsCount() {
  "use cache";
  cacheLife("hours");
  cacheTag("dashboard"); // ← ADD THIS LINE

  return prisma.position.count();
}

export async function getCandidatesCount() {
  "use cache";
  cacheLife("hours");
  cacheTag("dashboard"); // ← ADD THIS LINE

  return prisma.candidate.count();
}

// ... apply to all dashboard queries
```

### Step 2.4: Add updateTag to Candidate Mutations

**File: `lib/actions/candidates.ts`**

```typescript
// Find updateCandidateStatus function
export async function updateCandidateStatus(
  candidateId: string,
  status: string
) {
  const user = await requireUser();

  const candidate = await prisma.candidate.update({
    where: { id: candidateId },
    data: { status },
  });

  updateTag("candidates"); // ← ADD THIS LINE

  return candidate;
}

// Find deleteCandidate function
export async function deleteCandidate(candidateId: string) {
  const user = await requireUser();

  const deleted = await prisma.candidate.delete({
    where: { id: candidateId },
  });

  updateTag("candidates"); // ← ADD THIS LINE

  return deleted;
}
```

### Step 2.5: Verify Quiz Mutations Have updateTag

**File: `lib/actions/quizzes.ts`**

Check all functions that modify quizzes:

```typescript
// After generateNewQuizAction
updateTag("quizzes"); // ✓ Should exist

// After generateNewQuestionAction (if saves to DB)
updateTag("quizzes"); // ✓ Should exist

// After updateQuizAction (new function)
updateTag("quizzes"); // ✓ Will exist

// After saveQuizAction (new function)
updateTag("quizzes"); // ✓ Will exist
```

### Step 2.6: Test

- [ ] Cached queries tagged in Network tab
- [ ] Create position → list updates immediately
- [ ] Update candidate → list updates immediately
- [ ] Delete quiz → dashboard refreshes
- [ ] Dashboard stats revalidate when position changes

---

## Phase 3: Suspense & Fallbacks Conversion (MEDIUM PRIORITY)

**Timeline:** 1-2 days  
**Complexity:** Medium

### Step 3.1: Convert Quiz Edit Page Loading

**File: `app/dashboard/quizzes/[id]/loading.tsx`**

Check current content and move to fallbacks.

**File: `app/dashboard/quizzes/[id]/fallbacks.tsx` (CREATE)**

```typescript
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function QuizEditorSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-6 w-48 mb-3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full mt-2" />
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
```

**File: `app/dashboard/quizzes/[id]/page.tsx`**

Update to use Suspense:

```typescript
import { Suspense } from "react";
import { QuizEditorSkeleton } from "./fallbacks";

export default async function QuizDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<QuizEditorSkeleton />}>
      <QuizEditorContent params={params} />
    </Suspense>
  );
}

async function QuizEditorContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quiz = await getQuizById(id); // Runtime fetch

  return <QuizEditor quiz={quiz} />;
}
```

Delete `loading.tsx`:

```bash
rm app/dashboard/quizzes/[id]/loading.tsx
```

### Step 3.2: Convert Quiz Invite Page

**File: `app/dashboard/quizzes/[id]/invite/fallbacks.tsx` (CREATE)**

```typescript
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function QuizInviteSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64 mt-2" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

**Update `page.tsx` to wrap in Suspense:**

```typescript
import { Suspense } from "react";
import { QuizInviteSkeleton } from "./fallbacks";

export default async function QuizInvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<QuizInviteSkeleton />}>
      <QuizInviteContent params={params} />
    </Suspense>
  );
}
```

Delete `loading.tsx`:

```bash
rm app/dashboard/quizzes/[id]/invite/loading.tsx
```

### Step 3.3: Convert Quiz Edit Edit Page

**File: `app/dashboard/quizzes/[id]/edit/fallbacks.tsx` (CREATE)**

```typescript
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function QuizEditSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Update `page.tsx`:**

```typescript
import { Suspense } from "react";
import { QuizEditSkeleton } from "./fallbacks";

export default async function QuizEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<QuizEditSkeleton />}>
      <QuizEditContent params={params} />
    </Suspense>
  );
}

async function QuizEditContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quiz = await getQuizById(id);
  return <QuizEditForm quiz={quiz} />;
}
```

Delete `loading.tsx` and replace generic fallback:

```bash
rm app/dashboard/quizzes/[id]/edit/loading.tsx
```

### Step 3.4: Convert Interview Page

**File: `app/interview/[token]/fallbacks.tsx` (CREATE)**

```typescript
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function InterviewQuestionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
        <Skeleton className="h-10 w-32 mt-4" />
      </CardContent>
    </Card>
  );
}
```

**Update `page.tsx`:**

```typescript
import { Suspense } from "react";
import { InterviewQuestionSkeleton } from "./fallbacks";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense fallback={<InterviewQuestionSkeleton />}>
      <InterviewContent params={params} />
    </Suspense>
  );
}

async function InterviewContent({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const interview = await getInterviewByToken(token);
  return <InterviewClient interview={interview} />;
}
```

Delete `loading.tsx`:

```bash
rm app/interview/[token]/loading.tsx
```

### Step 3.5: Convert Candidate New Page

**File: `app/dashboard/candidates/new/fallbacks.tsx` (CREATE)**

```typescript
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function CandidateFormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div>
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div>
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </CardContent>
    </Card>
  );
}
```

**Update `page.tsx`:**

```typescript
import { Suspense } from "react";
import { CandidateFormSkeleton } from "./fallbacks";

export default async function NewCandidatePage({
  params,
}: {
  params: Promise<{ positionId?: string }>;
}) {
  return (
    <Suspense fallback={<CandidateFormSkeleton />}>
      <CandidateFormContent params={params} />
    </Suspense>
  );
}

async function CandidateFormContent({
  params,
}: {
  params: Promise<{ positionId?: string }>;
}) {
  const { positionId } = await params;
  const positions = await getPositions();
  return (
    <CandidateNewForm positions={positions} defaultPositionId={positionId} />
  );
}
```

Delete `loading.tsx`:

```bash
rm app/dashboard/candidates/new/loading.tsx
```

### Step 3.6: Convert Position Quiz New Page

**File: `app/dashboard/positions/[id]/quiz/new/fallbacks.tsx` (CREATE)**

```typescript
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function QuizGeneratorSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-40 mt-6" />
      </CardContent>
    </Card>
  );
}
```

**Update `page.tsx`:**

```typescript
import { Suspense } from "react";
import { QuizGeneratorSkeleton } from "./fallbacks";

export default async function NewQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<QuizGeneratorSkeleton />}>
      <QuizGeneratorContent params={params} />
    </Suspense>
  );
}

async function QuizGeneratorContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const position = await getPositionById(id);
  return <QuizGenerator position={position} />;
}
```

Delete `loading.tsx`:

```bash
rm app/dashboard/positions/[id]/quiz/new/loading.tsx
```

### Step 3.7: Fix Generic Text Fallbacks

**File: `app/dashboard/quizzes/[id]/edit/page.tsx`**

Replace:

```typescript
<Suspense fallback={<div>Caricamento...</div>}>
```

With:

```typescript
<Suspense fallback={<QuizEditSkeleton />}>
```

(Import QuizEditSkeleton from fallbacks.tsx)

**File: `app/dashboard/positions/[id]/page.tsx`**

Replace all generic `<div>Loading...</div>` fallbacks:

```typescript
// Before
<Suspense fallback={<div>Loading...</div>}>

// After
<Suspense fallback={<PositionDetailSkeleton />}>
```

Create corresponding skeleton components in `fallbacks.tsx`.

### Step 3.8: Test

- [ ] Each page loads with proper skeleton fallback
- [ ] Content streams in as data loads
- [ ] No blank flashes or layout shift
- [ ] Multiple sections render independently
- [ ] Navigation works smoothly

---

## Phase 4: Form Hook Optimization (OPTIONAL)

**Timeline:** Few hours  
**Complexity:** Low

### Step 4.1: Migrate candidate-new-form.tsx to useActionState

**File: `components/candidates/candidate-new-form.tsx`**

```typescript
// Before
"use client";
import { useState, useTransition } from "react";

const [isPending, startTransition] = useTransition();
const [error, setError] = useState<string | null>(null);

const onSubmit = async (values: CandidateFormData) => {
  setError(null);
  const formData = new FormData();
  formData.append("name", values.name);
  formData.append("email", values.email);
  formData.append("position_id", values.position_id);
  startTransition(async () => {
    try {
      const res = await createCandidate(formData);
      if (res?.candidateId) {
        router.push(`/dashboard/candidates/${res.candidateId}`);
      } else {
        router.push("/dashboard/candidates");
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Errore nella creazione del candidato"
      );
    }
  });
};

// After
"use client";
import { useActionState } from "react";

const initialState = { success: false, message: "", candidateId: null };
const [state, formAction, isPending] = useActionState(
  createCandidate,
  initialState
);

// In JSX
<form action={formAction}>
  <FormField control={form.control} name="name" ... />
  {/* other fields */}
  <Button type="submit" disabled={isPending}>
    {isPending ? "Creazione in corso..." : "Crea candidato"}
  </Button>
  {state.message && (
    <p className={state.success ? "text-green-600" : "text-red-600"}>
      {state.message}
    </p>
  )}
</form>
```

**Update server action to return structured result:**

```typescript
export async function createCandidate(
  prevState: { success: boolean; message: string; candidateId: string | null },
  formData: FormData
) {
  try {
    const user = await requireUser();
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const position_id = formData.get("position_id") as string;

    const candidate = await prisma.candidate.create({
      data: { name, email, position_id, createdBy: user.id },
    });

    updateTag("candidates");

    // Redirect after return
    redirect(`/dashboard/candidates/${candidate.id}`);

    return {
      success: true,
      message: "Candidato creato con successo!",
      candidateId: candidate.id,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore nella creazione del candidato";
    return { success: false, message, candidateId: null };
  }
}
```

### Step 4.2: Similar Updates for Profile Form

**File: `components/profile/profile-form.tsx`**

Apply same pattern.

**File: `components/profile/password-form.tsx`**

Apply same pattern.

### Step 4.3: Test

- [ ] Forms submit without page reload
- [ ] Success message displayed
- [ ] Errors shown inline
- [ ] Pending state disables inputs
- [ ] Redirect works after submission

---

## Testing Checklist

After completing all phases, verify:

### Functional Testing

- [ ] User can create/update/delete positions
- [ ] User can create/update/delete candidates
- [ ] Quiz generation works via server actions
- [ ] Quiz editing works inline
- [ ] Interview flow completes
- [ ] Dashboard stats update in real-time
- [ ] Form submissions handle errors gracefully

### Performance Testing

- [ ] Pages load with skeleton fallbacks
- [ ] Cached content serves immediately
- [ ] Cache invalidation triggers revalidation
- [ ] No layout shifts during hydration
- [ ] Multiple Suspense sections load in parallel

### Code Quality Testing

- [ ] No API routes for mutations
- [ ] All mutations in `lib/actions/<entity>.ts`
- [ ] All queries in `lib/data/<entity>.ts`
- [ ] All queries tagged with `cacheTag`
- [ ] All mutations call `updateTag`
- [ ] All async components wrapped in `<Suspense>`
- [ ] No generic text fallbacks, all use skeleton components
- [ ] All forms use `useActionState` or `useTransition`
- [ ] No TypeScript errors

---

## Quick Reference: Find & Replace Patterns

### Find API route calls in components:

```bash
grep -r "fetch('/api/" --include="*.tsx" --include="*.ts" .
grep -r 'fetch("/api/' --include="*.tsx" --include="*.ts" .
```

### Find missing cacheTag:

```bash
grep -n "cacheLife" lib/data/*.ts | grep -v "cacheTag"
```

### Find missing updateTag:

```bash
grep -n "prisma\\..*\\.create\\|update\\|delete" lib/actions/*.ts | grep -v "updateTag"
```

### Find generic fallbacks:

```bash
grep -r "fallback={<div>" --include="*.tsx" .
grep -r 'fallback={<p>' --include="*.tsx" .
```

### Find form using useTransition for submission:

```bash
grep -A 5 "useTransition" components/**/*.tsx | grep -B 5 "form"
```

---

## FAQ

**Q: Can we keep the API routes for backward compatibility?**
A: Not recommended. Direct server action calls are simpler and more secure. Update all clients to use server actions.

**Q: What if a query doesn't fit the caching profile?**
A: Use `{ stale: 0, revalidate: 0 }` for immediate revalidation, or remove `cacheLife` entirely for dynamic content.

**Q: Should we tag every query?**
A: Yes. Even if revalidation isn't immediate, tagging enables future cache management without code changes.

**Q: Can forms use both useActionState and useTransition?**
A: `useActionState` is preferred for form submissions. Use `useTransition` for non-form interactions (search, filter, navigation).

**Q: What about health check endpoints in API routes?**
A: Remove them. Vercel provides `/api/health` automatically for Next.js deployments.

---

## Next Steps After Phase 4

1. **Document API contracts** – Generate OpenAPI specs for remaining public endpoints
2. **Add error tracking** – Integrate Sentry or similar for production monitoring
3. **Implement rate limiting** – Add Redis-based rate limiting in server actions
4. **Write E2E tests** – Test complete user flows with Playwright
5. **Performance monitoring** – Add Web Vitals tracking and dashboard

---

**Last Updated:** 2025-11-20  
**Maintained by:** DevRecruit AI Team
