# DevRecruit AI - Constitutional Quick Reference

**Keep this handy when working on the codebase.**

---

## The 5 Principles (TL;DR)

| #   | Principle             | Do ✅                                | Don't ❌                   |
| --- | --------------------- | ------------------------------------ | -------------------------- |
| 1   | **Server Actions**    | `lib/actions/<entity>.ts`            | `app/api/` (except auth)   |
| 2   | **Entity Separation** | Organize by entity                   | Organize by operation type |
| 3   | **Cache Tags**        | `cacheTag("entity")` + `updateTag()` | Manual cache busting       |
| 4   | **Suspense**          | `<Suspense fallback={<Skeleton />}>` | `loading.tsx` files        |
| 5   | **Form Hooks**        | `useActionState` for forms           | Manual state management    |

---

## File Organization Template

```
lib/actions/
├── <entity>.ts               # All mutations for entity
│   └── <action>()           # export async function
│
lib/data/
├── <entity>.ts              # All queries for entity
│   └── <query>()            # export async function
│
lib/schemas/
├── <entity>.ts              # Zod schemas for entity
│   └── <schema>Schema        # export const ...Schema
│
components/
├── <entity>/
│   ├── <component>.tsx      # "use client" component
│   └── fallbacks.tsx        # Skeleton fallbacks (co-located)
│
app/
├── <route>/
│   ├── page.tsx            # Server component with Suspense
│   ├── layout.tsx
│   └── fallbacks.tsx       # (if route needs custom fallbacks)
```

---

## Server Action Template

```typescript
"use server";

import { updateTag } from "next/cache";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { entityFormSchema } from "@/lib/schemas";

export async function createEntity(
  prevState: { success: boolean; message: string },
  formData: FormData
) {
  try {
    // 1. Authenticate
    const user = await requireUser();

    // 2. Validate input
    const validatedData = entityFormSchema.safeParse(
      Object.fromEntries(formData)
    );
    if (!validatedData.success) {
      return { success: false, message: "Invalid input" };
    }

    // 3. Mutation
    const entity = await prisma.entity.create({
      data: { ...validatedData.data, createdBy: user.id },
    });

    // 4. Invalidate cache
    updateTag("entities");

    // 5. Return structured result (for useActionState)
    return {
      success: true,
      message: "Entity created successfully",
      entityId: entity.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

---

## Data Query Template

```typescript
import { cacheLife, cacheTag } from "next/cache";
import prisma from "@/lib/prisma";

export async function getEntities() {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 86400 }); // 1h fresh, 24h stale
  cacheTag("entities");

  return prisma.entity.findMany();
}

export async function getEntityById(id: string) {
  "use cache";
  cacheLife({ stale: 1800, revalidate: 43200 });
  cacheTag(`entities-${id}`);

  return prisma.entity.findUnique({ where: { id } });
}
```

---

## Form Component Template

```typescript
"use client";

import { useActionState } from "react";
import { createEntity } from "@/lib/actions/entities";

export function EntityForm() {
  const [state, formAction, isPending] = useActionState(createEntity, {
    success: false,
    message: "",
  });

  return (
    <form action={formAction} className="space-y-4">
      <input
        type="text"
        name="name"
        placeholder="Entity name"
        disabled={isPending}
        required
      />

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
```

---

## Page Component Template

```typescript
import { Suspense } from "react";
import { getEntities } from "@/lib/data/entities";
import { EntitiesSkeleton } from "./fallbacks";

export default async function EntitiesPage() {
  return (
    <div>
      <h1>Entities</h1>
      <Suspense fallback={<EntitiesSkeleton />}>
        <EntitiesList />
      </Suspense>
    </div>
  );
}

async function EntitiesList() {
  const entities = await getEntities(); // Cached query
  return (
    <div>
      {entities.map((entity) => (
        <div key={entity.id}>{entity.name}</div>
      ))}
    </div>
  );
}
```

---

## Skeleton Fallback Template

```typescript
// app/dashboard/entities/fallbacks.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function EntitiesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48 mt-1" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

---

## Cache Tag Naming Convention

```
entities          # All entities
entities-{id}     # Specific entity by ID
dashboard         # Dashboard aggregate queries
positions         # All positions
positions-{id}    # Specific position
candidates        # All candidates
quizzes           # All quizzes
interviews        # All interviews
```

---

## Common Cache Profiles

```typescript
// Fast, frequently changing (real-time)
cacheLife({ stale: 60, revalidate: 300 }); // 1m fresh, 5m stale

// Standard, changing hourly
cacheLife({ stale: 3600, revalidate: 86400 }); // 1h fresh, 24h stale

// Slow, changing daily
cacheLife({ stale: 86400, revalidate: 604800 }); // 1d fresh, 7d stale

// Static, almost never changes
cacheLife({ stale: 604800, revalidate: 2592000 }); // 7d fresh, 30d stale

// Dynamic, always fresh (no caching)
// Don't use 'use cache' at all, wrap in Suspense instead
```

---

## Checklist for Code Review

When reviewing a PR, ask:

- [ ] Does it add a new mutation? Check: `lib/actions/<entity>.ts` + `updateTag()`
- [ ] Does it add a new query? Check: `lib/data/<entity>.ts` + `cacheTag()`
- [ ] Does it add async content to a page? Check: `<Suspense>` + `fallbacks.tsx`
- [ ] Does it have a form? Check: `useActionState` or `useTransition`
- [ ] Does it access runtime data? Check: Inside `<Suspense>` boundary
- [ ] No new API routes? Check: No files in `app/api/` (except auth)
- [ ] No `loading.tsx`? Check: Using Suspense instead

---

## Debugging Checklist

| Issue                  | Check                        | Solution                                       |
| ---------------------- | ---------------------------- | ---------------------------------------------- |
| Data not updating      | updateTag called?            | Add `updateTag("entity")` to mutation          |
| Data loading forever   | Suspense fallback exists?    | Wrap in `<Suspense fallback={...}>`            |
| Cache not invalidating | cacheTag matches?            | Use `cacheTag("entity")` in query              |
| Form not submitting    | useActionState?              | Replace useTransition with useActionState      |
| Page blank on load     | Server action returns value? | Ensure mutation returns `{ success, message }` |
| API route errors       | Using server action?         | Migrate to `lib/actions/`                      |

---

## Git Commit Message Templates

### Server Action

```
feat(candidates): add create candidate server action

- Implement createCandidate in lib/actions/candidates.ts
- Add updateTag("candidates") for cache invalidation
- Return structured result for useActionState
```

### Data Query

```
feat(positions): add cached getPositions query

- Implement getPositions in lib/data/positions.ts
- Add cacheTag("positions") and cacheLife profile
- Reuse in dashboard layout for better performance
```

### UI Component

```
feat(candidates): convert candidates page to suspense

- Move loading.tsx to fallbacks.tsx with skeleton
- Wrap async content in <Suspense boundary>
- Replace generic fallback with proper skeleton component
```

### Migration

```
refactor: migrate quiz API routes to server actions

- Move /api/quiz-edit/generate-quiz to lib/actions
- Update components to call server actions directly
- Delete API route handlers
- Maintain rate limiting and error handling
```

---

## Emergency Rollback Procedures

### If cache breaks:

```bash
# Clear Next.js cache
rm -rf .next
pnpm build

# Check cacheTag/updateTag calls
grep -r "cacheTag" lib/data
grep -r "updateTag" lib/actions
```

### If form submission breaks:

```bash
# Verify server action signature
# Should return { success: boolean; message: string; ... }

# Check useActionState usage
grep -n "useActionState" components/**/*.tsx
```

### If Suspense blocks forever:

```bash
# Check: Is the component inside Suspense boundary?
# Check: Does it access runtime data (cookies, headers)?
# Check: Is database query failing?

# Verify: Try wrapping in try/catch with fallback
```

---

## Key Files to Know

| File                              | Purpose             | Edit When                              |
| --------------------------------- | ------------------- | -------------------------------------- |
| `.specify/memory/constitution.md` | Governance rules    | Major architectural changes            |
| `lib/auth.ts`                     | Better Auth config  | Changing auth providers                |
| `lib/auth-server.ts`              | Server auth helpers | Changing auth flow                     |
| `lib/prisma.ts`                   | Prisma client       | Never (auto-generated)                 |
| `next.config.mjs`                 | Next.js config      | Enabling features like cacheComponents |
| `prisma/schema.prisma`            | Database schema     | Adding/changing data models            |
| `app/globals.css`                 | Design tokens       | Updating colors/themes                 |

---

## Useful Commands

```bash
# Check for constitutional violations
grep -r "app/api" --include="*.ts" --include="*.tsx" lib/  # Should be empty!
grep -r "fetch('/api/" components/  # Migrate to server actions
grep -r "loading\.tsx" app/  # Count loading files
grep -r "cacheTag\|updateTag" lib/  # Find cache usage

# Find incomplete migrations
grep -r "TODO\|FIXME\|XXX" lib/actions lib/data components/

# Check TypeScript errors
pnpm tsc --noEmit

# Run linter
pnpm lint

# Build and test
pnpm build
pnpm dev
```

---

## Resources

- **Constitution:** `.specify/memory/constitution.md`
- **Implementation Guide:** `.specify/memory/IMPLEMENTATION_GUIDE.md`
- **Alignment Report:** `.specify/memory/ALIGNMENT_REPORT.md` (this file)
- **Next.js Docs:** https://nextjs.org/docs
- **Cache Components:** `docs/CACHE_IMPLEMENTATION.md`
- **Vision Pro Design:** `docs/VISION_PRO_STYLE_GUIDE.md`
- **Quiz AI System:** `docs/QUIZ_AI_GENERATION_SYSTEM.md`

---

**Last Updated:** 2025-11-20  
**Version:** 1.0.0
