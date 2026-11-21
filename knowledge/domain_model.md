---
title: "domain model"
tier: "MustHave"
keywords: ["domain model","entities","quiz","question","candidate","application","stage","assessment","position status","evaluation","preset","migration","business rules"]
intent: "Always: entities, relations, cascades and business rules (quiz save path, scorecard and interview guide, interviews with kits, live notes and interviewer scorecards, applications and their stage, the decision of an application with its matrix and score, assessment lifecycle, evaluation kinds and scores, access with no per-user filtering except unsubmitted interviewer material, user management for administrators only, accounts with no email, environments and the shared resume bucket, Italian)."
editable: true
---
# Domain model and business rules

## Aggregates

- `Application` = one `Candidate` for one `Position`; owns `Assessment`s (each one `Evaluation`) and `Interview`s.
- `InterviewKit` is a snapshot: after the copy the guide is never read again.
- `Evaluation` is polymorphic: assessment evaluation (`assessmentId` only) or resume evaluation (`candidateId` + `positionId`).
- `Question` is reusable and shared across quizzes; order and criteria live on the `QuizQuestion` link.

## Access: no ownership filtering, one admin-only area

- Every signed-in user reads and edits all selection data, whatever their role: NEVER add `where: { createdBy }` or any per-user filter. `requireUser()` only checks that a session exists.
- MCP tools follow the same rules: the user of the OAuth token is the signed-in user everywhere (author, owner "me", `decidedBy`, interviewer, visibility of unsubmitted material). OAuth scopes limit what one token may do, never a user or a role.
- Only visibility exception, never ownership or permission: an interviewer's live notes and scorecard are visible to their author until submitted. Submission publishes and locks: a submitted scorecard, its criterion scores and its author's notes on that interview become read-only for everyone, author included; no action reopens.
- Independence views are arrangements, never filtered reads: submitted scorecards are returned to everyone and the UI collapses them ("Schede già inviate (n)"), and the Decision columns, overall score and must-warning lists stay closed behind "Per un giudizio indipendente, invia prima la tua scheda" while the participant has not submitted. Outcome and rationale stay usable.
- `User.role` is `user` or `admin`. The only role check guards user management (creating users, editing them, their role, email verification, password, ban and sessions): its pages and actions check `admin` on the server, after the session check. Hiding the menu entry is presentation, never the guard.
- `Application.ownerId` = recruiter in charge, for the optional "Solo le mie" flag only: dashboard-created application → session user, candidate edit → editor, public application → null; "Prendi in carico" sets, "Rilascia" clears. The Agenda "Solo i miei" and the home "Solo le mie" filters are view filters on the same field.
- Candidates are not users: public routes only.

## Users and accounts

- Users are staff accounts. Public registration stays open; administrators can also create users.
- The app sends no email of any kind, so sign-in cannot wait for a verification link: a new account cannot sign in until an administrator switches its email verification on from user management. A forgotten password is reset by an administrator.
- At least one active administrator always exists: the last non-banned `admin` can neither lose the role nor be banned. An administrator never bans themself; nobody changes their own role or their own email verification.
- Users are never deleted (they author positions, applications, decisions and scorecards): an administrator bans them instead. A ban carries a reason, ends the user's sessions, and unbanning restores access. Banned users are never offered as interview participants.
- An MCP OAuth token is issued only to an account that can sign in (email verification on, not banned); a ban also ends its tokens.

## Quiz and questions: one write path

- A quiz and its ordered questions are saved together, only by `upsertQuizAction` (with `quizId` updates, without it creates for `positionId`).
- No quiz draft state: an MCP tool saves a normal quiz through the same path.
- `syncQuizQuestions(tx, quizId, questions, userId)` is the only writer of `QuizQuestion` and MUST run in the quiz-save transaction; links are recreated in array order.
- Existing `dbId` → question updated in place, any other question → created. Editing a `dbId` changes it in every quiz linking it; strip `dbId` to copy instead of share. A question dropped from the quiz is deleted only when not a favorite AND linked by no other quiz.
- Favorites are linked by putting them in the editor with their `dbId`; no dedicated action.
- `criterionIds` belong to the link, never to `Question`: the same question may verify different criteria in another quiz, and only `syncQuizQuestions` writes them.
- Before the transaction `upsertQuizAction` drops every id that is not a criterion of the position scorecard (active or archived); every remaining id MUST be active unless the same quiz already cites it. Scope = whole quiz, not the single question.
- `duplicateQuizAction` checks no criteria: keeps `criterionIds` only on the same position, always drops `dbId` and `isFavorite`.

## AI generation never persists

- Generation actions (quiz, single question, scorecard criteria, guide, kit, decision challenge) only return a proposal, shown as unsaved changes; nothing is stored until the user saves. The devil's advocate has no save at all.
- Content Claude writes through an MCP tool is user input, not a generation action: it is saved through the same write path and shared schema as the dashboard save.

## Candidates and applications

- A candidate has 1–10 positions; every id MUST exist.
- No candidate state: no `Candidate.status`, badge, `isPrimary` or primary ordering. A candidate's situation is the stage of their furthest application. Only candidate flag: `doNotContact` (+ note), unrelated to any stage.
- An update sending `positionIds` is a diff, never a replace-all:
  - new id → `Application` in `applied`;
  - unchanged id → untouched, with everything recorded;
  - withdrawn id selected again → the same application reopens at `applied`, history kept; if not selected it stays withdrawn;
  - removed id → `withdrawn`, history kept, deleted only when it holds no evidence; its non-completed assessments and its `scheduled` interviews become `cancelled`; `in_progress` and `completed` interviews are never touched.
- Stages: `applied`, `screening`, `assessment`, `interview`, `decision`, `offer`, `hired`, `rejected`, `withdrawn`. Stage lives on the application; `stageChangedAt` updates with it.
- Automation only advances, never backwards, never on a closed application: resume evaluation saved → `screening`; assessment created → `assessment`; interview scheduled → `interview` (same transaction as the interview and its kit); every scorecard submitted → `decision`. The manual move goes from any stage to any stage and reopens closed applications.
- Closed (`hired`, `rejected`, `withdrawn`) never changes automatically. The next-action card shows "Candidatura chiusa" and offers reopening only for `rejected` and `withdrawn`.
- Stale: an open application whose stage has not changed for more than `STALE_APPLICATION_DAYS` (7); decide with `isApplicationStale`, closed is never stale.
- `allFeedbackSubmitted`: at least one completed interview, none scheduled or in progress, and every participant of every completed interview submitted. Cancelled and no-show interviews are ignored. Checked after a submission, a cancellation and a no-show.
- A resume evaluation is evidence of an application: it requires an existing application for that position (else 404) and its save advances the stage in the same transaction.
- Evidence = any assessment, any interview in any status, or a resume evaluation; it blocks deletion of the application.
- A quiz is assignable only to a candidate whose application for that position is neither `rejected` nor `withdrawn`; the assessment is created on that application; missing and closed give the same error.
- Public apply matches the normalised email (lower case, trimmed): an existing email attaches the application to that candidate and refreshes the CV, and a candidate already applied to that position gets a confirmation with nothing created; the response is identical in every case. `Candidate.email` is unique.

## Position lifecycle

- `Position.status`: `draft`, `open`, `closed`. Only `open` appears in the public form, accepts public applications and feeds the dashboard selectors; `closed` keeps its applications and everything on them.
- A position with at least one application cannot be deleted; close it instead.
- Incomplete setup when lacking at least one of: scorecard with ≥1 active criterion, quiz, guide. `getPositionSetup` is the single rule (`missing` ordered scorecard → quiz → guide; all-archived criteria count as missing); the position checklist (every status) and "Le mie azioni" (`draft` and `open` only) both use it.

## Scorecard

- One per position, created by its first save. `saveScorecardAction` saves the whole list in one transaction; `order` = position in the list.
- Row with an active criterion `id` → updated (ids kept even when reordered); row with no `id` → created; an id that is not an active criterion of that scorecard → rejected before the transaction, never created.
- An active criterion missing from the list is archived when it has evidence, otherwise deleted. Archived: `archivedAt` set, stays cited, never modified nor restored. Deleting also strips its id from every guide question of the position in the same transaction.
- `criterionHasEvidence` is the only place deciding archive vs delete. Evidence, in order: a `criteriaAssessment` entry for the criterion in a CV evaluation of the position (score not inspected, any candidate of the position, test evaluations never count); a `CriterionScore` of a submitted or unsubmitted scorecard; a `KitItem` of an interview of the position; a hypothesis of a kit of the position (malformed JSON ignored). Every interview status counts.
- Archived criteria are never offered for a new link (AI proposal, quiz/guide generation, selectors, new CV evaluations) but stay visible wherever already cited, marked as archived.
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
- The guide is deletable: `Interview.guideId` becomes null and the interview and its kit stay whole. Editing or deleting a guide never touches an existing kit.
- The section minutes sum is displayed but never blocks the save.

## Interviews

- `INTERVIEW_TRANSITIONS` is the only source of status change; nothing changes with the clock. `scheduled` → `in_progress` (start, `startedAt`) → `completed` (`endedAt`); cancel and no-show only from `scheduled`; any other transition is a `UserError`. No action deletes an interview.
- Reschedule only from `scheduled`: changes date, duration, call link and participants of the same interview, keeps the kit, increments `sequence`; guide and round never change.
- Scheduling is refused on `rejected`, `withdrawn` and `hired` applications. Guide mandatory and of the same position. Participants 1–10, all app users, exactly one lead. Past dates are allowed.
- A participant who already has notes or a scorecard cannot be removed.
- No email is sent: the summary and the `.ics` are shared by hand.

## Interview kits

- Born `draft` at scheduling as a copy of the guide: one section per section, one `template` item per question in the same order, default checklist. Copied criteria keep only active ones.
- Editable only while the interview is `scheduled`, with a single save (`saveInterviewKitAction`); the save never changes the status. "Segna come pronto" and "Riporta in bozza" only while scheduled.
- `syncKitItems` is the only writer of `KitItem` and never writes `covered`. Rows match by id inside the kit: no id → created with the proposal's origin, otherwise `manual` (never `template`); missing rows are deleted with their notes. `order` = position among the rows of the same section.
- An AI-origin row whose text, follow-ups or criteria change becomes `edited`; `template` and `manual` rows never become `edited`.
- Criteria of items and hypotheses: scorecard criteria only; archived allowed only when already on the same kit.
- Regeneration replaces only AI rows with `edited = false`; briefing and hypotheses are replaced; checklist suggestions are added when new (trimmed, lower case); missing sources are replaced.

## Live notes and interviewer scorecards

- Notes: participants only, while `scheduled` or `in_progress`, never after their own submission. One note per participant and item; only the fields present in the input are saved.
- "Coperta" is shared: any signed-in user, while the interview is scheduled or in progress.
- Scorecard: participants only; the interviewer is always the signed-in user.
- Saved as draft in every status except `cancelled` and `no_show`; submitted only when `completed` and with a recommendation, recording `submittedAt` and locking (see Access).
- Scores are saved only for scored criteria that are active or cited by the kit.
- The page pre-fills from own notes only when no draft exists: score = rounded average of own scores on that criterion's questions; evidence = notes and quotes joined.

## Assessments

- The `token` is the candidate's only credential: candidate-facing actions look up by token and never call `requireUser()`.
- One per (candidate, quiz): `createPendingAssessment` skips an existing pair (application check, no DB constraint) and is the only creator.
- `pending` → `in_progress` (start, `startedAt`) → `completed` (`completedAt`, only through `closeAssessment`). `expired` is derived, never stored: running out of time ends as `completed` and the given answers count.
- NEVER compute expiry by hand. Use `assessmentState`, `acceptsAnswers` (60 s grace, `EXPIRY_GRACE_SECONDS`) and `getRemainingSeconds`.
- Answers are keyed by Question id: multiple choice = option index, code = `{ code }`, open and behavioral = text.

## Evaluations

- Two kinds, each unique by application check: one per assessment; one per candidate + position, existing application only.
- The quiz result is `Evaluation.quizScore`.
- Scales: per-answer 0–10 in `answerEvaluations`; `quizScore` 0–100 percentage; per-criterion 1–5 or null (resume only); AI `fitScore` 0–100 ALWAYS stored as `Math.round(fitScore / 10)`, i.e. 0–10, both kinds.
- `answerEvaluations`: JSON keyed by Question id, `{ score, strengths, weaknesses }`, written with the assessment evaluation; may be null (no per-answer detail).
- `criteriaAssessment` (resume only): JSON keyed by criterion id, `{ score: 1–5 | null, evidence }`; a null score means no evidence in the CV. The model answers `C1`, `C2`…; the save translates to ids, drops unknown and repeated keys, rounds and clamps to 1–5, keeps null. With at least one valid entry every skipped criterion is stored `{ score: null, evidence: "" }`; with no active criterion or no valid entry the field is null.
- Reading: invalid JSON → null; entry of a deleted criterion skipped; entry of an archived criterion kept and presented as archived. Resolve through the scorecard, active and archived, ordered by `order`.
- `recommendation` is AI free text; `hireRecommendation` is the interviewer scorecard's enum (`strong_yes`, `yes`, `maybe`, `no`, `strong_no`).
- `notes` ("Note manuali") is the only field of an evaluation the recruiter writes by hand.
- The overall score is computed on read (`computeDecisionScore`), never stored.

## Decision

- Recorded only on the Decision page, in one transaction: `decision`, `decisionRationale`, `decidedBy` (session user), `decidedAt`, `decisionWeights`, plus the stage advance (`decision_recorded`, `stageChangedAt` when the stage really changes). `offer` and `hired` move only forward; `rejected` always closes.
- Rationale mandatory, 10–5000 characters after trim. A new decision overwrites the previous one.
- Refused on `hired`, `rejected` and `withdrawn`; allowed from every open stage, including `offer` again.
- Decided = `decidedAt` set: a decided application scores with `decisionWeights`, an undecided one with the scorecard's current weights.
- Matrix: one row per active criterion in `order`, plus every archived criterion with evidence on this application or present in `decisionWeights` (shown as archived). Ids of criteria that no longer exist are ignored everywhere.
- Scale: `toFivePointScale(value, max) = 1 + 4·value/max`, clamped to [1, 5], one decimal. `CriterionScore` and the per-criterion CV score are already 1–5; `answerEvaluations` (0–10), `fitScore` (0–10) and `quizScore` (0–100) are converted.
- CV per criterion: entry of the most recent resume evaluation for the same candidate and position; a null score is not evidence.
- Test per criterion: the most recent completed assessment that has an evaluation. Mean on 10 of the `answerEvaluations` of the answered questions citing the criterion, then converted. Exists only with `answerEvaluations` and at least one answered linked question.
- Interviewers: mean of every submitted `CriterionScore` for the criterion, across all rounds. Disagreement when there are ≥2 scores and max−min ≥ `DISAGREEMENT_GAP` (2).
- Value: mean of the available sources (CV, Test, interviewer mean). Evidence when at least one exists, otherwise "Nessuna prova".
- Overall: `Σ(weight·value)/Σ(weight)` over rows with evidence and weight > 0; null when none qualifies.
- Global rows: CV from `fitScore` (0–10) without `criteriaAssessment`; Test from `quizScore` (0–100) without links or `answerEvaluations`. Never counted in the overall score.
- `decisionWeights` = `{ [criterionId]: weight }` for every matrix row at decision time; a criterion absent from the map is excluded, invalid JSON → null → current weights.
- Must criteria: `must` with no evidence (`no_evidence`) or below `expectedLevel` (`below_expected`) warns and never changes the score; `nice` never warns.
- The devil's advocate is read-only: never saved, never invalidates cache.
- Decision ≠ recommendation: `Application.decision` is the recruiter's outcome and moves the stage; `hireRecommendation` never moves it.

## Presets

- `Preset`: no relations. The client spreads its fields as generation options; the server never loads a preset by id while generating. `questionType` accepts all four types.
- `seedDefaultPresetsAction` deletes ALL presets, user-created ones included, then recreates the defaults.

## Schema changes

- Prisma Migrate only: every schema change is a versioned migration committed with the code that needs it. NEVER `prisma db push` (it drops and recreates a renamed table and loses its rows).
- Renaming is `ALTER TABLE … RENAME` in the migration. A backfill is SQL in the same migration, before the removal of the columns it reads.
- The same migration runs on development then production; never copy a development database over production.

## Environments and storage

- One Neon database with two branches: `production` and `development`. Locally `DATABASE_URL` in `.env.local` points to `development`; production variables live in the hosting project settings.
- Next.js loads the env files itself. The Prisma CLI and the seed load `.env.local`, then `.env`, through the Prisma env loader, and never overwrite a value already set, so `.env.local` wins.
- Resumes (CV) live in one Cloudflare R2 bucket (`R2_BUCKET_NAME`) shared by both environments. Key `resumes/{candidateId}/{timestamp}.{ext}`; `Candidate.resumeUrl` stores the public URL and the key is recovered from it.
- The R2 object is deleted when its candidate is deleted and when the CV is replaced. A missing object is ignored; a failed delete is logged and never blocks the database change.
- A `development` branch created from production holds production rows, `resumeUrl` included: deleting such a candidate, or replacing its CV, in development deletes the production file.

## Language

- All user-facing text is Italian: UI, toasts, `UserError`, custom Zod messages, AI content. Identifiers and JSON field names stay English.
- An `Assessment` is called **Test** for recruiters and candidates. **Colloquio** names an `Interview` only, never an `Assessment` or a `Quiz`.

## Prohibitions

- NEVER send the same `dbId` twice in one question array.
- NEVER read assessment evaluations by `Evaluation.candidateId`: that filter returns resume evaluations only.
- NEVER name the interview `LiveInterview` (it is `Interview`; live mode uses `InterviewLiveSession`, `getInterviewLiveSession`, `InterviewLiveMode`).
- NEVER confuse `Preset` with `ReferenceData`.
- NEVER delete a candidate, or replace a CV, copied from production while working on `development`: test with candidates created there.
