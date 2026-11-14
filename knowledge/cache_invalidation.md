---
title: "cache invalidation"
tier: "PerContext"
keywords: ["cache","use cache","cacheTag","invalidate","CacheTags","entityTag","data layer"]
intent: "When adding or changing a cached read in the data layer or any mutation that must invalidate cache, or passing server data to client components."
editable: true
---
# Cache tagging and invalidation

Cache Components and Partial Prefetching are on. The framework itself is NOT restated here: what `"use cache"`, `cacheLife`, `cacheTag`, `updateTag` and `revalidateTag` do and where each may be called, which request APIs are allowed inside a cached scope, what may run during prerender, and how to hand promises or server components to client components. Ask next-devtools MCP or context7 for the installed Next.js version. This document holds only this project's rules, so a library upgrade never makes it stale.

## Where caching lives

- `"use cache"` is used only in the data layer functions (one module per entity). Pages and server components call those functions; they never call Prisma.
- Every cached read sets `cacheLife("hours")`, or `cacheLife("minutes")` for short-lived data. No other profile and no custom profiles.
- Two reads are uncached on purpose: `getProfile` (depends on the session) and `getInterviewByToken` (live interview state while the candidate answers). Follow the same choice for any session-dependent or live read.
- `requireUser()` and `getCurrentUser()` read the session cookie, so the framework's rules for request APIs apply to them: never inside a `"use cache"` scope.

## Tag vocabulary

Always build tags with the helpers from the cache utils; never write tag strings by hand.

| Collection tag (`CacheTags.*`) | Entity tag (`entityTag.*`) |
|---|---|
| `QUIZZES` = `quizzes` | `entityTag.quiz(id)` → `quiz-{id}` |
| `QUESTIONS` = `questions` | `entityTag.question(id)` → `question-{id}` |
| `POSITIONS` = `positions` | `entityTag.position(id)` → `positions-{id}` (plural on purpose) |
| `CANDIDATES` = `candidates` | `entityTag.candidate(id)` → `candidate-{id}` |
| `INTERVIEWS` = `interviews` | `entityTag.interview(id)` → `interview-{id}` |
| `EVALUATIONS` = `evaluations` | `entityTag.evaluation(id)`, `entityTag.evaluationInterview(interviewId)`, `entityTag.evaluationCandidate(candidateId)` |
| `BEHAVIORAL_RUBRICS` = `behavioral-rubrics` | `entityTag.behavioralRubric(candidateId, positionId)` |
| `PRESETS` = `presets` | `entityTag.preset(id)` |
| `REFERENCE_DATA` = `reference-data` | `entityTag.referenceCategory(category)` |

`entityTag` is an object of functions; the separator is always `-`.

## Dependency-tag rule

A cached read MUST tag the collection tag of every entity it reads, including every relation pulled in through `include` or `select`. Mutations invalidate only their own entity, so a missing dependency tag means stale UI. Add the entity tag too when the read targets one row.

```ts
export async function getFilteredCandidates(params?: FetchCandidatesParams) {
  "use cache";
  cacheLife("hours");
  // CANDIDATE_INCLUDE joins positions + interviews
  cacheTag(CacheTags.CANDIDATES, CacheTags.POSITIONS, CacheTags.INTERVIEWS);
  // ...prisma.candidate.findMany({ where, include: CANDIDATE_INCLUDE, ... })
}
```

Join tables have no tag of their own: `QuizQuestion` is covered by `quizzes` + `questions`, `CandidatePosition` by `candidates`.

## Invalidating mutations

Every mutation calls the matching helper, never `updateTag`, `revalidateTag` or `revalidatePath` directly (the helpers also refresh the dashboard paths).

| Helper | Always expires | Options |
|---|---|---|
| `invalidateQuizCache({ quizId?, positionId?, deleted? })` | `quizzes`, `questions` | entity tags for quiz and position |
| `invalidateQuestionCache({ questionId?, quizId? })` | `questions` | `quizId` also expires the quiz. A favorite toggle needs no extra option: the `questions` collection covers favorite status |
| `invalidatePositionCache(positionId?, { deleted? })` | `positions` | positional id, then options |
| `invalidateCandidateCache({ candidateId?, positionId?, positionIds?, deleted? })` | `candidates` | pass every position touched (old and new) |
| `invalidateInterviewCache({ interviewId?, quizId?, deleted? })` | `interviews` | |
| `invalidateEvaluationCache({ evaluationId?, interviewId?, candidateId? })` | `evaluations` | server actions only |
| `invalidateEvaluationCacheInRouteHandler({ … })` | `evaluations` | same options; for route handlers |
| `invalidateBehavioralRubricCache({ candidateId, positionId })` | `behavioral-rubrics` | both required |
| `invalidatePresetCache(presetId?)` | `presets` | pass the id whenever there is one |
| `invalidateReferenceDataCache(category?)` | `reference-data` | |
| `invalidateProfileCache()` | profile paths | |

Server actions use the standard helper; a route handler uses the `…InRouteHandler` variant. Why the two cannot be swapped is framework behaviour: see the docs named above.

## Deletes and database cascades

A delete (including `deleteMany`) of a Position, Quiz, Candidate or Interview MUST pass `deleted: true`, so the helper also expires the collections whose rows the database removed by cascade (`CASCADE_ON_DELETE`):

| Deleted | Also expires |
|---|---|
| position | quizzes, interviews, evaluations, candidates, behavioral-rubrics |
| quiz | interviews, evaluations |
| candidate | interviews, evaluations, behavioral-rubrics |
| interview | evaluations |

```ts
await prisma.candidate.delete({ where: { id } });
invalidateCandidateCache({
  candidateId: id,
  positionIds: candidate.positions.map((p) => p.positionId),
  deleted: true,
});
```

When an `onDelete: Cascade` relation is added or changed in the Prisma schema, update `CASCADE_ON_DELETE` in the same change.

## Passing server data to client components

NEVER fetch lists in a client component (`useEffect`, or an action called on mount). Fetch them in the server tree with a cached data function and hand them down:

| Client needs | Project example |
|---|---|
| only to render markup for the data | async server component passed as a `ReactNode` prop: `languageOptions={<Suspense fallback={<SelectOptionsSkeleton />}><ProgrammingLanguageSelectItems /></Suspense>}` |
| the data itself | un-awaited cached read passed as a promise prop: `presetsPromise={getAllPresets().catch(() => [])}` |

## API routes

Route handlers exist only for:

| Route | Purpose |
|---|---|
| auth library catch-all | the auth library's own endpoints |
| email verification confirm | verifies the email token through the auth library, then redirects only to a same-origin path (a `next`/`callbackURL` pointing elsewhere falls back to `/`) |
| resume evaluation stream | streamed resume evaluation |
| position description | streamed position description |

Every other server call from the client is a server action. Every route handler except the two auth ones MUST call `requireUser()`.

## Common mistakes

- Adding an `include`/`select` relation to a cached read without adding that entity's collection tag.
- Writing tags as literals, with `:` as separator, or `position-{id}` instead of `positions-{id}`.
- Calling `updateTag`/`revalidatePath` directly, or `invalidateEvaluationCache` inside a route handler.
- Deleting without `deleted: true`, leaving cascaded rows in cached lists and counts.
- Updating a candidate's positions and passing only the new position ids.
- Caching session-dependent data, or calling `requireUser()`/`getCurrentUser()` inside `"use cache"`.
- Redirecting from the email verification route to a caller-supplied URL without the same-origin check.
