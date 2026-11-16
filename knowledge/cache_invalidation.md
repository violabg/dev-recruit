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
- Two reads are uncached on purpose: `getProfile` (depends on the session) and `getAssessmentByToken` (live assessment state while the candidate answers). Follow the same choice for any session-dependent or live read.
- `requireUser()` and `getCurrentUser()` read the session cookie, so the framework's rules for request APIs apply to them: never inside a `"use cache"` scope.
- A server component that reads the session MUST first await a request value: `await connection()`, or `await searchParams` when it already receives them. With Partial Prefetching on, `headers()` resolves in the App Shell, so a component that awaits only `params` known from `generateStaticParams` (or nothing at all) runs the session read during prerender and the route fails with the blocking-route error on `new Date()`.

## Tag vocabulary

Always build tags with the helpers from the cache utils; never write tag strings by hand.

| Collection tag (`CacheTags.*`) | Entity tag (`entityTag.*`) |
|---|---|
| `QUIZZES` = `quizzes` | `entityTag.quiz(id)` → `quiz-{id}` |
| `QUESTIONS` = `questions` | `entityTag.question(id)` → `question-{id}` |
| `POSITIONS` = `positions` | `entityTag.position(id)` → `positions-{id}` (plural on purpose) |
| `CANDIDATES` = `candidates` | `entityTag.candidate(id)` → `candidate-{id}` |
| `ASSESSMENTS` = `assessments` | `entityTag.assessment(id)` → `assessment-{id}` |
| `EVALUATIONS` = `evaluations` | `entityTag.evaluation(id)`, `entityTag.evaluationAssessment(assessmentId)`, `entityTag.evaluationCandidate(candidateId)` |
| `BEHAVIORAL_RUBRICS` = `behavioral-rubrics` | `entityTag.behavioralRubric(candidateId, positionId)` |
| `PRESETS` = `presets` | `entityTag.preset(id)` |
| `REFERENCE_DATA` = `reference-data` | `entityTag.referenceCategory(category)` |

`entityTag` is an object of functions; the separator is always `-`.

There is no tag for `User`. Cached application reads include the owner's name (`owner: { select: { id: true, name: true } }`) but carry only the tags of the entities they join and of the collections they read. A user rename therefore does not refresh those reads until another tag or the `cacheLife` window expires; this is accepted, not compensated with a new tag.

## Dependency-tag rule

A cached read MUST tag the collection tag of every entity it reads, including every relation pulled in through `include` or `select`. Mutations invalidate only their own entity, so a missing dependency tag means stale UI. Add the entity tag too when the read targets one row.

```ts
export async function getFilteredCandidates(params?: FetchCandidatesParams) {
  "use cache";
  cacheLife("hours");
  // CANDIDATE_INCLUDE joins positions + assessments
  cacheTag(CacheTags.CANDIDATES, CacheTags.POSITIONS, CacheTags.ASSESSMENTS);
  // ...prisma.candidate.findMany({ where, include: CANDIDATE_INCLUDE, ... })
}
```

`Application` is an entity, not a join table: it carries the stage and the owner, and it has no tag of its own. Its reads are covered by `candidates` plus the candidate and position entity tags; every write on an application calls `invalidateCandidateCache` with the candidate, the position(s) and the application id(s). The real join table, `QuizQuestion`, is covered by `quizzes` + `questions`.

## Invalidating mutations

Every mutation calls the matching helper, never `updateTag`, `revalidateTag` or `revalidatePath` directly (the helpers also refresh the dashboard paths).

| Helper | Always expires | Options |
|---|---|---|
| `invalidateQuizCache({ quizId?, positionId?, deleted? })` | `quizzes`, `questions` | entity tags for quiz and position |
| `invalidateQuestionCache({ questionId?, quizId? })` | `questions` | `quizId` also expires the quiz. A favorite toggle needs no extra option: the `questions` collection covers favorite status |
| `invalidatePositionCache(positionId?, { deleted? })` | `positions` | positional id, then options |
| `invalidateCandidateCache({ candidateId?, positionId?, positionIds?, applicationId?, applicationIds?, deleted? })` | `candidates` | candidate and position entity tags; revalidates `/dashboard/candidates` and `/dashboard/applications` always, `/dashboard/applications/{id}` for every application id given, `/dashboard/candidates/{id}` when a candidate id is given, `/dashboard/positions/{id}` for every position id, and `/dashboard` |
| `invalidateCandidateCacheInRouteHandler({ candidateId?, positionId?, applicationId? })` | `candidates` | same entity tags and paths as the action variant; for route handlers, such as the resume evaluation stream that can advance an application's stage |
| `invalidateAssessmentCache({ assessmentId?, quizId?, deleted? })` | `assessments` | revalidates `/dashboard/assessments`, `/dashboard/assessments/{id}` and `/dashboard` (the home lists the tests to evaluate) |
| `invalidateEvaluationCache({ evaluationId?, assessmentId?, candidateId? })` | `evaluations` | server actions only |
| `invalidateEvaluationCacheInRouteHandler({ … })` | `evaluations` | same options; for route handlers |
| `invalidateBehavioralRubricCache({ candidateId, positionId })` | `behavioral-rubrics` | both required; revalidates `/dashboard/candidates/{candidateId}` and `/dashboard/applications` |
| `invalidatePresetCache(presetId?)` | `presets` | pass the id whenever there is one |
| `invalidateReferenceDataCache(category?)` | `reference-data` | |
| `invalidateProfileCache()` | profile paths | |

Server actions use the standard helper; a route handler uses the `…InRouteHandler` variant. Why the two cannot be swapped is framework behaviour: see the docs named above.

## Deletes and database cascades

A delete (including `deleteMany`) of a Position, Quiz, Candidate or Assessment MUST pass `deleted: true`, so the helper also expires the collections whose rows the database removed by cascade (`CASCADE_ON_DELETE`):

| Deleted | Also expires |
|---|---|
| position | quizzes, assessments, evaluations, candidates, behavioral-rubrics |
| quiz | assessments, evaluations |
| candidate | assessments, evaluations, behavioral-rubrics |
| assessment | evaluations |

```ts
await prisma.candidate.delete({ where: { id } });
invalidateCandidateCache({
  candidateId: id,
  positionIds: candidate.applications.map((a) => a.positionId),
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
- Updating a candidate's positions and passing only the added position ids: a removed position also changes the cache.
- Writing to an application without passing its id, so `/dashboard/applications/{id}` stays stale, or using the action variant inside a route handler.
- Caching session-dependent data, or calling `requireUser()`/`getCurrentUser()` inside `"use cache"`.
- Reading the session in a server component without first awaiting `connection()` or `searchParams`.
- Redirecting from the email verification route to a caller-supplied URL without the same-origin check.
