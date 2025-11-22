# Feature Specification: Constitutional Compliance (79% → 100%)

**Date Created**: 2025-11-22  
**Status**: ACTIVE - PLANNING  
**Version**: 1.0.0  
**Target Completion**: End of Sprint

---

## 1. Executive Summary

This specification defines the work required to achieve **100% compliance** with the dev-recruit Constitutional Framework (v1.2.0). Currently at **79% compliance** (8/10 principles), this feature closes the remaining **21% gap** through targeted fixes to form state management and type definitions.

**Scope**: 5 files, 2 issues, 3 commits  
**Effort**: ~95 minutes  
**Risk Level**: LOW (non-breaking changes, isolated components)

---

## 2. Business Goals

- ✅ **Prevent form submission race conditions** in auth flows
- ✅ **Eliminate type drift bugs** caused by custom type duplicates
- ✅ **Establish governance patterns** for future development
- ✅ **Achieve architectural maturity** (100% principle compliance)

---

## 3. Feature Requirements

### Requirement 1: Fix Auth Form Pending State Management

**Priority**: HIGH  
**Principle**: IX. useTransition for Form Pending States  
**Rationale**: `useState` cannot track server action lifecycle; causes stale UI and double-submission bugs

#### User Story

> **As a** form user  
> **I want** form buttons to disable accurately during submission  
> **So that** I cannot accidentally double-submit and see stale state

#### Acceptance Criteria

- [ ] All 4 auth forms use `useTransition()` hook (not `useState`)
- [ ] Form button disables during async submission
- [ ] Form button re-enables after submission completes
- [ ] No manual state cleanup needed (useTransition handles it)
- [ ] Server action errors propagate correctly to UI
- [ ] Tests pass: `pnpm build && pnpm lint`

#### Affected Components

```
components/auth/
├── login-form.tsx          (line 27-64)
├── sign-up-form.tsx        (line 25-65)
├── update-password-form.tsx (line 23-52)
└── forgot-password-form.tsx (line 23-56)
```

---

### Requirement 2: Fix Custom Prisma Type Duplicates

**Priority**: MEDIUM  
**Principle**: VII. Prisma Types Over Custom Types  
**Rationale**: Custom types drift out of sync when Prisma schema changes; use generated types instead

#### User Story

> **As a** developer  
> **I want** types to stay in sync with Prisma schema automatically  
> **So that** I don't encounter type mismatches when schema evolves

#### Acceptance Criteria

- [ ] `EditableCandidate` type replaced with `Pick<Candidate, ...>`
- [ ] `QuizResponse` DTO has JSDoc clarifying it's an API contract
- [ ] No custom entity types duplicate Prisma fields
- [ ] Type safety maintained with `Pick<>` selection
- [ ] Component behavior unchanged (refactor only)
- [ ] Tests pass: `pnpm build && pnpm lint`

#### Affected Components

```
components/candidates/candidate-form.tsx  (line 26-31)
lib/data/quizzes.ts                       (line 39-48)
```

---

### Requirement 3: Document Type Strategy

**Priority**: LOW  
**Principle**: VII. Prisma Types Over Custom Types  
**Rationale**: Prevent future compliance violations through clear governance

#### User Story

> **As a** new developer  
> **I want** a clear guide on when to use Prisma types vs. custom types  
> **So that** I maintain type safety and schema sync automatically

#### Acceptance Criteria

- [ ] `docs/TYPE_STRATEGY.md` created with decision tree
- [ ] Examples provided for ✅ correct patterns
- [ ] Counter-examples provided for ❌ wrong patterns
- [ ] JSDoc checklist included
- [ ] Linked from `README.md`
- [ ] Referenced in code review template

---

## 4. Technical Architecture

### Current State Assessment

**Principle Compliance Breakdown**:

| Principle                  | Status | Score | Evidence                                    |
| -------------------------- | ------ | ----- | ------------------------------------------- |
| I. Cache Components        | ✅     | 100%  | `lib/data/quizzes.ts:217-227`               |
| II. Zod Validation         | ✅     | 100%  | `lib/schemas/quiz.ts` (comprehensive)       |
| III. Server Actions + Auth | ✅     | 100%  | `lib/actions/` (all use `requireUser()`)    |
| IV. Type-Safe AI           | ✅     | 100%  | `lib/services/ai-service.ts`                |
| V. Data in lib/data/       | ✅     | 100%  | `lib/data/*` (no Prisma in components)      |
| VI. Suspense + Skeleton    | ✅     | 100%  | `app/*/fallbacks.tsx` (extensive)           |
| VII. Prisma Types          | ⚠️     | 60%   | **2 issues**: EditableCandidate, need JSDoc |
| VIII. DRY                  | ✅     | 100%  | `lib/data/`, `lib/schemas/`, `lib/actions/` |
| IX. useTransition          | ⚠️     | 55%   | **4 issues**: Auth forms use `useState`     |
| X. Component Reuse         | ✅     | 100%  | `components/ui/`, `components/dashboard/`   |

### Implementation Patterns

#### Pattern 1: useTransition for Server Actions

```typescript
"use client";
import { useTransition } from "react";

export function MyForm() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const result = await myServerAction(formData);
      // useTransition automatically handles state
      // No manual setLoading needed
    });
  };

  return (
    <form action={handleSubmit}>
      <button disabled={isPending}>
        {isPending ? "Loading..." : "Submit"}
      </button>
    </form>
  );
}
```

**Key Points**:

- `useTransition()` tracks async server action lifecycle
- `isPending` reflects actual server action state (no race conditions)
- Button re-enables automatically after async completes
- Errors propagate naturally through Promise rejection

#### Pattern 2: Prisma Type Selection with Pick<>

```typescript
import { Candidate } from "@/lib/prisma/client";

// ✅ CORRECT: Use Pick<> to select needed fields
type CandidateFormProps = {
  candidate: Pick<Candidate, "id" | "name" | "email" | "positionId">;
};

// ❌ WRONG: Don't duplicate Prisma fields
type CandidateData = {
  id: string;
  name: string;
  email: string;
  positionId: string;
};
```

**Benefits**:

- Automatic sync with Prisma schema changes
- Type safety preserved
- No manual field duplication
- `Pick<>` makes intent clear (selecting subset of fields)

#### Pattern 3: API Contract DTOs

```typescript
/**
 * Quiz API response DTO
 * Transforms Prisma camelCase to snake_case for external APIs
 * This is acceptable as it's a composite transformation, not duplication
 *
 * @see Principle VII: Custom types acceptable for API contracts
 */
export type QuizResponse = {
  id: string;
  title: string;
  created_at: string; // ISO string from createdAt
  position_id: string; // from positionId
};
```

---

## 5. Data Model & Contracts

### Form State Contract

#### LoginForm

```typescript
// Input (unchanged)
interface LoginFormData {
  email: string;
  password: string;
}

// Server Action (existing)
async function signInAction(formData: LoginFormData): Promise<void>;

// Client State (CHANGE)
// Before: const [isLoading, setIsLoading] = useState(false);
// After:  const [isPending, startTransition] = useTransition();
```

#### SignUpForm

```typescript
interface SignUpFormData {
  email: string;
  password: string;
  name: string;
}

async function signUpAction(formData: SignUpFormData): Promise<void>;

// Client State
// Before: const [isLoading, setIsLoading] = useState(false);
// After:  const [isPending, startTransition] = useTransition();
```

#### UpdatePasswordForm

```typescript
interface UpdatePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

async function updatePasswordAction(
  formData: UpdatePasswordFormData
): Promise<void>;

// Client State
// Before: const [isLoading, setIsLoading] = useState(false);
// After:  const [isPending, startTransition] = useTransition();
```

#### ForgotPasswordForm

```typescript
interface ForgotPasswordFormData {
  email: string;
}

async function forgotPasswordAction(
  formData: ForgotPasswordFormData
): Promise<void>;

// Client State (Note: keep setSuccess state)
// Before: const [isLoading, setIsLoading] = useState(false);
//         const [success, setSuccess] = useState(false);
// After:  const [isPending, startTransition] = useTransition();
//         const [success, setSuccess] = useState(false); // KEEP THIS
```

### Type Contract Changes

#### Candidate Form

```typescript
// BEFORE (WRONG - duplicates Prisma)
export type EditableCandidate = {
  id: string;
  name: string;
  email: string;
  positionId: string;
  status: NonNullable<CandidateUpdateData["status"]>;
  resumeUrl: string | null;
};

// AFTER (CORRECT - uses Prisma type)
import { Candidate } from "@/lib/prisma/client";

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

#### Quiz Response DTO

```typescript
// BEFORE (needs clarification)
export type QuizResponse = {
  id: string;
  title: string;
  created_at: string;
  position_id: string;
  // ... more fields
};

// AFTER (with JSDoc)
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
  created_at: string; // ISO string from createdAt
  position_id: string; // from positionId
  // ... more fields
};
```

---

## 6. Implementation Plan

### Phase 1: Fix Critical Issues (Day 1-2, ~45 min)

**Commit 1: Auth Forms - useTransition Fix**

```bash
Files Changed:
  - components/auth/login-form.tsx
  - components/auth/sign-up-form.tsx
  - components/auth/update-password-form.tsx
  - components/auth/forgot-password-form.tsx

Changes:
  1. Remove: const [isLoading, setIsLoading] = useState(false);
  2. Add:    const [isPending, startTransition] = useTransition();
  3. Replace: setIsLoading(true/false) with startTransition(() => {...})
  4. Update: Button disabled state from isLoading to isPending

Testing:
  pnpm dev
  → Navigate to /auth/login
  → Submit form
  → Button should disable during submission
  → No double-submission possible
```

**Commit 2: Type Definitions - Prisma Types Fix**

```bash
Files Changed:
  - components/candidates/candidate-form.tsx
  - lib/data/quizzes.ts

Changes:
  1. Replace EditableCandidate with Pick<Candidate, ...>
  2. Add JSDoc comment to QuizResponse DTO
  3. Update imports to use Prisma types directly

Testing:
  pnpm build
  pnpm lint
  → No type errors
  → Component renders correctly
```

### Phase 2: Documentation (Day 3, ~20 min)

**Commit 3: Type Strategy Guide**

```bash
Files Created:
  - docs/TYPE_STRATEGY.md

Content:
  1. Decision tree for Prisma vs. custom types
  2. Examples (✅ correct, ❌ wrong)
  3. JSDoc checklist
  4. References to implementation

Updates:
  - Reference in README.md
  - Add to code review checklist
```

### Phase 3: Validation (Day 4, ~30 min)

**Pre-Merge Checklist**:

```bash
# 1. Check forms use useTransition
grep -r "useTransition" components/auth/
# Expected: 4 matches (one per form)

# 2. Check no useState for loading
grep -r "useState.*[Ll]oading" components/auth/
# Expected: 0 matches

# 3. Check no custom entity types duplicate Prisma
grep -r "export type.*Candidate\|export type.*Quiz" lib/types/ components/
# Expected: Only DTO types like QuizResponse (with JSDoc)

# 4. Check Suspense + skeleton pattern
grep -r "<Suspense" app/ --include="*.tsx" | grep -v "fallback="
# Expected: 0 matches

# 5. Build test
pnpm build
# Expected: success

# 6. Lint check
pnpm lint
# Expected: no errors
```

---

## 7. Success Criteria

### Quantitative Metrics

| Metric                        | Current | Target | Validation Command                    |
| ----------------------------- | ------- | ------ | ------------------------------------- |
| Constitutional Compliance     | 79%     | 100%   | Check audit report                    |
| Auth Forms with useTransition | 0/4     | 4/4    | `grep useTransition components/auth/` |
| Custom Candidate Types        | 1       | 0      | `grep EditableCandidate components/`  |
| Type Strategy Documented      | ❌      | ✅     | `ls docs/TYPE_STRATEGY.md`            |
| Build Status                  | ✅      | ✅     | `pnpm build`                          |
| Lint Status                   | ✅      | ✅     | `pnpm lint`                           |

### Qualitative Criteria

- ✅ All form submissions maintain UI consistency
- ✅ No race condition vulnerabilities in auth flows
- ✅ Type definitions stay in sync with schema
- ✅ New developers understand type strategy
- ✅ Code review checklist updated

---

## 8. Risk Assessment

### Risk 1: Form Behavior Changes

**Severity**: LOW  
**Probability**: VERY LOW  
**Mitigation**:

- useTransition is drop-in replacement for useState loading
- Server actions already working correctly
- Only UI state management changes

### Risk 2: Type Compatibility

**Severity**: LOW  
**Probability**: VERY LOW  
**Mitigation**:

- Pick<> preserves all selected fields
- Components continue working identically
- No API contract changes

### Risk 3: Missed Compliance Gaps

**Severity**: MEDIUM  
**Probability**: LOW  
**Mitigation**:

- Validation commands provided (grep searches)
- Build + lint must pass
- Code review checklist prevents oversights

---

## 9. Dependencies & Prerequisites

### Tech Stack

```
- Next.js 16 (App Router with cache components)
- React 19.2.0 (useTransition available)
- Prisma 6.19.0 (generated types available)
- TypeScript 5.x (Pick<> type utility)
```

### File Dependencies

```
✅ components/auth/* depends on React hooks (React 19)
✅ components/candidates/* depends on lib/prisma/client (generated)
✅ lib/data/quizzes.ts depends on Prisma types
```

### No External Dependencies Required

- No new packages needed
- No database migrations required
- No environment variable changes needed

---

## 10. Rollback Plan

### If Issues Arise

1. **Immediate Rollback**: `git revert <commit-hash>`
2. **Diagnosis**: Review PR comments and validation outputs
3. **Targeted Fix**: Address specific issue and re-test
4. **Re-Deploy**: Run validation checklist again before re-merge

### Backup Strategy

- Commits are atomic (form fix, type fix, documentation)
- Each commit is independently revertible
- No database state changes required
- No data loss possible

---

## 11. Timeline

| Phase     | Task                               | Duration        | Target Date     |
| --------- | ---------------------------------- | --------------- | --------------- |
| Phase 1   | Fix auth forms (useTransition)     | 30 min          | Day 1           |
| Phase 1   | Fix type definitions               | 15 min          | Day 2           |
| Phase 2   | Create type strategy documentation | 20 min          | Day 3           |
| Phase 3   | Validation & testing               | 30 min          | Day 4           |
| **Total** | **All tasks**                      | **~95 minutes** | **This sprint** |

---

## 12. References

### Constitutional Documents

- **Constitution**: `.specify/memory/constitution.md` (v1.2.0)
- **Audit Report**: `.specify/memory/constitution-audit.md` (79% compliance)
- **Implementation Guide**: `.specify/memory/implementation-guide.md` (detailed fixes)

### Code References

- **Auth Forms**: `components/auth/*.tsx`
- **Type Definitions**: `lib/prisma/client.ts`, `components/candidates/candidate-form.tsx`
- **Data Layer**: `lib/data/quizzes.ts`
- **Validation Schemas**: `lib/schemas/`

### External References

- [React useTransition Hook](https://react.dev/reference/react/useTransition)
- [Prisma Type Generation](https://www.prisma.io/docs/orm/prisma-client/type-safety)
- [TypeScript Pick Utility](https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype--keys)

---

## 13. Sign-Off

**Specification Owner**: Architecture Team  
**Created**: 2025-11-22  
**Status**: READY FOR IMPLEMENTATION  
**Next Step**: Execute Phase 1 (Auth Forms Fix)

---

## Appendix A: Validation Checklist

### Pre-Implementation

- [ ] Constitution v1.2.0 understood (10 principles)
- [ ] Audit report reviewed (79% compliance identified)
- [ ] Implementation guide read (concrete fixes)
- [ ] This spec reviewed (all requirements clear)

### Post-Implementation

- [ ] All 4 auth forms use useTransition
- [ ] EditableCandidate replaced with Pick<Candidate>
- [ ] QuizResponse has JSDoc documentation
- [ ] TYPE_STRATEGY.md created
- [ ] README.md updated with link
- [ ] pnpm build passes
- [ ] pnpm lint passes
- [ ] Code review approved
- [ ] Merged to main

### Post-Merge Verification

- [ ] Feature deployed successfully
- [ ] 100% compliance achieved
- [ ] No regressions in auth flows
- [ ] Type checking works as expected
- [ ] New developers reference TYPE_STRATEGY.md
