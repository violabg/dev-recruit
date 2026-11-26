---
title: "cache invalidation"
tier: "PerContext"
keywords: ["cache","use cache","cacheTag","invalidate","CacheTags","entityTag","data layer"]
intent: "When adding or changing a cached read in the data layer or any mutation that must invalidate cache (including interviews, kits, interviewer scorecards, the application decision and users), or passing server data to client components."
editable: true
---
# Cache tagging and invalidation

Cache Components and Partial Prefetching are on; the framework's `"use cache"`, `cacheLife`, `cacheTag`, `updateTag` and `revalidateTag` are documented elsewhere. Only this project's rules are here.

## Where caching lives

- `"use cache"` only in the data-layer functions (one module per entity). Pages and server components call those functions and never call Prisma.
- Every cached read sets `cacheLife("hours")`, or `cacheLife("minutes")` for short-lived data. No other or custom profiles.
- Uncached on purpose: `getProfile`, `getAssessmentByToken`, `getInterviewLiveSession`, `getInterviewFeedbackPage`. Apply the same choice to any session-dependent or live read.
- `requireUser()` and `getCurrentUser()` read the session cookie: NEVER inside a `"use cache"` scope.
- A server component that reads the session MUST first await a request value: `await connection()`, or `await searchParams` when it already receives them. With Partial Prefetching, awaiting only `params` known from `generateStaticParams` runs the session read during prerender and the route fails with the blocking-route error on `new Date()`.
- The Decision page and the "Decisione" tab read the session after `await connection()`, outside the cached read. The live and scorecard pages call `await connection()` before reading the session.

## Tag vocabulary

Always build tags with the helpers from the cache utils; never write tag strings by hand (no literals, no `:` separator). Collection tags are `CacheTags.*`, entity tags `entityTag.*`, the separator is `-`.

- `entityTag.position` produces `positions-{id}` (plural on purpose).
- `entityTag.scorecard` takes a POSITION id, never a scorecard id (at most one scorecard per position, so the position keys both the scorecard and its criteria).
- `entityTag.interviewGuide` takes the guide id, never the position id nor a section id; `entityTag.interview` takes the interview id, never the application id.
- No tag of their own: criteria (covered by `scorecards`), guide sections and questions (`interview-guides`), `QuizQuestion` links (`quizzes` + `questions`).
- `interviews` covers interviews, participants, kits, sections, items and submitted scorecards. Live notes and unsubmitted scorecards are never in a cached read.
- `users` covers every read whose subject is users (the participant options, the user list); every change to a user (creation, name, email, role, email verification, ban, unban) expires it through its invalidation helper. Reads that only join a user's name (owner, participants, `decidedBy`, interviewer) carry only the tags of the entities they read.

## Dependency-tag rule

A cached read MUST tag the collection tag of every entity it reads, including every relation pulled in through `include` or `select`, and the entity tag when it targets one row. Mutations invalidate only their own entity, so a missing dependency tag means stale UI.

```ts
export async function getFilteredCandidates(params?: FetchCandidatesParams) {
  "use cache";
  cacheLife("hours");
  // CANDIDATE_INCLUDE joins positions + assessments
  cacheTag(CacheTags.CANDIDATES, CacheTags.POSITIONS, CacheTags.ASSESSMENTS);
  // ...prisma.candidate.findMany({ where, include: CANDIDATE_INCLUDE, ... })
}
```

- `Application` is an entity, not a join table: stage and owner, no tag of its own. Its reads are covered by `candidates` plus the candidate and position entity tags; every write on an application calls `invalidateCandidateCache` with candidate, position(s) and application id(s).
- The counter-intuitive dependencies: `getCriterionOptionsByPosition` → `scorecards` only (walks all positions, so no `positions` and no entity tag); `getPositionSetupStatus` → `positions`, `scorecards`, `quizzes`, `interview-guides`, `entityTag.position`; `getInterviewGuidesByPosition` → `interview-guides`, `positions`, `entityTag.position` (never a guide tag); `getApplicationDecision` → every evaluation input collection plus `entityTag.candidate` and `entityTag.position`, submitted scorecards only, and it does not read the session.

## Invalidating mutations

Every mutation calls the matching helper, never `updateTag`, `revalidateTag` or `revalidatePath` directly: the helpers also refresh the dashboard paths. Server actions use the standard helper, route handlers (MCP tools included) the `…InRouteHandler` variant. Quiz, question, position, assessment, scorecard, guide and interview helpers have no variant: a route handler that needs one adds it first, same tags and paths, with `revalidateTag(tag, { expire: 0 })`.

| Helper | Non-obvious tags and paths |
|---|---|
| `invalidateQuizCache({ quizId?, positionId?, deleted? })` | `quizzes`, `questions`, plus quiz and position entity tags |
| `invalidateQuestionCache({ questionId?, quizId? })` | `questions`; `quizId` also expires the quiz; a favorite toggle needs nothing |
| `invalidatePositionCache(positionId?, { deleted? })` | `positions`, positional id, then options |
| `invalidateCandidateCache({ candidateId?, positionId?, positionIds?, applicationId?, applicationIds?, deleted? })` | `candidates`, candidate and position entity tags; always `/dashboard/candidates`, `/dashboard/applications`, `/dashboard`; per application, candidate and position ids their detail pages. `invalidateCandidateCacheInRouteHandler` takes the same options |
| `invalidateAssessmentCache({ assessmentId?, quizId?, deleted? })` | `assessments`, `/dashboard/assessments`, `/dashboard/assessments/{id}`, `/dashboard` |
| `invalidateEvaluationCache({ evaluationId?, assessmentId?, candidateId? })` | `evaluations`; `…InRouteHandler` variant for route handlers |
| `invalidateScorecardCache({ positionId })` | `scorecards`, `scorecard-{positionId}`, the position and scorecard pages and `/dashboard`. It does NOT expire `positions`, the position entity tag or `/dashboard/positions` |
| `invalidateInterviewGuideCache({ guideId?, positionId })` | `interview-guides`, `interview-guide-{id}` when given, the position, guides/{guideId} and `/dashboard`. Never `/dashboard/positions/{id}/guides/new` |
| `invalidateInterviewCache({ interviewId?, applicationId })` | `interviews`, `interview-{id}` when given, `/dashboard/applications/{applicationId}`, `/dashboard/agenda`, `/dashboard`; with `interviewId` also prepare, live and feedback |

- `invalidatePresetCache(presetId?)` expires `presets` (pass the id whenever there is one), `invalidateReferenceDataCache(category?)` expires `reference-data`, `invalidateProfileCache()` refreshes the profile paths.
- `saveScorecardAction` always calls `invalidateScorecardCache`, and calls `invalidateInterviewGuideCache({ positionId })` only when the save removed a deleted criterion from at least one guide question.
- `upsertInterviewGuideAction` and `deleteInterviewGuideAction` call `invalidateInterviewGuideCache({ guideId, positionId })` (after the transaction / before the redirect).
- `deletePositionAction` calls only `invalidatePositionCache(id, { deleted: true })`: `scorecards`, `interview-guides` and `interviews` come through `CASCADE_ON_DELETE`.
- Every interview, kit and scorecard action calls `invalidateInterviewCache`; when the stage changes too (scheduling, last scorecard submission, cancellation, no-show) it also calls `invalidateCandidateCache`. `moveApplicationStageAction` and `updateCandidateAction` call `invalidateInterviewCache` when the withdrawal cancelled interviews.
- `recordApplicationDecisionAction` calls `invalidateCandidateCache({ candidateId, positionId, applicationId })`. `challengeDecisionAction` invalidates nothing.

## Deletes and database cascades

A delete (including `deleteMany`) of a Position, Quiz, Candidate or Assessment MUST pass `deleted: true`, so the helper also expires the collections the database removed by cascade: position → quizzes, assessments, evaluations, candidates, scorecards, interview-guides, interviews; quiz → assessments, evaluations; candidate → assessments, evaluations, interviews; assessment → evaluations. When an `onDelete: Cascade` relation is added or changed in the schema, update `CASCADE_ON_DELETE` in the same change.

## Passing server data to client components

NEVER fetch lists in a client component (`useEffect`, or an action on mount). Fetch in the server tree with a cached data function and hand down: markup only → async server component passed as a `ReactNode` prop; the data itself → un-awaited cached read passed as a promise prop, with a `.catch(() => [])` fallback.

## API routes

Route handlers exist only for: the auth library catch-all (OAuth endpoints included), the OAuth metadata routes, the MCP endpoint, the email verification confirm, the resume evaluation stream and the position description stream. Every dashboard write is a server action, and no other route handler exists for scorecards, criteria, guides, interviews or kits (MCP tools reach them through the MCP endpoint): the per-criterion part of the resume evaluation travels in the existing stream.

## Ids of deleted criteria on quiz links

The scorecard save never writes `QuizQuestion`, so the id of a deleted criterion can survive on an existing link until that quiz is saved again, and a copy to the same position carries it. The authoritative cleanup is server-side: every quiz save drops unknown ids before the transaction.

- Every reader MUST resolve criterion ids through the scorecard (active and archived alike) and ignore unknown ids: quiz view, quiz form, CV per-criterion assessment, interview kit, interviewer scorecard.
- The guide editor is the exception: it keeps an unresolvable id in the form, labelled archived, and the guide save accepts it because that guide already stores it.

## Prohibitions

- NEVER redirect from the email verification route to a caller-supplied URL without the same-origin check.
- NEVER delete without `deleted: true`, or pass only the added position ids when a candidate's positions change: a removed position also changes the cache.
- NEVER write to an application without its id (stale `/dashboard/applications/{id}`).
- NEVER add an entity tag to `getCriterionOptionsByPosition`, or forget `scorecards` in `getPositionSetupStatus`.
- NEVER forget `invalidateInterviewCache` on a kit save or autosave.
