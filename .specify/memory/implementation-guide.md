# Constitution Implementation Guide

**Constitution Version**: 1.2.0  
**Date**: 2025-11-22  
**Target**: 100% Compliance

---

## Overview

This guide provides concrete steps to implement the 10 constitutional principles across dev-recruit. Current compliance: **79%**. Target: **100%**.

---

## Issues & Fixes

### ISSUE 1: Auth Forms Using `useState` for Pending States

**Principle**: IX. useTransition for Form Pending States  
**Severity**: HIGH (Race condition bugs)  
**Files Affected**: 4 components

#### Root Cause

Auth forms (`LoginForm`, `SignUpForm`, `UpdatePasswordForm`, `ForgotPasswordForm`) track pending state with `useState` instead of `useTransition`. This cannot track server action lifecycle, causing stale UI state.

#### Fix Template

**Before**:

```typescript
"use client";
import { useState } from "react";

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (values: LoginFormData) => {
    setIsLoading(true);
    try {
      // ... auth logic
    } finally {
      setIsLoading(false);
    }
  };

  return <Button disabled={isLoading}>{isLoading ? "..." : "Login"}</Button>;
}
```

**After**:

```typescript
"use client";
import { useTransition } from "react";

export function LoginForm() {
  const [isPending, startTransition] = useTransition();

  const handleLogin = async (values: LoginFormData) => {
    startTransition(async () => {
      // ... auth logic
    });
  };

  return <Button disabled={isPending}>{isPending ? "..." : "Login"}</Button>;
}
```

#### Files to Update

1. **`components/auth/login-form.tsx`** (line 27-64)

   - Remove: `const [isLoading, setIsLoading] = useState(false);`
   - Add: `const [isPending, startTransition] = useTransition();`
   - Replace: `setIsLoading(true/false)` → `startTransition(...)`

2. **`components/auth/sign-up-form.tsx`** (line 25-65)

   - Same pattern as login form
   - Watch out: Multiple `setIsLoading` calls inside try/catch

3. **`components/auth/update-password-form.tsx`** (line 23-52)

   - Same pattern
   - Note: This form also needs `useRouter` for redirect

4. **`components/auth/forgot-password-form.tsx`** (line 23-56)
   - Same pattern
   - Uses `setSuccess` state (keep this, only replace `setIsLoading`)

#### Verification

After fixes, test:

```bash
pnpm dev
# Navigate to /auth/login
# Click submit with empty form
# UI should disable button while processing
# No double-submission possible
```

---

### ISSUE 2: Custom Prisma Type Duplicates

**Principle**: VII. Prisma Types Over Custom Types  
**Severity**: MEDIUM (Type drift risk)  
**Files Affected**: 2 components

#### Root Cause

`EditableCandidate` and `QuizResponse` types duplicate Prisma schema fields. When schema changes, these types become stale.

#### Fix 1: Replace `EditableCandidate` with Prisma Type

**File**: `components/candidates/candidate-form.tsx` (line 26-31)

**Before**:

```typescript
export type EditableCandidate = {
  id: string;
  name: string;
  email: string;
  positionId: string;
  status: NonNullable<CandidateUpdateData["status"]>;
  resumeUrl: string | null;
};
```

**After**:

```typescript
import { Candidate } from "@/lib/prisma/client";

// Use Prisma type directly for form display
// Create DTO only for API contracts if needed
type CandidateFormProps =
  | {
      mode: "new";
      positions: { id: string; title: string }[];
      defaultPositionId?: string;
    }
  | {
      mode: "edit";
      positions: { id: string; title: string }[];
      candidate: Pick<
        Candidate,
        "id" | "name" | "email" | "positionId" | "status" | "resumeUrl"
      >;
    };
```

**Rationale**: Use Prisma type with `Pick<>` to select only needed fields. This stays in sync with schema.

#### Fix 2: Review QuizResponse Type

**File**: `lib/data/quizzes.ts` (line 39-48)

**Analysis**:

- `QuizResponse` is used for API/DTO contracts (camelCase → snake_case transformation)
- This is **acceptable** because it's a composite view type, not just renaming Prisma fields
- Recommendation: Add JSDoc comment to clarify this is a DTO

**Before**:

```typescript
export type QuizResponse = {
  id: string;
  title: string;
  created_at: string;
  position_id: string;
  ...
};
```

**After** (recommended):

```typescript
/**
 * Quiz API response DTO
 * Transforms Prisma camelCase to snake_case for API contracts
 * This is a composite view type, not a duplicate of Prisma fields
 *
 * @see Principle VII: Acceptable as API contract type extending Prisma model
 */
export type QuizResponse = {
  id: string;
  title: string;
  created_at: string;  // ISO string from createdAt
  position_id: string;  // from positionId
  ...
};
```

#### Verification

After fixes, verify:

1. Components compile without `EditableCandidate` replacement
2. Form still displays and submits correctly
3. Type safety maintained with `Pick<Candidate, ...>`

---

### ISSUE 3: Ensure All Suspense Boundaries Have Skeleton Fallbacks

**Principle**: VI. Suspense Fallbacks Using shadcn Skeleton  
**Severity**: LOW (Already mostly compliant)  
**Current Status**: ✅ 95% implemented

#### Quick Audit (Manual Check)

**Files to Verify**:

```bash
# Search for Suspense without skeleton fallbacks
grep -r "<Suspense" app/ --include="*.tsx" | grep -v "fallback="

# Should return: 0 results
```

**Current Implementation** (all verified ✅):

- ✅ `app/dashboard/layout.tsx` → `Suspense` with `Breadcrumbs` fallback
- ✅ `app/dashboard/candidates/runtime-section.tsx` → Explicit skeleton fallbacks
- ✅ `app/interview/[token]/page.tsx` → `InterviewSkeleton` fallback

**No action required**: Suspense + Skeleton pattern fully implemented.

---

### ISSUE 4: Document Type Strategy

**Principle**: VII. Prisma Types Over Custom Types  
**Severity**: LOW (Documentation)  
**Action**: Create best-practice guide

#### Create New File: `docs/TYPE_STRATEGY.md`

**Content** (template):

````markdown
# Type Strategy Guide

## Principle VII: Prisma Types Over Custom Types

### Rule

Use Prisma-generated types directly whenever possible. Only create custom types for:

1. **DTO/API Contracts**: Transform data for external consumers (camelCase ↔ snake_case)
2. **Composite Views**: Combine multiple Prisma types
3. **Form-specific Types**: React Hook Form generics

### Examples

#### ✅ CORRECT: Use Prisma Type Directly

\`\`\`typescript
import { Candidate } from "@/lib/prisma/client";

function CandidateCard(props: { candidate: Candidate }) {
return <div>{props.candidate.name}</div>;
}
\`\`\`

#### ✅ CORRECT: Use Prisma Type with Pick<>

\`\`\`typescript
type EditFormProps = {
candidate: Pick<Candidate, "id" | "name" | "email">;
};
\`\`\`

#### ✅ CORRECT: Create DTO for API Contract

\`\`\`typescript
/\*_ API response - transforms camelCase to snake_case _/
export type CandidateResponse = {
id: string;
name: string;
email_address: string; // from email
position_id: string; // from positionId
};
\`\`\`

#### ❌ WRONG: Duplicate Prisma Fields

\`\`\`typescript
// Don't do this - stays out of sync with schema!
export type CandidateData = {
id: string;
name: string;
email: string;
positionId: string;
};
\`\`\`

### Checklist Before Commit

- [ ] Using Prisma type directly? ✅ Good
- [ ] Creating custom type? ➡️ Ask: "Does this duplicate Prisma fields?"
  - YES → Use `Pick<Prisma.Type, ...>` instead
  - NO → Check if it's a DTO/composite view → Acceptable ✅

### References

- `lib/prisma/client.ts` – All generated Prisma types
- `lib/data/quizzes.ts:39-48` – Example: QuizResponse DTO (acceptable)
- `components/candidates/candidate-form.tsx` – Example: EditableCandidate (should use Pick<>)
  \`\`\`

#### File Location

Save as: `.docs/TYPE_STRATEGY.md`

---

## Implementation Checklist

### PHASE 1: Fix Critical Issues (Today)

- [ ] Fix LoginForm `useState` → `useTransition`
- [ ] Fix SignUpForm `useState` → `useTransition`
- [ ] Fix UpdatePasswordForm `useState` → `useTransition`
- [ ] Fix ForgotPasswordForm `useState` → `useTransition`
- [ ] Replace EditableCandidate with `Pick<Candidate>`
- [ ] Add JSDoc comment to QuizResponse DTO

**Estimated Time**: 45 minutes  
**Files**: 5 components  
**Testing**: Manual test login/signup flow

### PHASE 2: Documentation (This Week)

- [ ] Create `docs/TYPE_STRATEGY.md`
- [ ] Add link to README.md
- [ ] Reference in code review checklist

**Estimated Time**: 20 minutes  
**Impact**: Prevents future compliance issues

### PHASE 3: Validation (Before Merge)

- [ ] All forms use `useTransition` (search: `useState.*loading`)
- [ ] No custom entity type duplicates (grep custom types)
- [ ] All Suspense have skeleton fallbacks (manual check)
- [ ] Run `pnpm build` successfully
- [ ] Test key flows: login, create quiz, create candidate

**Estimated Time**: 30 minutes

---

## Commit Strategy

### Commit 1: Fix Form Pending States

```bash
git commit -m "fix(auth): use useTransition for form pending states

Replace useState-based loading state with useTransition hook in auth forms:
- LoginForm
- SignUpForm
- UpdatePasswordForm
- ForgotPasswordForm

Fixes race condition bugs and ensures consistent server action tracking.

Principle IX: useTransition for Form Pending States"
```
````

### Commit 2: Fix Type Duplicates

```bash
git commit -m "refactor(types): use Prisma types directly, eliminate duplicates

Replace EditableCandidate custom type with Pick<Candidate, ...> to
maintain type sync with Prisma schema.

Add JSDoc to QuizResponse DTO clarifying it's an API contract type.

Principle VII: Prisma Types Over Custom Types"
```

### Commit 3: Documentation

```bash
git commit -m "docs: add TYPE_STRATEGY guide for Prisma type usage

Create TYPE_STRATEGY.md documenting when to use Prisma types directly
vs creating custom DTOs/composite types.

References Principle VII and provides examples for future contributors."
```

---

## Validation Commands

After implementing all fixes:

```bash
# 1. Check for useState loading state (should return 0)
grep -r "useState.*[Ll]oading\|useState.*[Pp]ending" components/auth/

# 2. Check for custom entity type duplicates (manual review)
grep -r "export type.*Candidate\|export type.*Quiz" lib/types/ components/

# 3. Verify Suspense + skeleton pattern (should return 0)
grep -r "<Suspense" app/ --include="*.tsx" | grep -v "fallback="

# 4. Build test
pnpm build

# 5. Run type check
pnpm lint
```

---

## Success Criteria

✅ **100% Compliance Achievement**:

1. All 4 auth forms use `useTransition`
2. No custom types duplicate Prisma entity fields
3. All Suspense boundaries have skeleton fallbacks
4. Build passes without errors
5. Login/signup flows work correctly
6. Type strategy documented

**Timeline**: Complete by end of sprint  
**Reviewer**: Code review team

---

## References

- Constitution: `.specify/memory/constitution.md` (v1.2.0)
- Audit Results: `.specify/memory/constitution-audit.md`
- Compliance Score: 79% → 100%
- Target Principles: VII, IX
