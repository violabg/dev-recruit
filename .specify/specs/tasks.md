# Constitutional Compliance Implementation Tasks

**Feature**: Constitutional Compliance (79% → 100%)  
**Specification**: `.specify/specs/constitution-compliance.spec.md`  
**Total Tasks**: 18  
**Estimated Duration**: ~95 minutes  
**Status**: READY FOR IMPLEMENTATION

---

## Phase 1: Setup & Preparation

### T001 Review Constitutional Framework

- [x] T001 Review `.specify/memory/constitution.md` (v1.2.0) - understand 10 principles
- [x] Verify current compliance score: 79% (8/10 principles)
- [x] Document any questions in PR comments

**Depends on**: None  
**Time**: 10 min  
**Files**: `.specify/memory/constitution.md`

---

### T002 Audit Report Review

- [x] T002 Review `.specify/memory/constitution-audit.md` - understand issues identified
- [x] Note the 2 principles needing fixes (VII, IX)
- [x] Verify file paths and line numbers match repository

**Depends on**: T001  
**Time**: 10 min  
**Files**: `.specify/memory/constitution-audit.md`

---

### T003 Implementation Guide Review

- [x] T003 Read `.specify/memory/implementation-guide.md` - understand detailed fixes
- [x] Highlight fix patterns for auth forms and type definitions
- [x] Prepare commit messages from template

**Depends on**: T002  
**Time**: 10 min  
**Files**: `.specify/memory/implementation-guide.md`

---

## Phase 2: Fix Auth Forms (Principle IX - useTransition)

### T004 Fix LoginForm - Replace useState with useTransition

- [x] T004 [P] [US1] Open `components/auth/login-form.tsx` and locate line 27-64
- [x] Remove: `const [isLoading, setIsLoading] = useState(false);`
- [x] Add: `import { useTransition } from "react";`
- [x] Add: `const [isPending, startTransition] = useTransition();`
- [x] Replace: `setIsLoading(true)` with `startTransition(async () => {`
- [x] Replace: `setIsLoading(false)` with closing `});`
- [x] Update: Button `disabled={isLoading}` → `disabled={isPending}`
- [x] Update: Button text `isLoading` → `isPending`

**Depends on**: T003  
**Time**: 10 min  
**Files**: `components/auth/login-form.tsx`  
**Testing**: Visual inspection, type checking

---

### T005 Fix SignUpForm - Replace useState with useTransition

- [x] T005 [P] [US1] Open `components/auth/sign-up-form.tsx` and locate line 25-65
- [x] Remove: `const [isLoading, setIsLoading] = useState(false);`
- [x] Add: `import { useTransition } from "react";`
- [x] Add: `const [isPending, startTransition] = useTransition();`
- [x] Replace all: `setIsLoading(true/false)` → `startTransition(...)`
- [x] Watch for: Multiple `setIsLoading` calls inside try/catch blocks
- [x] Update: Button disabled and text states to use `isPending`

**Depends on**: T003  
**Time**: 10 min  
**Files**: `components/auth/sign-up-form.tsx`  
**Testing**: Type checking for any errors

---

### T006 Fix UpdatePasswordForm - Replace useState with useTransition

- [x] T006 [P] [US1] Open `components/auth/update-password-form.tsx` and locate line 23-52
- [x] Remove: `const [isLoading, setIsLoading] = useState(false);`
- [x] Add: `import { useTransition } from "react";`
- [x] Add: `const [isPending, startTransition] = useTransition();`
- [x] Replace: `setIsLoading(true/false)` → `startTransition(...)`
- [x] Update: Button disabled and text states to use `isPending`
- [x] Note: Verify `useRouter` is available for redirect after successful update

**Depends on**: T003  
**Time**: 10 min  
**Files**: `components/auth/update-password-form.tsx`  
**Testing**: Type checking

---

### T007 Fix ForgotPasswordForm - Replace useState with useTransition

- [x] T007 [P] [US1] Open `components/auth/forgot-password-form.tsx` and locate line 23-56
- [x] Remove: `const [isLoading, setIsLoading] = useState(false);`
- [x] Add: `import { useTransition } from "react";`
- [x] Add: `const [isPending, startTransition] = useTransition();`
- [x] Replace: `setIsLoading(true/false)` → `startTransition(...)`
- [x] KEEP: `const [success, setSuccess] = useState(false);` (don't remove this)
- [x] Update: Button disabled and text states to use `isPending`

**Depends on**: T003  
**Time**: 10 min  
**Files**: `components/auth/forgot-password-form.tsx`  
**Testing**: Type checking

---

### T008 Test Auth Forms - Compile and Type Check

- [x] T008 Run `pnpm lint` to verify no TypeScript errors in auth forms
- [x] Run `pnpm build` to verify all forms compile successfully
- [x] Verify no new type errors introduced

**Depends on**: T004, T005, T006, T007  
**Time**: 5 min  
**Command**: `pnpm lint && pnpm build`

---

### T009 Commit Auth Forms Changes

- [x] T009 Stage all auth form changes: `git add components/auth/`
- [x] Commit with message (from implementation-guide.md):

  ```
  fix(auth): use useTransition for form pending states

  Replace useState-based loading state with useTransition hook in auth forms:
  - LoginForm
  - SignUpForm
  - UpdatePasswordForm
  - ForgotPasswordForm

  Fixes race condition bugs and ensures consistent server action tracking.

  Principle IX: useTransition for Form Pending States
  ```

- [x] Verify commit appears in git log

**Depends on**: T008  
**Time**: 5 min  
**Command**: `git commit -m "..."`

---

## Phase 3: Fix Type Definitions (Principle VII - Prisma Types)

### T010 Fix EditableCandidate Type - Use Pick<Candidate>

- [x] T010 [P] [US2] Open `components/candidates/candidate-form.tsx` and locate line 26-31
- [x] Identify the `EditableCandidate` type definition
- [x] Add import: `import { Candidate } from "@/lib/prisma/client";`
- [x] Replace `EditableCandidate` definition with union type:
  ```typescript
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
- [x] Update component props to use `CandidateFormProps` instead of `EditableCandidate`
- [x] Verify component still receives required fields from Prisma type

**Depends on**: T003  
**Time**: 10 min  
**Files**: `components/candidates/candidate-form.tsx`  
**Testing**: Type checking for Pick<> correctness

---

### T011 Document QuizResponse DTO - Add JSDoc

- [x] T011 [P] [US2] Open `lib/data/quizzes.ts` and locate line 39-48
- [x] Identify the `QuizResponse` type definition
- [x] Add JSDoc comment above `QuizResponse`:
  ```typescript
  /**
   * Quiz API response DTO
   * Transforms Prisma camelCase to snake_case for API contracts
   * This is a composite view type, not a duplicate of Prisma fields
   *
   * @see Principle VII: Acceptable as API contract type extending Prisma model
   */
  ```
- [x] Add inline comments to clarify field mappings (e.g., `created_at` from `createdAt`)

**Depends on**: T003  
**Time**: 5 min  
**Files**: `lib/data/quizzes.ts`  
**Testing**: No functional changes, documentation only

---

### T012 Test Type Definitions - Compile and Type Check

- [x] T012 Run `pnpm lint` to verify no TypeScript errors in candidate form
- [x] Run `pnpm build` to verify types compile successfully
- [x] Verify `Pick<Candidate>` resolves correctly

**Depends on**: T010, T011  
**Time**: 5 min  
**Command**: `pnpm lint && pnpm build`

---

### T013 Commit Type Definition Changes

- [x] T013 Stage type definition changes: `git add components/candidates/ lib/data/quizzes.ts`
- [x] Commit with message (from implementation-guide.md):

  ```
  refactor(types): use Prisma types directly, eliminate duplicates

  Replace EditableCandidate custom type with Pick<Candidate, ...> to
  maintain type sync with Prisma schema.

  Add JSDoc to QuizResponse DTO clarifying it's an API contract type.

  Principle VII: Prisma Types Over Custom Types
  ```

- [x] Verify commit appears in git log

**Depends on**: T012  
**Time**: 5 min  
**Command**: `git commit -m "..."`

---

## Phase 4: Documentation (Principle VII - Type Strategy)

### T014 Create TYPE_STRATEGY.md Documentation

- [x] T014 Create new file `docs/TYPE_STRATEGY.md`
- [x] Add section: "Principle VII: Prisma Types Over Custom Types"
- [x] Add section: "Rule" (when to use Prisma vs custom types)
- [x] Add section: "Examples - ✅ CORRECT patterns"
  - Direct Prisma type usage
  - Pick<> for field selection
  - DTO for API contracts
- [x] Add section: "Examples - ❌ WRONG patterns"
  - Field duplication
  - Manual type remapping
- [x] Add section: "Checklist Before Commit"
- [x] Add section: "References" linking to implementation files

**Depends on**: T003  
**Time**: 20 min  
**Files**: `docs/TYPE_STRATEGY.md` (new)  
**Template**: Use implementation-guide.md template

---

### T015 Update README.md with TYPE_STRATEGY Link

- [x] T015 Open `README.md` and locate documentation section
- [x] Add link to TYPE_STRATEGY.md in "Type Safety" or "Development Guides" section
- [x] Add short description: "Guide for when to use Prisma types vs custom types"

**Depends on**: T014  
**Time**: 5 min  
**Files**: `README.md`

---

### T016 Commit Documentation Changes

- [x] T016 Stage documentation: `git add docs/TYPE_STRATEGY.md README.md`
- [x] Commit with message (from implementation-guide.md):

  ```
  docs: add TYPE_STRATEGY guide for Prisma type usage

  Create TYPE_STRATEGY.md documenting when to use Prisma types directly
  vs creating custom DTOs/composite types.

  References Principle VII and provides examples for future contributors.
  ```

- [x] Verify commit appears in git log

**Depends on**: T015  
**Time**: 5 min  
**Command**: `git commit -m "..."`

---

## Phase 5: Validation & Testing

### T017 Run Validation Commands

- [x] T017 Check forms use useTransition:
  ```bash
  grep -r "useTransition" components/auth/
  # Expected: 4 matches (one per form)
  ```
- [x] Check no useState for loading:
  ```bash
  grep -r "useState.*[Ll]oading" components/auth/
  # Expected: 0 matches
  ```
- [x] Check no custom entity type duplicates:
  ```bash
  grep -r "EditableCandidate" components/
  # Expected: 0 matches
  ```
- [x] Verify Suspense + skeleton pattern:
  ```bash
  grep -r "<Suspense" app/ --include="*.tsx" | grep -v "fallback="
  # Expected: 0 matches
  ```

**Depends on**: T009, T013, T016  
**Time**: 10 min  
**Commands**: Validation grep searches

---

### T018 Final Build and Lint Check

- [x] T018 Run full build: `pnpm build`
- [x] Run full lint: `pnpm lint`
- [x] Verify no errors or warnings
- [x] Confirm all 3 commits are clean and self-contained
- [x] Ready for PR/merge review

**Depends on**: T017  
**Time**: 15 min  
**Commands**: `pnpm build && pnpm lint`

---

## Task Dependencies Graph

```
T001 (Review Constitution)
  └─ T002 (Review Audit)
      └─ T003 (Review Implementation Guide)
          ├─ T004 (Fix LoginForm) ──┐
          ├─ T005 (Fix SignUpForm) ─┤
          ├─ T006 (Fix UpdatePasswordForm) ┤
          ├─ T007 (Fix ForgotPasswordForm) ├─ T008 (Test) ─ T009 (Commit)
          │                             │
          ├─ T010 (Fix EditableCandidate) ─┐
          ├─ T011 (Document QuizResponse) ─┼─ T012 (Test) ─ T013 (Commit)
          │                                 │
          ├─ T014 (Create TYPE_STRATEGY) ──┴─ T015 (Update README) ─ T016 (Commit)
          │
          └─ T017 (Validation)
              └─ T018 (Final Build & Lint)
```

---

## Parallelization Opportunities

### Can Run in Parallel (T004-T007)

All 4 auth forms can be fixed in parallel since they're independent:

- LoginForm
- SignUpForm
- UpdatePasswordForm
- ForgotPasswordForm

**Time Savings**: From 40 min sequential to ~10 min parallel  
**Coordination**: All must pass T008 before proceeding

### Can Run in Parallel (T010-T011)

Both type fixes can happen in parallel:

- EditableCandidate type
- QuizResponse documentation

**Time Savings**: From 15 min sequential to ~10 min parallel  
**Coordination**: Both must pass T012 before proceeding

---

## Task Breakdown by Principle

### Principle IX: useTransition for Form Pending States

**Tasks**: T004, T005, T006, T007, T008, T009  
**Files**: 4 auth form components  
**Effort**: 45 min  
**Commits**: 1

### Principle VII: Prisma Types Over Custom Types

**Tasks**: T010, T011, T012, T013, T014, T015, T016  
**Files**: 2 implementation + 2 documentation  
**Effort**: 50 min  
**Commits**: 2

---

## Success Metrics Per Task

| Task      | Success Criteria            | Validation                                |
| --------- | --------------------------- | ----------------------------------------- |
| T004-T007 | All forms use useTransition | `grep useTransition`                      |
| T008      | No build errors             | `pnpm build` passes                       |
| T009      | Clean commit                | git log shows fix commit                  |
| T010      | Pick<> compiles             | `pnpm lint` passes                        |
| T011      | JSDoc complete              | Visual review                             |
| T012      | No type errors              | `pnpm build` passes                       |
| T013      | Clean commit                | git log shows refactor commit             |
| T014      | Documentation complete      | File exists with all sections             |
| T015      | Link added                  | `grep TYPE_STRATEGY README.md`            |
| T016      | Clean commit                | git log shows docs commit                 |
| T017      | All validations pass        | All grep commands return expected results |
| T018      | Production ready            | `pnpm build && pnpm lint` passes          |

---

## Pre-Implementation Checklist

Before starting tasks:

- [ ] Understanding the 10 constitutional principles
- [ ] Awareness of 79% current compliance
- [ ] Knowledge of the 2 issues to fix (VII, IX)
- [ ] Git workflow ready (clean working directory)
- [ ] All dependencies installed (`pnpm install`)
- [ ] Development environment tested (`pnpm dev` works)

---

## Post-Implementation Validation

After all tasks complete:

- [ ] 100% constitutional compliance achieved
- [ ] All 4 auth forms use useTransition
- [ ] EditableCandidate type eliminated
- [ ] QuizResponse DTO documented
- [ ] TYPE_STRATEGY.md created and linked
- [ ] Build passes: `pnpm build`
- [ ] Lint passes: `pnpm lint`
- [ ] No regressions in auth flows
- [ ] Code review approved
- [ ] Merged to main branch

---

## Reference Documents

- **Constitution**: `.specify/memory/constitution.md` (v1.2.0)
- **Audit Report**: `.specify/memory/constitution-audit.md` (79% compliance)
- **Implementation Guide**: `.specify/memory/implementation-guide.md` (concrete fixes)
- **Feature Spec**: `.specify/specs/constitution-compliance.spec.md` (this plan)

---

**Status**: ✅ READY FOR IMPLEMENTATION  
**Next Step**: Begin T001 (Review Constitutional Framework) or proceed directly to Phase 2 if prerequisites met
