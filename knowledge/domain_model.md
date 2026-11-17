---
title: "domain model"
tier: "MustHave"
keywords: ["domain model","entities","quiz","question","candidate","application","stage","assessment","position status","evaluation","preset","migration","business rules"]
intent: "Always: entities, relations, cascades and business rules (quiz save path, scorecard and interview guide, interviews with kits, live notes and interviewer scorecards, applications and their stage, the decision of an application with its matrix and score, assessment lifecycle, evaluation kinds and scores, access with no per-user filtering except unsubmitted interviewer material, Italian)."
editable: true
---
# Domain model and business rules

Prisma semantics and migrations are in the official docs. Only the rules the schema encodes are here.

## Aggregates

- `Position` owns one `Scorecard` (+ criteria), `InterviewGuide`s (+ sections, questions), `Quiz`es (+ question links).
- `Application` = one `Candidate` for one `Position`. Owns `Assessment`s (each one `Evaluation`) and `Interview`s.
- `Interview` = live conversation. Owns participants, one `InterviewKit` (its copy of the guide), interviewer scorecards.
- `InterviewKit` is a snapshot: after the copy the guide is never read again.
- `Evaluation` is polymorphic: assessment evaluation (`assessmentId` only) or resume evaluation (`candidateId` + `positionId`).
- `Question` is reusable and shared across quizzes. Order and criteria live on the `QuizQuestion` link.

## Access: no roles, no ownership filtering

- Every signed-in user reads and edits everything. NEVER add `where: { createdBy }` or any per-user filter.
- Only exception, and it is visibility, never ownership or permission: an interviewer's live notes and scorecard are visible to their author until submitted.
- Submission publishes and locks: a submitted scorecard, its criterion scores and its author's notes on that interview become read-only for everyone, author included. No action reopens.
- Independence views are arrangements, never filtered reads: submitted scorecards are returned to everyone and the UI collapses them ("Schede già inviate (n)"), and the Decision columns, overall score and must-warning lists stay closed behind "Per un giudizio indipendente, invia prima la tua scheda" while the participant has not submitted. Outcome and rationale stay usable.
- NEVER add role or permission checks. `requireUser()` only checks that a session exists.
- `Application.ownerId` = recruiter in charge, for the optional "Solo le mie" flag only. Dashboard-created application → session user; candidate edit → editor; public application → null. "Prendi in carico" sets, "Rilascia" clears.
- The "Solo i miei" Agenda filter and the "Solo le mie" home filter are view filters too (participant or owner for interviews, interviewer for scorecards to fill in).
- Candidates are not users: public routes only.

## Quiz and questions: one write path

- A quiz and its ordered questions are saved together, only by `upsertQuizAction` (with `quizId` updates, without it creates for `positionId`).
- `syncQuizQuestions(tx, quizId, questions, userId)` is the only writer of `QuizQuestion`; it MUST run in the quiz-save transaction. Links are recreated in array order.
- Existing `dbId` → question updated in place; any other question → created. Editing a `dbId` changes it in every quiz linking it; strip `dbId` to copy instead of share.
- A question dropped from the quiz is deleted only when not a favorite AND linked by no other quiz.
- Favorites are linked by putting them in the editor with their `dbId`; no dedicated action.
- `criterionIds` belong to the link, never to `Question`: the same question may verify different criteria in another quiz. Only `syncQuizQuestions` writes them, inside the transaction.
- Before the transaction `upsertQuizAction` validates ids: drop every id that is not a criterion of the position scorecard (active or archived); every remaining id MUST be active, unless the same quiz already cites it (an archived id may move within that quiz). Scope = whole quiz, not the single question.
- `duplicateQuizAction` checks no criteria: keeps `criterionIds` only on the same position, always drops `dbId` and `isFavorite`.

## AI generation never persists

- Generation actions (quiz, single question, scorecard criteria, guide, kit, decision challenge) only return a proposal, shown as unsaved changes.
- Nothing is stored until the user saves (`upsertQuizAction`, `saveScorecardAction`, `upsertInterviewGuideAction`, `saveInterviewKitAction`). The devil's advocate has no save at all.
- NEVER add a Prisma write or a cache invalidation to a generation action.

## Candidates and applications

- A candidate has 1–10 positions; every id MUST exist.
- No candidate state: no `Candidate.status`, no candidate badge, no `isPrimary`, no primary ordering. A candidate's situation is the stage of their furthest application. Only candidate flag: `doNotContact` (+ note), unrelated to any stage.
- An update sending `positionIds` is a diff, never a replace-all:
  - new id → `Application` in `applied`;
  - unchanged id → untouched, with everything recorded;
  - withdrawn id selected again → the same application reopens at `applied`, history kept; if not selected it stays withdrawn;
  - removed id → `withdrawn`, history kept, deleted only when it holds no evidence; its non-completed assessments and its `scheduled` interviews become `cancelled`; `in_progress` and `completed` interviews are never touched.
- Stages: `applied`, `screening`, `assessment`, `interview`, `decision`, `offer`, `hired`, `rejected`, `withdrawn`.
- Stage lives on the application; `stageChangedAt` updates with it. Automation only advances, never backwards, never on a closed application. The manual move goes from any stage to any stage, and reopens closed applications.
- Closed (`hired`, `rejected`, `withdrawn`) never changes automatically. The next-action card shows "Candidatura chiusa" and offers reopening only for `rejected` and `withdrawn`.
- Stale: open application whose stage has not changed for more than `STALE_APPLICATION_DAYS` (7). Decide with `isApplicationStale`; closed is never stale.
- Automatic advances, only from an earlier stage and never on a closed application: resume evaluation saved → `screening`; assessment created → `assessment`; interview scheduled → `interview` (same transaction as the interview and its kit); every scorecard submitted → `decision`.
- `allFeedbackSubmitted`: at least one completed interview, none scheduled or in progress, and every participant of every completed interview submitted. Cancelled and no-show interviews are ignored. Checked after a submission, a cancellation and a no-show.
- A resume evaluation is evidence of an application: it requires an existing application for that position (else 404), and its save advances the stage in the same transaction.
- Evidence = any assessment, any interview in any status, or a resume evaluation. Evidence blocks deletion of the application.
- A quiz is assignable only to a candidate whose application for that position is neither `rejected` nor `withdrawn`; the assessment is created on that application; missing and closed give the same error.
- Public apply matches the normalised email (lower case, trimmed). An existing email attaches the application to that candidate and refreshes the CV; a candidate already applied to that position gets a confirmation and nothing is created. The response is identical in every case. `Candidate.email` is unique.

## Position lifecycle

- `Position.status`: `draft`, `open`, `closed`. Only `open` appears in the public form, accepts public applications and feeds the dashboard selectors. `closed` keeps its applications and everything on them.
- A position with at least one application cannot be deleted; close it instead.
- Incomplete setup when lacking at least one of: scorecard with ≥1 active criterion, quiz, guide. `getPositionSetup` is the single rule (`missing` ordered scorecard → quiz → guide; all-archived criteria count as missing). The position checklist (every status) and "Le mie azioni" (`draft` and `open` only) both use it.

## Scorecard

- One per position, created by its first save. `saveScorecardAction` saves the whole list in one transaction; `order` = position in the list.
- Row with an active criterion `id` → updated (ids kept even when reordered); row with no `id` → created; an id that is not an active criterion of that scorecard → rejected before the transaction, never created.
- An active criterion missing from the list is archived when it has evidence, otherwise deleted. Archived: `archivedAt` set, stays cited, never modified nor restored. Deleting also strips its id from every guide question of the position in the same transaction.
- `criterionHasEvidence` is the only place deciding archive vs delete. Evidence, in order: a `criteriaAssessment` entry for the criterion in a CV evaluation of the position (score not inspected, any candidate of the position, test evaluations never count); a `CriterionScore` of a submitted or unsubmitted scorecard; a `KitItem` of an interview of the position; a hypothesis of a kit of the position (malformed JSON ignored). Every interview status counts.
- Archived criteria are never offered for a new link (AI proposal, quiz/guide generation, selectors, new CV evaluations), but stay visible wherever already cited, marked as archived.
- The editor opens with the five `DEFAULT_SOFT_CRITERIA` as unsaved rows whenever there are no active criteria; they stay unsaved until the user saves.
- Name, description and anchors stay editable. A weight change never touches `Application.decisionWeights`, so only undecided applications rescore.
- `weight` and `expectedLevel` are integers 1–5, relative, with no rule on the sum. At most 40 criteria, no minimum: an empty list is valid and archives or deletes every active criterion.
- Blank description → null; anchors always stored as three strings.

## Interview guides

- Position template, one per round by convention: `round` 1-based, not unique, editor proposes the next number. `durationMinutes` is the planned duration.
- `upsertInterviewGuideAction` saves guide, sections and questions together. `syncInterviewGuide` is the only writer and runs in the caller's transaction.
- Rows match by id inside their parent: known id under the same parent → updated; any other row → created; stored rows missing from the input → deleted (a deleted section cascades to its questions). A question submitted under another section gets a new id and its old row is deleted as a leftover. `order` = position in the list.
- Criteria must be active criteria of the position, except ids already cited anywhere on the same guide (whole-guide scope).
- Existing guide → position comes from the stored guide, the client `positionId` is ignored. Creating requires a position (schema refine).
- The guide is deletable; `Interview.guideId` becomes null and the interview and its kit stay whole. Editing or deleting a guide never touches an existing kit.
- Section minutes sum is displayed but never blocks the save.

## Interviews

- `Interview.status`: `scheduled`, `in_progress`, `completed`, `cancelled`, `no_show`. `INTERVIEW_TRANSITIONS` is the only source; nothing changes with the clock.
- `scheduled` → `in_progress` (start, `startedAt`) → `completed` (`endedAt`). Cancel and no-show only from `scheduled`. Any other transition is a `UserError`. No action deletes an interview.
- Reschedule only from `scheduled`: changes date, duration, call link and participants of the same interview, keeps the kit, increments `sequence`; guide and round never change.
- Scheduling is refused on `rejected`, `withdrawn` and `hired` applications. Guide mandatory and of the same position. Participants 1–10, all app users, exactly one lead. Past dates are allowed.
- A participant who already has notes or a scorecard cannot be removed.
- No email is sent: the summary and the `.ics` are shared by hand.

## Interview kits

- Born `draft` at scheduling as a copy of the guide: one section per section, one `template` item per question in the same order, default checklist. Copied criteria keep only active ones, so an archived criterion never appears on a new kit.
- Editable only while the interview is `scheduled`, with a single save (`saveInterviewKitAction`). The save never changes the status; "Segna come pronto" and "Riporta in bozza" only while scheduled.
- `syncKitItems` is the only writer of `KitItem` and never writes `covered`. Rows match by id inside the kit: no id → created with the proposal's origin, otherwise `manual` (never `template`); missing rows are deleted with their notes. `order` = position among the rows of the same section.
- An AI-origin row whose text, follow-ups or criteria change becomes `edited`; `template` and `manual` rows never become `edited`.
- Criteria of items and hypotheses: scorecard criteria only; archived allowed only when already on the same kit.
- Regeneration replaces only AI rows with `edited = false`; briefing and hypotheses are replaced; checklist suggestions are added when new (trimmed, lower case); missing sources are replaced.
- `LEGAL_REMINDER_TEXT` is fixed text: never generated, never stored.

## Live notes and interviewer scorecards

- Notes: participants only, while `scheduled` or `in_progress`, never after their own submission. One note per participant and item; only the fields present in the input are saved.
- "Coperta" is shared: any signed-in user, while the interview is scheduled or in progress.
- Scorecard: participants only; the interviewer is always the signed-in user.
- Saved as draft in every status except `cancelled` and `no_show`; submitted only when `completed` and with a recommendation; submission records `submittedAt` and locks (see Access).
- Scores are saved only for scored criteria that are active or cited by the kit.
- The page pre-fills from own notes only when no draft exists: score = rounded average of own scores on that criterion's questions; evidence = notes and quotes joined.

## Assessments

- The `token` is the candidate's only credential: candidate-facing actions look up by token and never call `requireUser()`.
- One per (candidate, quiz): `createPendingAssessment` skips an existing pair (application check, no DB constraint) and is the only creator.
- `pending` → `in_progress` (start, `startedAt`) → `completed` (`completedAt`, only through `closeAssessment`).
- `expired` is derived, never stored: running out of time ends as `completed` and the given answers count.
- NEVER compute expiry by hand. Use `assessmentState`, `acceptsAnswers` (60 s grace, `EXPIRY_GRACE_SECONDS`) and `getRemainingSeconds`.
- Answers are keyed by Question id: multiple choice = option index, code = `{ code }`, open and behavioral = text.

## Evaluations

- Two kinds: assessment evaluation (`assessmentId` only) and resume evaluation (`candidateId` + `positionId`).
- Uniqueness is an application check for both: one per assessment; one per candidate + position, existing application only.
- The quiz result is `Evaluation.quizScore`.
- Scales: per-answer 0–10 in `answerEvaluations`; `quizScore` 0–100 percentage; per-criterion 1–5 or null (resume only); AI `fitScore` 0–100 ALWAYS stored as `Math.round(fitScore / 10)`, i.e. 0–10, for both kinds.
- `answerEvaluations`: JSON keyed by Question id, `{ score, strengths, weaknesses }`, written with the assessment evaluation; may be null (no per-answer detail).
- "Ricalcola dettaglio risposte": the client re-evaluates every answer, discards and counts the failures (never a 0 fallback), then `recalculateAnswerEvaluationsAction` rewrites `answerEvaluations` only: no AI call, no change to `quizScore`, `fitScore`, `criteriaAssessment` or narrative.
- `criteriaAssessment` (resume only): JSON keyed by criterion id, `{ score: 1–5 | null, evidence }`; a null score means no evidence in the CV. The model answers `C1`, `C2`…; the save translates to ids, drops unknown and repeated keys, rounds and clamps to 1–5, keeps null. With at least one valid entry every skipped criterion is stored `{ score: null, evidence: "" }`; with no active criterion or no valid entry the field is null.
- Reading: invalid JSON → null; entry of a deleted criterion skipped; entry of an archived criterion kept and presented as archived. Resolve through the scorecard, active and archived, ordered by `order`.
- Assessment evaluations are reached through `assessment.candidateId`; filtering `Evaluation.candidateId` returns resume evaluations only.
- `recommendation` is AI free text; `hireRecommendation` is the interviewer scorecard's enum (`strong_yes`, `yes`, `maybe`, `no`, `strong_no`).
- `notes` ("Note manuali") is the only field of an evaluation the recruiter writes by hand. Interview notes are the live notes (`KitItemNote`) and the interviewer scorecard.
- The overall score is computed on read (`computeDecisionScore`), never stored.

## Decision

- Recorded only on the Decision page, in one transaction: `decision`, `decisionRationale`, `decidedBy` (session user), `decidedAt`, `decisionWeights`, plus the stage advance (`decision_recorded`, `stageChangedAt` when the stage really changes). `offer` and `hired` move only forward; `rejected` always closes.
- Rationale mandatory, 10–5000 characters after trim. A new decision overwrites the previous one.
- Refused on `hired`, `rejected` and `withdrawn`; allowed from every open stage, including `offer` again.
- Decided = `decidedAt` set. A decided application scores with `decisionWeights`; an undecided one with the scorecard's current weights.
- Matrix: one row per active criterion in `order`, plus every archived criterion with evidence on this application or present in `decisionWeights` (shown as archived). Ids of criteria that no longer exist are ignored everywhere.
- Scale: `toFivePointScale(value, max) = 1 + 4·value/max`, clamped to [1, 5], one decimal. `CriterionScore` and the per-criterion CV score are already 1–5; `answerEvaluations` (0–10), `fitScore` (0–10) and `quizScore` (0–100) are converted.
- CV per criterion: entry of the most recent resume evaluation for the same candidate and position; a null score is not evidence.
- Test per criterion: the most recent completed assessment that has an evaluation. Mean on 10 of the `answerEvaluations` of the answered questions citing the criterion, then converted. Exists only with `answerEvaluations` and at least one answered linked question.
- Interviewers: mean of every submitted `CriterionScore` for the criterion, across all rounds. Disagreement when there are ≥2 scores and max−min ≥ `DISAGREEMENT_GAP` (2).
- Value: mean of the available sources (CV, Test, interviewer mean). Evidence when at least one exists, otherwise "Nessuna prova".
- Overall: `Σ(weight·value)/Σ(weight)` over rows with evidence and weight > 0; null when none qualifies. Never stored.
- Global rows: CV from `fitScore` (0–10) without `criteriaAssessment`; Test from `quizScore` (0–100) without links or `answerEvaluations`. Never counted in the overall score.
- `decisionWeights` = `{ [criterionId]: weight }` for every matrix row at decision time. A criterion absent from the map is excluded; invalid JSON → null → current weights.
- Must criteria: `must` with no evidence (`no_evidence`) or below `expectedLevel` (`below_expected`) warns and never changes the score; `nice` never warns.
- The devil's advocate is read-only: never saved, never invalidates cache.
- Decision ≠ recommendation: `Application.decision` is the recruiter's outcome and moves the stage; `hireRecommendation` never moves it.

## Presets

- `Preset`: no relations. The client spreads a preset's fields as generation options; the server never loads a preset by id while generating. `questionType` accepts all four types.
- `seedDefaultPresetsAction` deletes ALL presets, user-created ones included, then recreates the defaults.

## Schema changes

- Prisma Migrate only. Every schema change is a versioned migration committed with the code that needs it.
- NEVER use `prisma db push`: it drops and recreates a renamed table and loses its rows.
- Renaming is `ALTER TABLE … RENAME` in the migration. A backfill is SQL in the same migration, before the removal of the columns it reads.
- The same migration runs on development then production; never copy a development database over production.

## Language

- All user-facing text is Italian: UI, toasts, `UserError`, custom Zod messages, AI content. Identifiers and JSON field names stay English. Kit proposal values are Italian too.
- An `Assessment` is called **Test** for recruiters and candidates. **Colloquio** names an `Interview` only, never an `Assessment` or a `Quiz`.

## Prohibitions

- NEVER write `QuizQuestion` outside `syncQuizQuestions` or its transaction.
- NEVER send the same `dbId` twice in one question array.
- NEVER store `expired`, discard answers of a timed-out assessment, or store AI `fitScore` without dividing by 10.
- NEVER read assessment evaluations by `Evaluation.candidateId`.
- NEVER rely on a DB constraint for "one assessment per candidate + quiz" or "one resume evaluation per candidate + position": both are application checks.
- NEVER treat a `positionIds` update as replace-all, or create a new application when a withdrawn position is selected again.
- NEVER reintroduce `Candidate.status`, `isPrimary`, primary ordering or a candidate status badge.
- NEVER delete a position that has applications, or delete the assessments of a withdrawn application instead of cancelling them; never keep its `scheduled` interviews or cancel its in-progress and completed ones.
- NEVER use `ownerId` to restrict access, or derive it from anything but the creating/editing user, "Prendi in carico" and "Rilascia".
- NEVER advance or reopen a closed application from an automatic rule.
- NEVER produce a resume evaluation without an application or outside the transaction that advances the stage.
- NEVER assign a quiz to a `rejected` or `withdrawn` application.
- NEVER confuse `Preset` with `ReferenceData`.
- NEVER filter by `createdBy`, call `requireUser()` in a candidate-facing action, hide submitted material behind the visibility exception, or leave a submitted scorecard editable.
- NEVER use `prisma db push`, or write `QuizQuestion` from the scorecard save.
- NEVER delete a criterion that has evidence instead of archiving it, or treat an archived criterion as editable, restorable or linkable.
- NEVER write `criterionIds` on `Question`, or count an unresolved criterion id as evidence.
- NEVER save an AI proposal without the user's confirmation, or create the default soft criteria as stored rows.
- NEVER block a guide save on the minutes sum, or expect a guide question moved between sections to keep its id.
- NEVER write `KitItem` outside `syncKitItems`, or write `covered` from the kit save.
- NEVER cache live notes or an unsubmitted scorecard, or take the interviewer from the input instead of the session.
- NEVER change a submitted scorecard, or name the interview `LiveInterview` (it is `Interview`; live mode uses `InterviewLiveSession`, `getInterviewLiveSession`, `InterviewLiveMode`).
- NEVER compute the overall score with fixed weights, or count the global CV/Test rows in it.
- NEVER use current weights for a decided application or saved weights for an undecided one.
- NEVER turn the collapsed Decision columns into a filtered read, or take `decidedBy` from the input.
- NEVER add hiring fields to a test evaluation: interviewer judgement lives in `InterviewerFeedback` and `CriterionScore`.
