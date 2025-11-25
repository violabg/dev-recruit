# Quizzes Page Refactoring Task

## Steps

- [x] 1. Fix `searchParams` typing - add `QuizzesSearchParams` type
- [x] 2. Extract runtime section to `runtime-section.tsx`
- [x] 3. Add search params normalization/validation functions
- [x] 4. Fix uncached data - use cached wrapper for filter options
- [x] 5. Separate filter/search section with its own Suspense
- [x] 6. Clean up redundant `view` param handling

## Further Considerations

- [x] 7. Create `CachedFilterOptions` function for `uniqueLevels` and `positions`
- [x] 8. Add `FiltersSkeleton` to fallbacks.tsx
- [x] 9. Add pagination support (`page`, `pageSize` params)
- [x] 10. Make tabs URL-controlled (sync `view` param with tabs state)
- [x] 11. Extract "Nuovo quiz" button to shared component
- [x] 12. Add `error.tsx` for error boundary

## Files Created/Modified

### New Files

- `runtime-section.tsx` - Types, normalization, runtime section with Suspense
- `quiz-filters-section.tsx` - Cached filter options component
- `quiz-list-section.tsx` - Cached quiz list component
- `quiz-view-tabs.tsx` - URL-controlled tabs client component
- `new-quiz-button.tsx` - Reusable new quiz button component
- `error.tsx` - Error boundary for graceful error handling

### Modified Files

- `page.tsx` - Simplified to use runtime-section pattern
- `fallbacks.tsx` - Added `FiltersSkeleton`
- `lib/data/quizzes.ts` - Added `CachedQuizFilterOptions` function

## Architecture Summary

```text
page.tsx (static shell)
├── NewQuizButton (static)
└── Suspense (QuizzesRuntimeFallback)
    └── QuizzesRuntimeSection (async, normalizes params)
        ├── Suspense (FiltersSkeleton)
        │   └── QuizFiltersSection → CachedQuizFilterOptions
        └── Suspense (QuizListSkeleton)
            └── QuizListSection → CachedQuizzesContent
                └── QuizViewTabs (client, URL-controlled)
```
