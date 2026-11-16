---
title: "cache invalidation"
tier: "PerContext"
keywords: ["cache","use cache","cacheTag","invalidate","CacheTags","entityTag","data layer"]
intent: "When adding or changing a cached read in the data layer or any mutation that must invalidate cache (including interviews, kits and interviewer scorecards), or passing server data to client components."
editable: true
---
# Cache tagging and invalidation

Cache Components and Partial Prefetching are on. The framework itself is NOT restated here: what `"use cache"`, `cacheLife`, `cacheTag`, `updateTag` and `revalidateTag` do and where each may be called, which request APIs are allowed inside a cached scope, what may run during prerender, and how to hand promises or server components to client components. Ask next-devtools MCP or context7 for the installed Next.js version. This document holds only this project's rules, so a library upgrade never makes it stale.

## Where caching lives

- `"use cache"` is used only in the data layer functions (one module per entity). Pages and server components call those functions; they never call Prisma.
- Every cached read sets `cacheLife("hours")`, or `cacheLife("minutes")` for short-lived data. No other profile and no custom profiles.
- Four reads are uncached on purpose: `getProfile` (depends on the session), `getAssessmentByToken` (live assessment state while the candidate answers), `getInterviewLiveSession` and `getInterviewFeedbackPage` (they depend on the session and must return the current live notes and scorecards). Follow the same choice for any session-dependent or live read.
- The live and scorecard pages call `await connection()` before reading the session.
- The live mode calls `router.refresh()` every 15 seconds while the interview is in progress and the browser tab is visible.
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
| `SCORECARDS` = `scorecards` | `entityTag.scorecard(positionId)` → `scorecard-{positionId}` |
| `INTERVIEW_GUIDES` = `interview-guides` | `entityTag.interviewGuide(id)` → `interview-guide-{id}` |
| `INTERVIEWS` = `interviews` | `entityTag.interview(id)` → `interview-{id}` |

`entityTag` is an object of functions; the separator is always `-`.

- `entityTag.scorecard` takes a POSITION id, not a scorecard id: a position has at most one scorecard, so the position is the key for both the scorecard and its criteria.
- `entityTag.interviewGuide` takes the guide id, never the position id and never the id of a section.
- Criteria have no tag of their own: `scorecards` covers them. Sections and questions of a guide have no tag of their own: `interview-guides` covers them. A quiz-criterion link is covered by `quizzes` + `questions`, like the whole `QuizQuestion` link.
- `interviews` covers interviews, participants, kits, sections, items and submitted interviewer scorecards. Live notes and unsubmitted scorecards are never in a cached read.

There is no tag for `User`. Cached application reads include the owner's name (`owner: { select: { id: true, name: true } }`) but carry only the tags of the entities they join and of the collections they read. A user rename therefore does not refresh those reads until another tag or the `cacheLife` window expires; this is accepted, not compensated with a new tag. `getUserOptions` is the same choice: it has `cacheLife("minutes")` and no tag, so a new colleague appears within a few minutes.

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

The reads that carry the new tags, with the dependency each one adds:

- `getScorecardByPositionId` tags `scorecards`, `positions` and `entityTag.scorecard(positionId)`: it reads the scorecard and its criteria, and the position is the key. It is also the source of the criterion names for the quiz view, the quiz form, the guide editor and a new guide page.
- `getCriterionOptionsByPosition` tags `scorecards` only: it walks the criteria of every position, so no entity tag and no `positions` apply.
- `getPositionSetupStatus` tags `positions`, `scorecards`, `quizzes`, `interview-guides` and `entityTag.position(positionId)`: it reads the position with the counts of quizzes, guides and active criteria. Without `scorecards` the checklist would not follow a criterion change.
- `getApplicationDetail` tags the candidate, position, assessment, evaluation and quiz collections plus `scorecards` and `interviews`: the criterion names come from the scorecard, and the application page shows its interviews.
- `getActionCenterData` tags the candidate, position, assessment, evaluation and quiz collections plus `scorecards`, `interview-guides` and `interviews`: it reads the same counts as the setup rule and the interviews without a kit.
- `getInterviewGuidesByPosition` tags `interview-guides`, `positions` and `entityTag.position(positionId)`, never a guide entity tag: the read lists several guides and the position is the filter.
- `getInterviewGuideById` tags `interview-guides` and `entityTag.interviewGuide(guideId)`: it targets one guide.
- `getInterviewsByApplication` tags `interviews`, `candidates`, `positions` and `interview-guides`: the application's interviews with their participants, kits and guides.
- `getInterviewForPreparation` adds `scorecards` and `entityTag.interview(interviewId)`: it targets one interview and reads its criteria.
- `getAgendaInterviews` uses `cacheLife("minutes")` and tags `interviews`, `candidates` and `positions`: the agenda lists interviews across applications.

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
| `invalidateScorecardCache({ positionId })` | `scorecards` and `scorecard-{positionId}` | `positionId` required; revalidates `/dashboard/positions/{id}`, `/dashboard/positions/{id}/scorecard` and `/dashboard`. It does not expire `positions` nor the position entity tag, and does not revalidate `/dashboard/positions` |
| `invalidateInterviewGuideCache({ guideId?, positionId })` | `interview-guides`, and `interview-guide-{id}` when `guideId` is given | `positionId` required; revalidates `/dashboard/positions/{id}`, `/dashboard/positions/{id}/guides/{guideId}` when `guideId` is given, and `/dashboard`. It never revalidates `/dashboard/positions/{id}/guides/new` |
| `invalidateInterviewCache({ interviewId?, applicationId })` | `interviews`, and `interview-{id}` when `interviewId` is given | `applicationId` required; revalidates `/dashboard/applications/{applicationId}`, `/dashboard/agenda` and `/dashboard`; with `interviewId` it also revalidates `…/interviews/{interviewId}/prepare`, `/live` and `/feedback` |

Server actions use the standard helper; a route handler uses the `…InRouteHandler` variant. Why the two cannot be swapped is framework behaviour: see the docs named above. The two scorecard and guide helpers and the interview helper are server-action only.

Who calls the new helpers:

- `saveScorecardAction` always calls `invalidateScorecardCache({ positionId })`. It calls `invalidateInterviewGuideCache({ positionId })` only when the save really removed a deleted criterion from at least one guide question; otherwise nothing in the guides changed.
- `upsertInterviewGuideAction` calls `invalidateInterviewGuideCache({ guideId, positionId })` after the transaction, on creation and on update.
- `deleteInterviewGuideAction` calls `invalidateInterviewGuideCache({ guideId, positionId })` after the delete and before redirecting.
- `deletePositionAction` calls neither: `invalidatePositionCache(id, { deleted: true })` expires `scorecards`, `interview-guides` and `interviews` through `CASCADE_ON_DELETE`.
- Every interview, kit and scorecard action calls `invalidateInterviewCache`. When the application stage changes too (scheduling, submitting the last scorecard, cancellation, no-show) the action also calls `invalidateCandidateCache`. `moveApplicationStageAction` and `updateCandidateAction` call `invalidateInterviewCache` when the withdrawal cancelled interviews.

## Deletes and database cascades

A delete (including `deleteMany`) of a Position, Quiz, Candidate or Assessment MUST pass `deleted: true`, so the helper also expires the collections whose rows the database removed by cascade (`CASCADE_ON_DELETE`):

| Deleted | Also expires |
|---|---|
| position | quizzes, assessments, evaluations, candidates, behavioral-rubrics, scorecards, interview-guides, interviews |
| quiz | assessments, evaluations |
| candidate | assessments, evaluations, behavioral-rubrics, interviews |
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

Every other server call from the client is a server action. Every route handler except the two auth ones MUST call `requireUser()`. The per-criterion part of the resume evaluation travels in the existing stream: no route handler was added for the scorecard, the criteria, the guides, the interviews or the kits.

## Ids of deleted criteria on quiz links

The scorecard save never writes `QuizQuestion`, so the id of a deleted criterion can stay on an existing quiz link until that quiz is saved again, and `duplicateQuizAction` can even copy it to a duplicate that stays on the same position. Therefore:

- The authoritative cleanup is server-side: every save of a quiz drops the unknown ids before the transaction, so a client can never persist one.
- Every reader MUST resolve criterion ids through the scorecard, active and archived criteria alike, and ignore the ids it does not find. This covers the quiz view, the quiz form, the CV per-criterion assessment, the interview kit and the interviewer scorecard.
- The guide editor is the exception that proves the rule: it keeps an id it cannot resolve in the form, labelled as an archived criterion, and the guide save accepts it because it is already stored on that guide.

## Common mistakes

- Adding an `include`/`select` relation to a cached read without adding that entity's collection tag.
- Writing tags as literals, with `:` as separator, or `position-{id}` instead of `positions-{id}`.
- Calling `updateTag`/`revalidatePath` directly, or `invalidateEvaluationCache` inside a route handler.
- Deleting without `deleted: true`, leaving cascaded rows in cached lists and counts.
- Updating a candidate's positions and passing only the added position ids: a removed position also changes the cache.
- Writing to an application without passing its id, so `/dashboard/applications/{id}` stays stale, or using the action variant inside a route handler.
- Caching session-dependent data, or calling `requireUser()`/`getCurrentUser()` inside `"use cache"`.
- Caching live notes or an unsubmitted interviewer scorecard, or reading the session in a server component without first awaiting `connection()` or `searchParams`.
- Redirecting from the email verification route to a caller-supplied URL without the same-origin check.
- Keying a scorecard tag by the scorecard id instead of the position id, a guide tag by the position id, or an interview entity tag by the application id.
- Adding an entity tag to `getCriterionOptionsByPosition`, or forgetting `scorecards` in `getPositionSetupStatus`.
- Expiring `scorecards` without `positions`, hiding the scorecard from the position page, or adding an `interview-guides` invalidation to every scorecard save when no guide changed.
- Calling `invalidateScorecardCache`, `invalidateInterviewGuideCache` or `invalidateInterviewCache` from a route handler.
- Forgetting `invalidateInterviewCache` on a kit save or autosave, so the live page and the preparation page keep the old kit.
