# Cache Implementation with React Cache and Next.js Revalidation

This document explains the cache implementation for the quiz edit page and related actions.

## Overview

The implementation uses React's `cache()` function for request-level deduplication combined with Next.js `revalidatePath()` for cache invalidation. This approach avoids the limitations of `unstable_cache` with dynamic data sources served through Prisma and Neon.

## Key Components

### 1. Data Layer (`lib/data/quiz-data.ts`)

A centralized data layer with cached functions using React's `cache()`:

- **Request-level caching**: Ensures the same data is not fetched multiple times in a single request
- **Type safety**: All data fetching functions include proper validation
- **Error handling**: Graceful handling of database errors

```typescript
// Usage examples
const data = await getQuizData(quizId); // Cached quiz data
const position = await getPositionData(positionId); // Cached position data
```

### 2. Cache Utility (`lib/utils/cache.ts`)

A centralized utility for managing cache revalidation:

- **Path-based revalidation**: Uses `revalidatePath()` to invalidate specific pages
- **Granular control**: Can revalidate specific quiz pages or entire sections
- **Consistent patterns**: Standardized revalidation for different data types

```typescript
// Usage examples
revalidateQuizCache(quizId); // Revalidates quiz-related pages
revalidatePositionCache(positionId); // Revalidates position-related pages
```

### 3. Page Implementation (`app/dashboard/quizzes/[id]/edit/page.tsx`)

The edit page uses the cached data layer:

```typescript
// Simple, clean data fetching with automatic caching
const data = await getQuizData(awaitedParams.id);
```

### 4. Action Cache Revalidation (`lib/actions/quizzes.ts`)

All quiz-modifying actions include cache revalidation:

- **Create Quiz**: Revalidates quiz listing and specific pages
- **Update Quiz**: Revalidates specific quiz pages for fresh data
- **Delete Quiz**: Revalidates to remove stale references

## Caching Strategy

### React Cache Level

- **Function**: `cache()` from React
- **Scope**: Single request/render cycle
- **Purpose**: Deduplication of identical data fetches within one request

### Next.js Revalidation Level

- **Function**: `revalidatePath()` from Next.js
- **Scope**: Cross-request cache invalidation
- **Purpose**: Ensure fresh data after mutations

## Benefits

1. **Performance**: Request-level deduplication prevents redundant queries
2. **Freshness**: Immediate cache invalidation after data changes
3. **Simplicity**: No complex cache tag management
4. **Compatibility**: Works seamlessly with Prisma/Neon-backed dynamic data sources
5. **Type Safety**: Full TypeScript support throughout the data layer

## Usage Flow

1. **Page Load**:

   - Calls cached data function
   - If already called in this request, returns cached result
   - If first call, fetches from database and caches for request duration

2. **Quiz Update**:

   - User saves quiz changes
   - `updateQuizAction` updates database
   - `revalidateQuizCache(quizId)` invalidates relevant pages
   - Next page load will fetch fresh data

3. **Subsequent Loads**:
   - Fresh data is served from the database
   - New request-level cache is created

## Revalidation Patterns

### Quiz Operations

```typescript
revalidateQuizCache(quizId); // Revalidates:
// - /dashboard/quizzes
// - /dashboard/quizzes/[id]
// - /dashboard/quizzes/[id]/edit
```

### Position Operations

```typescript
revalidatePositionCache(positionId); // Revalidates:
// - /dashboard/positions
// - /dashboard/positions/[id]
// - /dashboard/positions/[id]/edit
```

## Error Handling

- Cache failures fall back to direct database queries
- Validation errors prevent cache corruption
- User-friendly error messages are maintained
- No cache pollution from invalid data

## Future Enhancements

1. **Extended Data Layer**: Add more cached functions for other entities
2. **Selective Revalidation**: More granular path revalidation patterns
3. **Background Refresh**: Implement ISR patterns for less critical data
4. **Cache Metrics**: Monitor cache hit rates and performance
