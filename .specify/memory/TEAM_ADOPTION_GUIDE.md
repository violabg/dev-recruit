# DevRecruit AI Constitution - Team Adoption Guide

**For the team implementing these principles**

---

## What Is This Constitution?

This is a **governance document** that establishes architectural standards for DevRecruit AI. It's not a suggestion—it's the north star for all code decisions.

**Key principle:** When you're unsure how to implement something, consult the constitution first. It will guide you.

---

## Five Core Principles Explained

### 1️⃣ Server Actions Over API Routes

**In simple terms:** Use Next.js server actions for mutations instead of creating API endpoints.

**Why?**

- **Simpler:** No need to manage HTTP status codes, headers, request parsing
- **Safer:** Automatic CSRF protection from Next.js
- **Faster:** Direct function calls without HTTP round-trips
- **Cleaner:** Co-locate server and client code logic

**When to use API routes:**

- Better Auth integration (auth/[...all]/route.ts) – required by library
- Public webhooks from third parties
- Health check endpoints (if needed for monitoring)

**When NOT to use API routes:**

- ❌ Creating candidates – use server action
- ❌ Updating positions – use server action
- ❌ Generating quizzes – use server action
- ❌ Any mutation in your app – always use server action

---

### 2️⃣ Entity-Separated Actions & Data

**In simple terms:** Organize code by what data type it operates on, not by what operation it does.

**Example structure:**

```
lib/actions/
├── candidates.ts      ← All candidate mutations
├── positions.ts       ← All position mutations
├── quizzes.ts         ← All quiz mutations
└── interviews.ts      ← All interview mutations

lib/data/
├── candidates.ts      ← All candidate queries
├── positions.ts       ← All position queries
├── quizzes.ts         ← All quiz queries
└── interviews.ts      ← All interview queries
```

**Why?**

- **Easier to find code:** "I need to update candidates" → go to `lib/actions/candidates.ts`
- **Prevents duplicates:** All candidate logic in one place
- **Better team coordination:** Multiple people can work on different entities without conflicts
- **Simpler testing:** Test entire entity at once

**How to organize:**

```typescript
// ✅ Good - All candidate operations together
lib/actions/candidates.ts:
  export async function createCandidate() { }
  export async function updateCandidate() { }
  export async function deleteCandidate() { }
  export async function assignCandidateToQuiz() { }

// ❌ Bad - Split by operation type
lib/actions/create/candidates.ts
lib/actions/update/candidates.ts
lib/actions/delete/candidates.ts
```

---

### 3️⃣ Cache Components with Tagged Revalidation

**In simple terms:** Tell the system what data is cached, and when changes happen, tell it to refresh that specific cache.

**Key concepts:**

1. **`cacheTag("entity")`** – Mark data as part of this cache group
2. **`cacheLife(...)`** – How long before data expires
3. **`updateTag("entity")`** – When data changes, refresh this cache

**Example:**

```typescript
// Data query (in lib/data/)
export async function getPositions() {
  "use cache";
  cacheLife("hours"); // Cache for 1 hour
  cacheTag("positions"); // Tag this as "positions" cache
  return prisma.position.findMany();
}

// Mutation (in lib/actions/)
export async function createPosition(data: PositionData) {
  const position = await prisma.position.create({ data });
  updateTag("positions"); // When position created, refresh "positions" cache
  return position;
}
```

**Why?**

- **Performance:** Pages load instantly from cache
- **Consistency:** When data changes, cache automatically updates
- **Control:** You decide when to refresh, not the system

**Common mistake:**

```typescript
// ❌ Bad - No caching
export async function getPositions() {
  return prisma.position.findMany(); // Hits database every time
}

// ✅ Good - With caching
export async function getPositions() {
  "use cache";
  cacheTag("positions");
  return prisma.position.findMany();
}
```

---

### 4️⃣ Suspense Boundaries with Skeleton Fallbacks

**In simple terms:** While data is loading, show a skeleton (loading placeholder) that looks like the final content.

**Instead of:** Entire page loading spinner  
**Show:** Partial content + skeleton for missing pieces

**Example:**

```typescript
// ❌ Old way - entire page blocks
export default function CandidatesPage() {
  // Loading shows nothing until all data loads
  const candidates = await getCandidates();
  return <CandidatesTable candidates={candidates} />;
}

// ✅ New way - show content as it loads
export default function CandidatesPage() {
  return (
    <>
      <h1>Candidates</h1>
      {/* Search bar loads immediately */}
      <SearchBar />

      {/* Table shows skeleton while loading */}
      <Suspense fallback={<CandidatesTableSkeleton />}>
        <CandidatesTable />
      </Suspense>
    </>
  );
}
```

**Why?**

- **Faster perceived performance:** Users see content immediately
- **Better UX:** Skeleton matches final shape, no layout shift
- **Streaming:** Multiple sections load in parallel, not sequentially
- **Professional:** Looks intentional, not broken

**Where to put skeleton components:**

```
app/dashboard/candidates/
├── page.tsx          ← Uses Suspense
├── fallbacks.tsx     ← Defines skeletons (co-located)
└── page.tsx uses: <Suspense fallback={<CandidatesTableSkeleton />}>
```

---

### 5️⃣ useActionState & useTransition

**In simple terms:** Use React hooks to manage form submissions and pending states properly.

**Two scenarios:**

**Scenario 1: Form Submission**

```typescript
// Use useActionState - cleaner, more direct
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
      <input name="name" disabled={isPending} />
      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create"}
      </button>
      {state.message && <p>{state.message}</p>}
    </form>
  );
}
```

**Scenario 2: Non-Form Interaction (Search, Filter, etc.)**

```typescript
// Use useTransition - gives you more control
"use client";
import { useTransition } from "react";
import { searchCandidates } from "@/lib/actions/candidates";

export function CandidateSearch() {
  const [isPending, startTransition] = useTransition();

  const handleSearch = (query: string) => {
    startTransition(async () => {
      const results = await searchCandidates(query);
      // Handle results
    });
  };

  return (
    <input
      onChange={(e) => handleSearch(e.target.value)}
      disabled={isPending}
      placeholder={isPending ? "Searching..." : "Search candidates"}
    />
  );
}
```

**Why?**

- **Built-in pending state:** No need for separate state management
- **Error handling:** Errors automatically surfaced
- **Accessibility:** Proper disabled states for form fields
- **Less boilerplate:** Less code than manual state

---

## Day-in-the-Life Examples

### Scenario 1: Add a New Feature (Candidate Tagging)

**Step 1:** Define the data mutation

```typescript
// lib/actions/candidates.ts
export async function tagCandidate(
  prevState: { success: boolean; message: string },
  formData: FormData
) {
  const user = await requireUser();
  const candidateId = formData.get("candidateId") as string;
  const tag = formData.get("tag") as string;

  // Add tag to candidate
  const updated = await prisma.candidate.update({
    where: { id: candidateId },
    data: { tags: { push: tag } },
  });

  updateTag("candidates"); // ← Refresh candidate cache

  return { success: true, message: "Tag added!" };
}
```

**Step 2:** Create the UI component

```typescript
// components/candidates/tag-form.tsx
"use client";
import { useActionState } from "react";
import { tagCandidate } from "@/lib/actions/candidates";

export function TagForm({ candidateId }: { candidateId: string }) {
  const [state, formAction, isPending] = useActionState(tagCandidate, {
    success: false,
    message: "",
  });

  return (
    <form action={formAction}>
      <input type="hidden" name="candidateId" value={candidateId} />
      <input name="tag" placeholder="Enter tag" disabled={isPending} />
      <button type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add Tag"}
      </button>
      {state.message && <p>{state.message}</p>}
    </form>
  );
}
```

**Done!** The feature now:

- ✅ Uses server action
- ✅ Invalidates candidate cache
- ✅ Has proper form handling
- ✅ Shows pending state
- ✅ Displays errors

---

### Scenario 2: Optimize a Slow Page

**Problem:** Dashboard takes 10 seconds to load

**Solution:**

```typescript
// Before - everything waits
export default async function DashboardPage() {
  const stats = await getStats(); // 8s
  const positions = await getPositions(); // 2s
  return <Dashboard stats={stats} positions={positions} />;
}

// After - load in parallel with caching + suspense
export default async function DashboardPage() {
  return (
    <>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>
      <Suspense fallback={<PositionsSkeleton />}>
        <PositionsSection />
      </Suspense>
    </>
  );
}

async function StatsSection() {
  const stats = await getStats(); // Cached, loads in parallel
  return <Dashboard stats={stats} />;
}

async function PositionsSection() {
  const positions = await getPositions(); // Cached, loads in parallel
  return <PositionsList positions={positions} />;
}
```

**Result:**

- ✅ Both load in parallel (not sequentially)
- ✅ Both cached (instant on repeat visits)
- ✅ Shows skeleton immediately
- ✅ User sees content faster

---

## Common Mistakes (and How to Fix Them)

### Mistake 1: API Route for Mutation

```typescript
// ❌ Wrong
app/api/candidates/create/route.ts:
  export async function POST(req) {
    const data = await req.json();
    const candidate = await prisma.candidate.create({ data });
    return Response.json(candidate);
  }

// ✅ Right
lib/actions/candidates.ts:
  export async function createCandidate(formData: FormData) {
    const candidate = await prisma.candidate.create({ data: ... });
    updateTag("candidates");
    return { success: true, candidateId: candidate.id };
  }
```

### Mistake 2: No Cache Tags

```typescript
// ❌ Wrong
export async function getPositions() {
  "use cache";
  cacheLife("hours");
  // Missing: cacheTag("positions")
  return prisma.position.findMany();
}

// ✅ Right
export async function getPositions() {
  "use cache";
  cacheLife("hours");
  cacheTag("positions"); // ← Added
  return prisma.position.findMany();
}
```

### Mistake 3: No updateTag After Mutation

```typescript
// ❌ Wrong
export async function deletePosition(id: string) {
  await prisma.position.delete({ where: { id } });
  // Missing: updateTag("positions")
  return { success: true };
}

// ✅ Right
export async function deletePosition(id: string) {
  await prisma.position.delete({ where: { id } });
  updateTag("positions"); // ← Added
  return { success: true };
}
```

### Mistake 4: Generic Text Fallbacks

```typescript
// ❌ Wrong
<Suspense fallback={<div>Loading...</div>}>
  <CandidatesTable />
</Suspense>

// ✅ Right
<Suspense fallback={<CandidatesTableSkeleton />}>
  <CandidatesTable />
</Suspense>
```

### Mistake 5: useTransition for Form

```typescript
// ❌ Wrong - too much boilerplate
const [isPending, startTransition] = useTransition();
const [error, setError] = useState("");
const onSubmit = async (e) => {
  e.preventDefault();
  setError("");
  startTransition(async () => {
    try {
      await createCandidate(formData);
    } catch (err) {
      setError(err.message);
    }
  });
};

// ✅ Right - cleaner
const [state, formAction, isPending] = useActionState(createCandidate, {
  success: false,
  message: "",
});

return <form action={formAction}>...</form>;
```

---

## Migration Checklist

When migrating existing code to follow the constitution:

- [ ] **Find all mutations** in your feature
- [ ] **Move to `lib/actions/<entity>.ts`** if not there already
- [ ] **Add `updateTag("entity")` after mutations**
- [ ] **Add `cacheTag("entity")` to queries** in `lib/data/`
- [ ] **Wrap async content in `<Suspense>`** with skeleton fallback
- [ ] **Update forms to use `useActionState`** if applicable
- [ ] **Delete `loading.tsx` files** (use Suspense instead)
- [ ] **Delete API routes** (use server actions instead)
- [ ] **Test:** Does it load faster? Do caches work? Do updates show?

---

## How to Ask for Help

When stuck, check in this order:

1. **`.specify/memory/constitution.md`** – Governance rules
2. **`.specify/memory/QUICK_REFERENCE.md`** – Code templates
3. **`.specify/memory/IMPLEMENTATION_GUIDE.md`** – Step-by-step guides
4. **`docs/CACHE_IMPLEMENTATION.md`** – Caching details
5. **GitHub issues** – Ask the team

---

## What This Means for Your Day-to-Day

### When Writing Code

- ❌ Don't start with "should this be an API route?"  
  ✅ Start with "should this be a server action?"

- ❌ Don't think "I'll handle caching later"  
  ✅ Add `cacheTag` and `updateTag` while coding

- ❌ Don't show generic "Loading..." text  
  ✅ Build skeleton components that match the final UI

- ❌ Don't use useState for form submission  
  ✅ Use `useActionState` from the start

### When Reviewing Code

- Check: "Is this a mutation?" → Should be server action
- Check: "Does it modify data?" → Should have updateTag
- Check: "Does it fetch data?" → Should have cacheTag
- Check: "Is it async?" → Should be wrapped in Suspense
- Check: "Is it a form?" → Should use useActionState

### When Deploying

The constitution ensures:

- ✅ Code is secure (CSRF protection, auth checks)
- ✅ Performance is good (caching, streaming)
- ✅ Users have good UX (skeletons, error messages)
- ✅ Team can maintain it (organized code, clear patterns)

---

## Questions?

**Q: What if I don't follow the constitution?**  
A: PRs will be rejected until they do. The team is committed to maintaining these standards.

**Q: Can we make exceptions?**  
A: Yes, but document it! Create an ADR (Architecture Decision Record) explaining why.

**Q: What if the constitution is wrong?**  
A: Let's discuss it. Changes go through a team review process and get a version bump.

**Q: How do I stay updated?**  
A: Watch `.specify/memory/constitution.md` for changes. It will be updated when principles evolve.

---

## One More Thing

The constitution exists to make your job **easier**, not harder.

- Clear organization → easier to find code
- Cache management → faster pages
- Suspense + skeletons → better UX
- Server actions → simpler mutations
- Form hooks → less boilerplate

When you're tempted to "just do it differently," first ask: "What problem does the constitution solve for me?"

---

**Welcome to DevRecruit AI!**

Together, we'll build a codebase that's fast, secure, maintainable, and a pleasure to work with.

---

**Last Updated:** 2025-11-20  
**Questions?** Ask in the team Slack or create an issue
