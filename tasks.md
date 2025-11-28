# Code Audit Implementation Tasks

Generated from audit run on 2025-11-28.

## Summary

Build passes with 0 errors. Lint reports 4 warnings (React Hook Form watch() incompatibility with React Compiler). Key issues: missing env validation, Prisma client committed to git, large ai-service.ts file, scattered console.error calls.

---

## Tasks

### 1. Add Environment Validation (High Priority)

**Status:** ✅ Completed

**Issue:** Non-null assertions on env vars in `lib/services/r2-storage.ts` (lines 14-17) and missing validation for `DATABASE_URL` in `lib/prisma.ts`.

**Action:**

- [x] Create `lib/env.ts` with Zod schema validating: `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` (optional)
- [x] Export typed getters (e.g., `env.DATABASE_URL`)
- [x] Update `lib/services/r2-storage.ts` to use validated env
- [x] Update `lib/prisma.ts` to use validated env
- [x] Test: `pnpm build` + manually test R2 upload and DB connection

**Risk:** Low

---

### 2. Remove Generated Prisma Client from Git (Medium Priority)

**Status:** ✅ Completed

**Issue:** `lib/prisma/` contains ~25K lines of generated code with `/* eslint-disable */` in every file. This bloats the repo and risks drift.

**Action:**

- [x] Add `lib/prisma/` to `.gitignore`
- [x] `"db:generate": "prisma generate"` script already in `package.json`
- [x] Remove `lib/prisma/*` from git tracking: `git rm -r --cached lib/prisma/`
- [x] CI/CD generates Prisma client via `prebuild` script
- [x] Test: `pnpm install && pnpm db:generate && pnpm build`

**Risk:** Medium — requires CI update

---

### 3. Split AI Service into Modules (Medium Priority)

**Status:** ✅ Completed

**Issue:** `lib/services/ai-service.ts` is 968 lines combining prompts, sanitization, retry logic, and streaming.

**Action:**

- [x] Create `lib/services/ai/` directory
- [x] Extract `lib/services/ai/sanitize.ts` (sanitizeInput function)
- [x] Extract `lib/services/ai/prompts.ts` (system prompts, prompt builders)
- [x] Extract `lib/services/ai/streaming.ts` (streamPositionDescription helper)
- [x] Extract `lib/services/ai/retry.ts` (withRetry, withTimeout)
- [x] Extract `lib/services/ai/types.ts` (AIGenerationError, interfaces)
- [x] Keep `lib/services/ai/core.ts` with AIQuizService class
- [x] Create `lib/services/ai/index.ts` with re-exports
- [x] Keep `lib/services/ai-service.ts` as backward-compatible re-export
- [x] Test: `pnpm build` passes

**Risk:** Medium — many imports to update

---

### 4. Fix ESLint Disables (Low Priority)

**Status:** ✅ Completed

**Issue:** `components/ui/input-with-tag.tsx` has `eslint-disable-next-line react-hooks/exhaustive-deps`.

**Action:**

- [x] Review the useEffect dependencies in `input-with-tag.tsx`
- [x] Fixed by extracting `onChange` to stable callback with `useCallback`
- [x] Added `notifyParent` to dependency array
- [x] Test: `pnpm lint` no longer shows the eslint-disable

**Risk:** Low

---

### 5. Review Unused Dependencies (Low Priority)

**Status:** ✅ Completed

**Issue:** depcheck reports potentially unused deps: `@aws-sdk/s3-request-presigner`, `@neondatabase/serverless`, `autoprefixer`, `pg`, `tw-animate-css`.

**Action:**

- [x] Verified each dependency:
  - `@aws-sdk/s3-request-presigner` - unused, removed
  - `@neondatabase/serverless` - unused, removed
  - `autoprefixer` - not needed with Tailwind v4, removed
  - `pg` - required by `@prisma/adapter-pg`, kept
  - `tw-animate-css` - used in `globals.css`, kept
- [x] Removed unused packages: `pnpm remove @aws-sdk/s3-request-presigner @neondatabase/serverless autoprefixer`
- [x] Test: `pnpm install && pnpm build` passes

**Risk:** Low

---

### 6. Consolidate Question Creation Logic (Low Priority)

**Status:** ✅ Completed (Already Implemented)

**Issue:** Repeated per-question create loops in `lib/actions/questions.ts` and `lib/actions/quizzes.ts`.

**Action:**

- [x] Reviewed: `prepareQuestionForCreate` utility already exists in `lib/utils/question-utils.ts`
- [x] `createQuestionAction` uses typed `CreateQuestionInput` schema (intentionally different)
- [x] Quiz actions use `prepareQuestionForCreate` for `FlexibleQuestion` conversion
- [x] Separation is appropriate: entity schema vs AI-generated question format

**Risk:** Medium — DB semantics may change

---

### 7. Centralize Cache Invalidation (Optional, Save for Last)

**Status:** ✅ Completed

**Issue:** Inconsistent cache invalidation patterns across actions.

**Action:**

- [x] Create `lib/utils/cache-utils.ts` with helpers like `invalidateQuizCache()`
- [x] Added `CacheTags` constants and `entityTag` helper for consistent tag naming
- [x] Created invalidation helpers for all entities: quiz, question, position, candidate, interview, evaluation, preset
- [x] Updated `lib/utils/cache.ts` to re-export new utilities with deprecation notices
- [x] Updated all action files to use centralized cache utilities:
  - `lib/actions/positions.ts` - uses `invalidatePositionCache()`
  - `lib/actions/presets.ts` - uses `invalidatePresetCache()`
  - `lib/actions/quizzes.ts` - uses `invalidateQuizCache()`
  - `lib/actions/candidates.ts` - uses `invalidateCandidateCache()`
  - `lib/actions/interviews.ts` - uses `invalidateInterviewCache()`
  - `lib/actions/questions.ts` - uses `invalidateQuestionCache()` and `invalidateQuizCache()`
  - `lib/actions/evaluation-entity.ts` - uses `invalidateEvaluationCache()`
  - `lib/actions/profile.ts` - uses `invalidateProfileCache()`
  - `lib/actions/seed-presets.ts` - uses `invalidatePresetCache()`
  - `lib/actions/candidate-quiz-assignment.ts` - uses `invalidateInterviewCache()`
- [x] Test: `pnpm build` passes, UI pages update after mutations

**Risk:** Low

---

### 8. Add Centralized Logger (Low Priority, Optional)

**Status:** ✅ Completed

**Issue:** 20+ `console.error` calls scattered across hooks, actions, and components with inconsistent logging.

**Action:**

- [x] Create `lib/services/logger.ts` with `logger.error()`, `logger.warn()`, `logger.info()`, `logger.debug()`
- [x] Made env-aware (verbose with colors in dev, structured JSON in prod, suppressed in test)
- [x] Added scoped loggers: `aiLogger`, `dbLogger`, `authLogger`, `storageLogger`
- [x] Updated high-impact files:
  - `lib/services/r2-storage.ts` - uses `storageLogger`
  - `lib/auth-server.ts` - uses `authLogger`
  - `lib/actions/evaluations.ts` - uses `aiLogger`
  - `lib/services/error-handler.ts` - uses central `logger`
- [x] Test: `pnpm build` passes, errors appear in dev console with context

**Risk:** Low

---

## Completed

1. ✅ Add Environment Validation - Created `lib/env.ts`, updated r2-storage.ts and prisma.ts
2. ✅ Remove Generated Prisma Client - Added to .gitignore, removed from git tracking
3. ✅ Split AI Service - Created `lib/services/ai/` with modular components
4. ✅ Fix ESLint Disables - Fixed input-with-tag.tsx useEffect deps
5. ✅ Review Unused Dependencies - Removed 3 unused packages
6. ✅ Consolidate Question Creation - Already properly implemented
7. ✅ Centralize Cache Invalidation - Created `lib/utils/cache-utils.ts` with helpers
8. ✅ Add Centralized Logger - Created `lib/services/logger.ts` with scoped loggers

---

## Notes

- React Hook Form `watch()` warnings are known limitations with React Compiler — low priority
- All changes should be tested with `pnpm build` before commit
- Large refactors (tasks 2, 3, 7) should be separate PRs
