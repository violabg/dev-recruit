# Pagination & Code Quality Improvement Task

## Overview

Add URL-synced pagination (10 items/page) to all list pages using shadcn/ui, and clean up code quality issues.

---

## Tasks

### 1. Install shadcn pagination component ✅

- [x] Run `npx shadcn@latest add pagination` (already installed)

### 2. Create reusable URL-synced pagination wrapper ✅

- [x] Create `components/ui/url-pagination.tsx`
- [x] Sync with `useSearchParams`
- [x] Preserve existing filters
- [x] Default to 10 items per page
- [x] Export `PaginationInfo` type, `DEFAULT_PAGE_SIZE`, `normalizePaginationParams`

### 3. Update data layer functions for pagination ✅

- [x] `lib/data/positions.ts` → `getPositions()` returns `PaginatedPositions`
- [x] `lib/data/positions.ts` → Added `getAllPositions()` for dropdowns/static params
- [x] `lib/data/candidates.ts` → `getFilteredCandidates()` returns `PaginatedCandidates`
- [x] `lib/data/quizzes.ts` → `getQuizzes()` returns `PaginatedQuizzes`
- [x] `lib/data/presets.ts` → `getPresetsData()` returns `PaginatedPresets` with search

### 4. Update list pages with pagination controls ✅

- [x] `app/dashboard/positions/page.tsx`
- [x] `app/dashboard/candidates/runtime-section.tsx`
- [x] `app/dashboard/quizzes/quiz-list-section.tsx`
- [x] `app/dashboard/presets/page.tsx` (complete rewrite with search + pagination)
- [x] `app/dashboard/interviews/runtime-section.tsx` - using shared `UrlPagination`

### 5. Code cleanup - Remove console.logs and dead code ✅

- [x] `lib/services/ai-service.ts` - removed 11 console.log/error statements, unused `startTime` vars
- [x] `lib/actions/presets.ts` - removed logs, unused `user` vars, `"use cache"`
- [x] `lib/actions/quizzes.ts` - removed 13 console.debug statements
- [x] `components/interview/interview-question.tsx` - removed debug console.logs

### 6. Fix type safety issues (replace `as any`) ✅

- [x] `lib/actions/quizzes.ts` - use `?? []` for nullable JSON value
- [x] `lib/actions/seed-presets.ts` - typed `PresetSeedData` and removed `as any`
- [x] `prisma/seed.ts` - typed `PresetSeedData` and removed `as any`
- [x] `components/candidates/candidate-form.tsx` - proper union type for status
- [x] `components/rhf-inputs/input-with-tag-field.tsx` - typed as `string[]`

### 7. Further improvements ✅

- [x] Add 800ms debounce to `components/positions/search-positions.tsx`
- [x] Standardize filter reset URL pattern (use `pathname`) across all search components
- [x] Add search/filter functionality to presets page (`search-presets.tsx`)
- [x] Updated `components/interviews/search-and-filter-interviews.tsx` to use `pathname`

### 8. Bug fixes (discovered during implementation) ✅

- [x] Fixed `authClient.forgetPassword` → `authClient.requestPasswordReset` in `forgot-password-form.tsx`
- [x] Fixed `"Cannot access valueOf on the server"` error in candidates page
  - Root cause: `Math.max()` calls `.valueOf()` on params, which fails with "temporary client references"
  - Solution: Replace `Math.max(page, 1)` with conditional checks `typeof page === 'number' && page > 0 ? page : 1`
  - Consolidated `candidate-filters-section.tsx` and `candidate-list-section.tsx` into `runtime-section.tsx`

---

## Progress Log

- [x] Task completed successfully
- TypeScript compiles without errors
- All list pages now have consistent URL-synced pagination (10 items/page)
- All search components use debounce (800ms) and dynamic pathname for resets
- Console.logs removed from production code
- Type safety improved (no more `as any`)
