---
title: "cache invalidation"
tier: "PerContext"
keywords: ["cache","use cache","cacheTag","invalidate","CacheTags","entityTag","data layer"]
intent: "When adding or changing a cached read in the data layer or any mutation that must invalidate cache (including interviews, kits, interviewer scorecards and the application decision), or passing server data to client components."
editable: true
---
# Cache tagging and invalidation

Cache Components and Partial Prefetching are on. What `"use cache"`, `cacheLife`, `cacheTag`, `updateTag` and `revalidateTag` do, where they may be called, which request APIs are allowed inside a cached scope, what may run during prerender, and how to hand promises or server components to client components: ask next-devtools MCP or context7. Only this project's rules are here.

## Where caching lives

- `"use cache"` only in the data-layer functions (one module per entity). Pages and server components call those functions and never call Prisma.
- Every cached read sets `cacheLife("hours")`, or `cacheLife("minutes")` for short-lived data. No other or custom profiles.
- Uncached on purpose: `getProfile` (session), `getAssessmentByToken` (live state while answering), `getInterviewLiveSession` and `getInterviewFeedbackPage` (session-dependent live notes and scorecards). Apply the same choice to any session-dependent or live read.
- The Decision page and the "Decisione" tab read the session after `await connection()`, outside the cached read. The live and scorecard pages call `await connection()` before reading the session.
- Live mode calls `router.refresh()` every 15 s while the interview is in progress and the tab is visible.
- `requireUser()` and `getCurrentUser()` read the session cookie: NEVER inside a `"use cache"` scope.
- A server component that reads the session MUST first await a request value: `await connection()`, or `await searchParams` when it already receives them. With Partial Prefetching, awaiting only `params` known from `generateStaticParams` runs the session read during prerender and the route fails with the blocking-route error on `new Date()`.

## Tag vocabulary

Always build tags with the helpers from the cache utils; never write tag strings by hand (no literals, no `:` separator).

- Collection tags `CacheTags.*`: `QUIZZES`, `QUESTIONS`, `POSITIONS`, `CANDIDATES`, `ASSESSMENTS`, `EVALUATIONS`, `BEHAVIORAL_RUBRICS`, `PRESETS`, `REFERENCE_DATA`, `SCORECARDS`, `INTERVIEW_GUIDES`, `INTERVIEWS`.
- Entity tags `entityTag.*`: `quiz`, `question`, `position`, `candidate`, `assessment`, `evaluation` + `evaluationAssessment` + `evaluationCandidate`, `behavioralRubric`, `preset`, `referenceCategory`, `scorecard`, `interviewGuide`, `interview`. Separator is always `-`; `entityTag.position` produces `positions-{id}` (plural on purpose).
- `entityTag.scorecard` takes a POSITION id, never a scorecard id (at most one scorecard per position, so the position keys both the scorecard and its criteria).
- `entityTag.interviewGuide` takes the guide id, never the position id nor a section id.
- No tag of their own: criteria (covered by `scorecards`), guide sections and questions (`interview-guides`), `QuizQuestion` links (`quizzes` + `questions`).
- `interviews` covers interviews, participants, kits, sections, items and submitted scorecards. Live notes and unsubmitted scorecards are never in a cached read.
- No tag for `User`. Reads that join the owner's name carry only the tags of the entities they join; a user rename is refreshed by another tag or the `cacheLife` window. `getUserOptions` uses `cacheLife("minutes")` and no tag.

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
- Non-obvious dependencies: `getScorecardByPositionId` → `scorecards`, `positions`, `entityTag.scorecard(positionId)`; `getCriterionOptionsByPosition` → `scorecards` only (walks all positions, so no `positions` and no entity tag); `getPositionSetupStatus` → `positions`, `scorecards`, `quizzes`, `interview-guides`, `entityTag.position`; `getApplicationDetail` → candidate/position/assessment/evaluation/quiz collections plus `scorecards`, `interviews`; `getActionCenterData` → the same plus `interview-guides`; `getInterviewGuidesByPosition` → `interview-guides`, `positions`, `entityTag.position` (never a guide tag); `getInterviewGuideById` → `interview-guides`, `entityTag.interviewGuide`; `getInterviewsByApplication` → `interviews`, `candidates`, `positions`, `interview-guides`; `getInterviewForPreparation` → also `scorecards`, `entityTag.interview`; `getAgendaInterviews` → `cacheLife("minutes")`, `interviews`, `candidates`, `positions`.
- `getApplicationDecision` → `cacheLife("hours")`, tags `candidates`, `positions`, `assessments`, `evaluations`, `quizzes`, `questions`, `scorecards`, `interviews`, `behavioral-rubrics`, plus `entityTag.candidate` and `entityTag.position`. Returns submitted scorecards only, never live notes, and does not read the session.

## Invalidating mutations

Every mutation calls the matching helper, never `updateTag`, `revalidateTag` or `revalidatePath` directly: the helpers also refresh the dashboard paths.

| Helper | Always expires | Options and paths |
|---|---|---|
| `invalidateQuizCache({ quizId?, positionId?, deleted? })` | `quizzes`, `questions` | quiz and position entity tags |
| `invalidateQuestionCache({ questionId?, quizId? })` | `questions` | `quizId` also expires the quiz; a favorite toggle needs nothing (the collection covers it) |
| `invalidatePositionCache(positionId?, { deleted? })` | `positions` | positional id, then options |
| `invalidateCandidateCache({ candidateId?, positionId?, positionIds?, applicationId?, applicationIds?, deleted? })` | `candidates` | candidate and position entity tags; always revalidates `/dashboard/candidates`, `/dashboard/applications`, `/dashboard`; per application id `/dashboard/applications/{id}`; per candidate id `/dashboard/candidates/{id}`; per position id `/dashboard/positions/{id}` |
| `invalidateCandidateCacheInRouteHandler({ … })` | `candidates` | same tags and paths, for route handlers |
| `invalidateAssessmentCache({ assessmentId?, quizId?, deleted? })` | `assessments` | `/dashboard/assessments`, `/dashboard/assessments/{id}`, `/dashboard` |
| `invalidateEvaluationCache({ evaluationId?, assessmentId?, candidateId? })` | `evaluations` | server actions only |
| `invalidateEvaluationCacheInRouteHandler({ … })` | `evaluations` | same options, for route handlers |
| `invalidatePresetCache(presetId?)` | `presets` | pass the id whenever there is one |
| `invalidateReferenceDataCache(category?)` | `reference-data` | |
| `invalidateProfileCache()` | profile paths | |
| `invalidateScorecardCache({ positionId })` | `scorecards`, `scorecard-{positionId}` | `positionId` required; `/dashboard/positions/{id}`, `/dashboard/positions/{id}/scorecard`, `/dashboard`. Does not expire `positions`, the position entity tag or `/dashboard/positions` |
| `invalidateInterviewGuideCache({ guideId?, positionId })` | `interview-guides`, `interview-guide-{id}` when given | `positionId` required; `/dashboard/positions/{id}`, `/dashboard/positions/{id}/guides/{guideId}`, `/dashboard`. Never `/dashboard/positions/{id}/guides/new` |
| `invalidateInterviewCache({ interviewId?, applicationId })` | `interviews`, `interview-{id}` when given | `applicationId` required; `/dashboard/applications/{applicationId}`, `/dashboard/agenda`, `/dashboard`; with `interviewId` also `…/interviews/{interviewId}/prepare`, `/live`, `/feedback` |

- Server actions use the standard helper, route handlers the `…InRouteHandler` variant; they cannot be swapped (framework behaviour, see the docs above). The scorecard, guide and interview helpers are server-action only.
- `saveScorecardAction` always calls `invalidateScorecardCache`, and calls `invalidateInterviewGuideCache({ positionId })` only when the save removed a deleted criterion from at least one guide question.
- `upsertInterviewGuideAction` and `deleteInterviewGuideAction` call `invalidateInterviewGuideCache({ guideId, positionId })` (after the transaction / before the redirect).
- `deletePositionAction` calls neither: `invalidatePositionCache(id, { deleted: true })` expires `scorecards`, `interview-guides` and `interviews` through `CASCADE_ON_DELETE`.
- Every interview, kit and scorecard action calls `invalidateInterviewCache`; when the stage changes too (scheduling, last scorecard submission, cancellation, no-show) it also calls `invalidateCandidateCache`. `moveApplicationStageAction` and `updateCandidateAction` call `invalidateInterviewCache` when the withdrawal cancelled interviews.
- `recordApplicationDecisionAction` calls `invalidateCandidateCache({ candidateId, positionId, applicationId })` (no new tag). `challengeDecisionAction` invalidates nothing.

## Deletes and database cascades

A delete (including `deleteMany`) of a Position, Quiz, Candidate or Assessment MUST pass `deleted: true`, so the helper also expires the collections the database removed by cascade (`CASCADE_ON_DELETE`).

| Deleted | Also expires |
|---|---|
| position | quizzes, assessments, evaluations, candidates, behavioral-rubrics, scorecards, interview-guides, interviews |
| quiz | assessments, evaluations |
| candidate | assessments, evaluations, behavioral-rubrics, interviews |
| assessment | evaluations |

When an `onDelete: Cascade` relation is added or changed in the schema, update `CASCADE_ON_DELETE` in the same change.

## Passing server data to client components

NEVER fetch lists in a client component (`useEffect`, or an action on mount). Fetch in the server tree with a cached data function and hand down:

- markup only → async server component passed as a `ReactNode` prop.
- the data itself → un-awaited cached read passed as a promise prop, with a `.catch(() => [])` fallback.

## API routes

Route handlers exist only for: the auth library catch-all, the email verification confirm, the resume evaluation stream and the position description stream. Everything else is a server action. Every route handler except the two auth ones MUST call `requireUser()`. The per-criterion part of the resume evaluation travels in the existing stream: no route handler for scorecards, criteria, guides, interviews or kits.

## Ids of deleted criteria on quiz links

The scorecard save never writes `QuizQuestion`, so the id of a deleted criterion can survive on an existing link until that quiz is saved again, and `duplicateQuizAction` can copy it to a same-position duplicate.

- The authoritative cleanup is server-side: every quiz save drops unknown ids before the transaction.
- Every reader MUST resolve criterion ids through the scorecard (active and archived alike) and ignore unknown ids: quiz view, quiz form, CV per-criterion assessment, interview kit, interviewer scorecard.
- The guide editor is the exception: it keeps an unresolvable id in the form, labelled archived, and the guide save accepts it because that guide already stores it.

## Prohibitions

- NEVER add an `include`/`select` relation to a cached read without its collection tag.
- NEVER write tag literals or the wrong separator, or `position-{id}` instead of `positions-{id}`.
- NEVER call `updateTag`/`revalidatePath` directly, or an action-only helper inside a route handler.
- NEVER delete without `deleted: true`.
- NEVER pass only the added position ids when a candidate's positions change: a removed position also changes the cache.
- NEVER write to an application without its id (stale `/dashboard/applications/{id}`).
- NEVER cache session-dependent data or call `requireUser()`/`getCurrentUser()` inside `"use cache"`.
- NEVER cache live notes or an unsubmitted scorecard, or read the session in a server component without first awaiting `connection()` or `searchParams`.
- NEVER redirect from the email verification route to a caller-supplied URL without the same-origin check.
- NEVER key a scorecard tag by scorecard id, a guide tag by position id, or an interview entity tag by application id.
- NEVER add an entity tag to `getCriterionOptionsByPosition`, or forget `scorecards` in `getPositionSetupStatus`.
- NEVER expire `scorecards` without `positions`, nor add a guide invalidation to every scorecard save when no guide changed.
- NEVER forget `invalidateInterviewCache` on a kit save or autosave.
