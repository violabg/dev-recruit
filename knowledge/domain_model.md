---
title: "domain model"
tier: "MustHave"
keywords: ["domain model","entities","quiz","question","candidate","application","stage","assessment","position status","evaluation","preset","migration","business rules"]
intent: "Always: entities, relations, cascades and business rules (quiz save path, scorecard and interview guide, applications and their stage, assessment lifecycle, evaluation kinds and scores, access with no per-user filtering except unsubmitted interviewer material, Italian)."
editable: true
---
# Domain model and business rules

Prisma Client API semantics and migration behaviour are in the official docs (context7) and are not restated here; this document holds only the domain rules the schema encodes.

## Entities and relations

| Entity | Purpose | Key fields / constraints | Deleting it removes |
|---|---|---|---|
| `Position` | A job opening | `title`, `description?`, `experienceLevel` and `contractType` (free strings from reference data), `skills[]`, `softSkills[]`, `status` (`draft`, `open`, `closed`) | Allowed only when the position has no application. Then: its scorecard (with its criteria), its interview guides (with their sections and questions), its quizzes, its behavioral rubrics. Resume evaluations keep the row with `positionId` set to null |
| `Scorecard` | The evaluation scorecard of a Position ("Scheda di valutazione") | `positionId` (unique: at most one per position), `createdBy` | its criteria |
| `ScorecardCriterion` | One criterion of a scorecard | `name`, `description?`, `category`, `priority`, `weight` 1–5, `expectedLevel` 1–5, `anchors` (JSON `{ weak, medium, strong }`), `source`, `order`, `archivedAt?` | — (deleted with its scorecard) |
| `Quiz` | Reusable ordered set of questions for exactly one Position | `positionId` (required), `timeLimit?` in minutes (5–120, null = no limit) | its `QuizQuestion` links and its assessments (and their evaluations). The `Question` rows are NOT deleted |
| `Question` | Reusable question row | `type` (`QuestionType`), `question`, type-specific fields, `isFavorite` | its `QuizQuestion` links in every quiz |
| `QuizQuestion` | Quiz ↔ Question link with `order` (0-based) and `criterionIds` (default `[]`) | unique (`quizId`, `questionId`): a question appears at most once per quiz | — |
| `InterviewGuide` | An interview template of a Position | `positionId` (required, not unique: several per position), `title`, `round` (1-based), `durationMinutes`, `createdBy` | its sections (and their questions) |
| `GuideSection` | An ordered part of a guide | `title`, `minutes`, `order`, `kind` (`GuideSectionKind`) | its questions |
| `GuideQuestion` | A question of a guide section | `text`, `followUps[]`, `criterionIds[]`, `anchors`, `required`, `order` | — (deleted with its section) |
| `Candidate` | A person applying; never signs in | `firstName`, `lastName`, `email` (unique, compared in lower case and without spaces), `dateOfBirth?` (18+), `resumeUrl?`, `doNotContact`, `doNotContactNote?`, `createdBy?` (null when self-applied) | its applications, assessments, evaluations, rubrics |
| `Application` | A candidacy: one Candidate for one Position | unique (`candidateId`, `positionId`), `stage` (`ApplicationStage`), `stageChangedAt`, `ownerId?` (the recruiter in charge), and the closing decision: `decision?`, `decisionRationale?`, `decidedBy?` (the deciding user, `onDelete: SetNull`), `decidedAt?`, `decisionWeights?` (JSON) | its assessments (and their evaluations). An application is deleted only when it holds no evidence: no assessment, evaluation or conversation |
| `Assessment` | One Candidate taking one Quiz, inside one Application | `applicationId` (required), `token` (unique), `status` (`AssessmentStatus`), `startedAt?`, `completedAt?`, `answers` (JSON keyed by Question id) | its evaluation |
| `Evaluation` | AI assessment, two kinds (see Evaluations) | `assessmentId?` (unique), `candidateId?`, `positionId?`, `fitScore`, `quizScore?`, `answerEvaluations?`, `criteriaAssessment?`, hiring fields | — |
| `BehavioralRubric` | Recruiter's manual soft-skill scores | unique (`candidateId`, `positionId`), four required scores 1–5, `leadershipScore?` | — |
| `Preset` | Recipe for generating one AI question | unique `name`, `questionType`, tuning fields, `difficulty` 1–5 | — (no relations) |
| `ReferenceData` | Pick-list values for forms and filters | unique (`category`, `label`), `isActive`, `order` | — (values are copied as strings, no FK) |

the quiz result lives in `Evaluation.quizScore`.

## Access: no ownership filtering, no roles

Every signed-in user sees and edits every entity, with one deliberate exception: the notes and the scorecard an interviewer writes during an interview stay visible only to that interviewer until they are submitted.

- NEVER add `where: { createdBy: user.id }` or any per-user filter to a read or a mutation, with that single exception: unsubmitted interviewer notes and the unsubmitted interviewer scorecard are filtered to their author, and to nobody else.
- The exception is about visibility, never about ownership or permission: each interviewer sees only their own material until their own submission, submitting is the only thing that publishes it, and from then on every signed-in user sees and edits it like any other entity. It never hides a submitted scorecard, never lets one interviewer read or change another's unsubmitted material, and never becomes a role.
- NEVER add role or permission checks. `requireUser()` only checks that a session exists.
- `Application.ownerId` names the recruiter in charge. It may feed a view filter the user can switch off ("Solo le mie"); it never limits what a user can open or edit.
  - Creating an application from the dashboard makes the signed-in user the owner.
  - Applications added by editing a candidate's positions take the user who performs the edit as owner.
  - A public application has no owner (`createdBy: null`).
  - "Prendi in carico" sets the current user as owner, "Rilascia" clears it (`owner: "me" | "none"`), and the filter is labelled "Solo le mie".
- Candidates are not users: they reach the public apply page and the assessment page through public routes only.

## Quiz and questions: one write path

- A quiz and its ordered questions are saved together, only by `upsertQuizAction` (with `quizId` it updates, without it it creates a quiz for `positionId`).
- `syncQuizQuestions(tx, quizId, questions, userId)` is the only writer of `QuizQuestion`. It MUST run inside the same `prisma.$transaction` as the quiz write.
- A question with a `dbId` that still exists is updated in place. Any other question is created. Links are recreated in array order.
- A question dropped from the quiz is deleted only when it is not a favorite AND no other quiz links it.
- `dbId` means "this exact Question row": a favorite reused in several quizzes, or an AI-regenerated question that keeps its `dbId`, is updated for every quiz that links it. To copy instead of share, strip `dbId` (as `duplicateQuizAction` does, together with `isFavorite`).
- Favorites are added to a quiz by putting them in the editor with their `dbId`; saving links them. No dedicated action is needed.
- The criteria a question verifies are `criterionIds` on the link, never on `Question`: the same question can verify different criteria in another quiz. `syncQuizQuestions` is the only place that writes them, together with the link; before the transaction `upsertQuizAction` checks them, so a criterion id sent by a client is always validated server-side.
- The check first drops every id that is not a criterion of the position scorecard, active or archived (a deleted criterion). Every id that remains must be an active criterion, unless it is already stored on a link of the same quiz: an archived criterion already cited by that quiz may move to another question of it. The scope is the whole quiz, not the single question. A violation is `UserError("Uno o più criteri selezionati non appartengono alla scheda della posizione")`; the check runs before the transaction, which only writes.
- `duplicateQuizAction` performs no criterion check: it keeps `criterionIds` only when the copy stays on the same position and drops them otherwise, so a copy on another position starts with empty lists. `dbId` and `isFavorite` are always dropped, so every question of a duplicate is a new row.

```ts
// syncQuizQuestions, after removing this quiz's old links and the dropped questions
for (const [order, question] of questions.entries()) {
  // existing dbId -> tx.question.update(prepareQuestionForUpdate(question))
  // otherwise     -> tx.question.create(prepareQuestionForCreate(question, userId))
  await tx.quizQuestion.create({
    data: { quizId, questionId, order, criterionIds: question.criterionIds ?? [] },
  });
}
```

## AI generation never persists

`generateNewQuizAction`, `generateNewQuestionAction`, `generateScorecardCriteriaAction` and `generateInterviewGuideAction` only return a proposal. The editor shows it as unsaved changes; nothing is stored until the user presses Save, which calls `upsertQuizAction`, `saveScorecardAction` or `upsertInterviewGuideAction`. The criteria proposed for the questions of a generated quiz are stored only with the quiz. NEVER add Prisma writes or cache invalidation to generation actions.

## Candidates and applications

- A candidate has 1 to 10 positions; every id MUST exist, otherwise `UserError("Una o più posizioni selezionate non sono valide")`.
- The candidate holds no state of its own: no `Candidate.status`, no candidate status badge. A candidate's situation is the stage of their application, and lists show the stage of their furthest application.
- No position is primary. There is no `isPrimary` flag and no "Primaria" badge, and no read orders applications by a primary flag.
- An update that sends `positionIds` is a diff, never a replace-all:
  - an id that is new gets an `Application` in stage `applied`;
  - an id that is unchanged is left untouched, with everything already recorded on it;
  - a previously withdrawn id that is selected again reopens the same `Application` at `applied`, keeping its history, instead of creating a new one; a withdrawn application that is not selected again stays as it is;
  - an id that disappears moves its `Application` to `withdrawn` and keeps every assessment, evaluation and note already recorded; it is deleted only when it holds no evidence. The non-completed assessments of a withdrawn application are set to `cancelled`, never deleted.
- Stages (`ApplicationStage`): `applied`, `screening`, `assessment`, `interview`, `decision`, `offer`, `hired`, `rejected`, `withdrawn`.
- The stage lives on the `Application`. An action that reaches a later step advances it and updates `stageChangedAt`; automation never moves a stage backwards. The recruiter can still move it by hand in either direction, from any stage, and can reopen a `rejected` or `withdrawn` application.
- Automation never touches a closed application: no event advances a `rejected` or `withdrawn` one. Only the manual move reopens it. The next-action card shows "Candidatura chiusa" for `hired`, `rejected` and `withdrawn`, and offers reopening only for `rejected` and `withdrawn`.
- An open application whose stage has not changed for more than `STALE_APPLICATION_DAYS` (7) days is stale. Decide it with `isApplicationStale(application, now)`; `hired`, `rejected` and `withdrawn` are never stale.
- Automatic advances: a saved resume evaluation moves the application to `screening`; creating an assessment moves it to `assessment`. Both only when the application is in an earlier stage.
- A resume evaluation is evidence of an application: it exists only for a candidate already applied to that position (a candidate with no application gets a 404). Saving it and moving the application to `screening` happen in the same transaction.
- A quiz can be assigned only to a candidate with an application for the quiz's position that is neither `rejected` nor `withdrawn`; the assessment is created on that application. A missing and a closed application give the same error.
- The public application matches on the normalised email (lower case, no surrounding spaces). An email that already exists attaches the new application to that existing candidate and refreshes the CV; a candidate already applied to that position gets a confirmation and nothing is created. The candidate-facing response is identical in every case, so it never reveals whether the email already exists. `Candidate.email` is unique.
- `doNotContact` (with `doNotContactNote`) is the only state kept on the candidate: a personal-record flag, unrelated to any stage.

## Position lifecycle

- `Position.status`: `draft` (being set up), `open`, `closed`.
- Only `open` positions appear in the public apply form, accept a public application, and feed the position selectors of the dashboard candidate forms. A `closed` position keeps its applications and everything recorded on them.
- A position that has at least one application cannot be deleted: the action fails with a `UserError`. Close it instead.
- A `draft` or `open` position is an incomplete setup when it lacks at least one of: the scorecard with at least one active criterion, a quiz, a guide. One rule answers it, `getPositionSetup({ activeCriteriaCount, quizCount, guideCount })`: the details are always done, and `missing` lists the missing parts in the order scorecard, quiz, guide. A scorecard whose criteria are all archived counts as missing. The position checklist and "Le mie azioni" both use it; "Le mie azioni" lists only `draft` and `open` positions, while the checklist on the position page is shown for every status. A saved empty scorecard is valid but leaves the position incomplete.

```ts
// Only positions that are new create an Application; the ones that stay are untouched
applications: {
  create: newPositionIds.map((positionId) => ({ positionId })),
},
```

## Scorecard

- A position has at most one scorecard, created by its first save. The scorecard is always saved whole, by `saveScorecardAction({ positionId, criteria })` in one transaction: `criteria` is the complete ordered list of active criteria, and `order` is the position in that list.
- A row whose `id` is an active criterion of that scorecard is updated in place; a row with no `id` is created; a row carrying an id that is not an active criterion of that scorecard is rejected before the transaction with `UserError("Uno o più criteri non appartengono a questa scheda")`. It is never created. Kept rows keep their ids, even when reordered.
- A stored active criterion missing from the list is archived when it has evidence, otherwise deleted. Archiving sets `archivedAt`; the criterion stays in the rows already citing it and is never modified nor restored. Deleting also removes its id from every guide question of the position in the same transaction, and only then does the action invalidate the guide cache.
- `criterionHasEvidence` is the single place that decides archive versus delete. Today the evidence is a CV evaluation of the position (an evaluation with no assessment) whose `criteriaAssessment` has an entry for that criterion: the score is not inspected, so an entry with no score still counts, and an evaluation of any candidate of the position is enough. Test evaluations never count. Phase 3 will extend it with interviewer scores and kit items.
- Archived criteria are not offered for new links: they are excluded from the AI criteria proposal, from quiz generation, from guide generation, from the selectors used to create a new quiz or a new guide, and from new CV evaluations. They stay visible where a link already exists, marked as archived, so an existing quiz or guide keeps showing what it cites. The scorecard editor opens with the default soft criteria whenever there are no active criteria, so a scorecard whose criteria are all archived shows them again.
- Name, description and anchors stay editable. A weight change updates only the criterion and never touches `Application.decisionWeights`.
- `weight` and `expectedLevel` are integers 1–5, relative to the other criteria, with no rule on the sum. A scorecard holds at most 40 criteria; there is no minimum, so saving an empty list is valid and archives or deletes every active criterion. A blank description is stored as null and the anchors are always stored as three strings.
- An empty scorecard opens with the five default soft criteria (`DEFAULT_SOFT_CRITERIA`: Comunicazione, Collaborazione, Problem Solving, Culture Fit, Leadership) as unsaved rows: category `soft`, source `custom`, weight 3, expected level 3, priority `must` except Leadership `nice`. `BehavioralRubric` does not change: only their five dimensions coincide.

## Interview guides

- A position has one or more interview guides, one per round by convention: `round` is 1-based, has no unique constraint and the editor proposes the next number. `durationMinutes` is the planned duration of the round.
- `upsertInterviewGuideAction` saves the guide, its sections and their questions together; `syncInterviewGuide` is the only writer of `GuideSection` and `GuideQuestion` and runs in the caller's transaction.
- Rows match by id inside their parent: a section whose id belongs to that guide is updated, a question whose id belongs to that section is updated, any other row is created, and stored rows missing from the input are deleted (a deleted section deletes its questions by cascade). A question that keeps its id but is submitted under another section is not moved: it is created in the target section with a new id and the old row is deleted as a leftover of its source section. Kept rows keep their ids; `order` is the position in the list.
- The criteria of the questions must be active criteria of the position, except ids already present anywhere on the same guide: the scope is the whole guide, so an archived criterion already cited by that guide may move to another question of it.
- When the guide already exists, the position comes from the stored guide and the `positionId` sent by the client is ignored. Creating a guide requires a position, enforced by the schema message "La posizione è obbligatoria per creare una guida".
- A guide can be deleted freely (`deleteInterviewGuideAction`, redirecting to `?tab=guide` with the position of the deleted guide): nothing references a guide yet.
- The sum of the section minutes is shown beside the duration but never blocks the save: there is no cross-field rule.
- Guide generation refuses a position without active criteria: `UserError("Crea prima la scheda di valutazione della posizione")`.

## Assessments

- The assessment `token` is the candidate's only credential. Candidate-facing actions look the assessment up by token and never call `requireUser()`.
- One assessment per (candidate, quiz): `createPendingAssessment` skips an existing pair (application check, no DB constraint). It is the only place that creates assessments.
- Stored status transitions: `pending` → `in_progress` (start, sets `startedAt`) → `completed` (sets `completedAt`, only through `closeAssessment`).
- `expired` is a derived state, never stored. An assessment that runs out of time ends as `completed` and the answers already given count.
- NEVER compute expiry by hand. Use the shared rules from the assessment utils: `assessmentState(assessment, now)` (`pending | in_progress | expired | completed | cancelled`), `acceptsAnswers(assessment, now)` (includes a 60 s grace, `EXPIRY_GRACE_SECONDS`), `getRemainingSeconds(startedAt, timeLimit, now)`.
- Answers are stored by Question id: multiple choice = selected option index, code snippet = `{ code }`, open question and behavioral scenario = text.

```ts
const state = assessmentState(assessment);
if (state === "completed" || state === "cancelled") {
  throw new UserError("Il test è già concluso");
}
if (!acceptsAnswers(assessment)) {
  await closeAssessment(assessment.id); // ends as completed, answers count
  throw new UserError("Il tempo a disposizione è scaduto");
}
```

## Evaluations (polymorphic)

| | Assessment evaluation | Resume evaluation |
|---|---|---|
| Ids set | `assessmentId` only (`candidateId`, `positionId` null) | `candidateId` + `positionId` (`assessmentId` null) |
| Uniqueness | one per assessment (unique `assessmentId` + app check) | one per candidate + position, and only for an existing application (app check, HTTP 409) |
| Scores | `quizScore` 0–100 and `fitScore` 0–10 | `fitScore` 0–10, no `quizScore` |
| `title` | quiz title | position title |

- Score scales: per-answer score 0–10, stored in `answerEvaluations` (assessment evaluations only); `quizScore` = earned points over the evaluated questions, as a 0–100 percentage; per-criterion score 1–5 or null (resume evaluations only); the AI returns `fitScore` 0–100 and it is ALWAYS stored as `Math.round(fitScore / 10)`, i.e. 0–10, for both kinds.
- `answerEvaluations` is JSON keyed by Question id, one entry per evaluated answer: `{ score, strengths, weaknesses }`, `score` 0–10. It is written together with the assessment evaluation when that evaluation is generated. Evaluations saved before it existed have no `answerEvaluations`: read it as optional.
- "Ricalcola dettaglio risposte" rebuilds `answerEvaluations` from scratch: the client re-evaluates every answer with `evaluateAssessmentAnswerAction`, discards and counts the answers that failed (never a fallback 0), then calls `recalculateAnswerEvaluationsAction`. That service writes `answerEvaluations` only and NEVER changes the stored `quizScore`, `fitScore`, `criteriaAssessment`, the narrative fields or the hiring fields; it makes no AI call of its own. Its errors are "Valutazione non trovata", "Nessuna risposta valutata", "Una o più domande non hanno una risposta".
- `criteriaAssessment` exists only on resume evaluations: JSON keyed by criterion id, each entry `{ score: 1–5 | null, evidence }`, where no score means "no evidence in the CV". The model answers with the keys `C1`, `C2`…; the save translates them into ids, drops unknown and repeated keys, rounds and clamps the score to 1–5, keeps null as null. When at least one entry is valid, every criterion the model skipped is stored as `{ score: null, evidence: "" }`; with no active criteria, or no valid entry, the whole field is null. Resume evaluations saved before it existed stay null.
- Reading: an invalid JSON value reads as null. An entry of a deleted criterion is skipped, while an entry of an archived criterion stays and is presented as archived. This resolution goes through the scorecard, active and archived criteria alike, ordered by `order`.
- To find a candidate's assessment evaluations go through `assessment.candidateId`; filtering `Evaluation.candidateId` returns resume evaluations only.
- `recommendation` is AI free text. `hireRecommendation` is the hiring manager's enum (`strong_yes`, `yes`, `maybe`, `no`, `strong_no`), saved with `interviewNotes`, `redFlags`, `standoutMoments`, `nextSteps` by `updateHiringManagerNotesAction`, which also sets `assessedBy`/`assessedAt`. `notes` is a separate free-text field ("Note manuali").
- The application evaluation summary belongs to one application: it reads the assessments, the rubric and the hiring decision of that application's candidate and position. Its score is computed, never stored: quiz (`quizScore / 10`, weight 0.5), rubric (average of the four required scores × 2, weight 0.3), `hireRecommendation` (10/8/6/4/2, weight 0.2), weighted over the parts present.

## Behavioral rubrics and presets

- `BehavioralRubric` is a manual 1–5 scoring by the recruiter for a candidate + position. It is unrelated to the `behavioral_scenario` question type, which is a quiz question answered by the candidate and scored by the AI. Its five dimensions are also the names of the default soft criteria of a scorecard, but the rubric row, its scores and its card do not change.
- `Preset` has no relations. In the quiz editor the client spreads the preset's own fields as generation options; the server never loads a preset by id while generating. `questionType` accepts all four question types.
- `seedDefaultPresetsAction` deletes ALL presets, including user-created ones, then recreates the defaults.

## Schema changes

- The schema is applied with Prisma Migrate. Every schema change is a versioned migration committed with the code that needs it.
- NEVER apply the schema with `prisma db push`: it drops and recreates a renamed table instead of renaming it, so the rows the rename must keep are lost.
- A rename is an `ALTER TABLE … RENAME` (table or column) written in the migration, never a drop and a create. When a change needs existing rows converted, the backfill is SQL in the same migration, placed before the removal of the columns it reads.
- The same migration runs on development first and then on production: a development database is never copied over production.

## Language

All user-facing text is Italian: UI labels, toasts, `UserError` messages, custom Zod messages, AI-generated content. Code identifiers and JSON field names stay in English.

Both audiences call an `Assessment` a **Test**: recruiters see "Test" / "Test inviati", and the candidate's pages say "Inizia il test". **Colloquio** names the live conversation and is never used for an `Assessment` or for a `Quiz`.

## Common mistakes

- Writing `QuizQuestion` rows or creating quiz questions outside `syncQuizQuestions`, or outside the quiz-save transaction.
- Sending the same `dbId` twice in one question array (violates the unique link).
- Forgetting that editing a question with a `dbId` changes it in every quiz that links it.
- Storing `expired` or `cancelled` when time runs out, or discarding the answers of an expired assessment.
- Storing the AI's 0–100 `fitScore` without dividing by 10.
- Reading assessment evaluations by `Evaluation.candidateId`.
- Relying on a database constraint for "one assessment per candidate + quiz" or "one resume evaluation per candidate + position": both are application checks.
- Treating an update that sends `positionIds` as a replace-all: it is a diff, and a removed position becomes `withdrawn` with its history.
- Creating a new application when a withdrawn position is selected again instead of reopening the existing one.
- Reintroducing `Candidate.status`, `isPrimary`, a primary-position ordering or a candidate status badge.
- Deleting a position that has applications, or deleting the assessments of a withdrawn application instead of cancelling them.
- Using `Application.ownerId` to restrict access, or deriving the owner from anything but the creating/editing user, "Prendi in carico" and "Rilascia".
- Advancing or reopening a `rejected`/`withdrawn` application from an automatic rule.
- Producing a resume evaluation without an application, or outside the transaction that advances the stage.
- Assigning a quiz to a `rejected` or `withdrawn` application.
- Confusing `BehavioralRubric` with `behavioral_scenario` questions, or Preset with ReferenceData.
- Filtering by `createdBy`, or calling `requireUser()` in a candidate-facing action.
- Applying the interviewer visibility exception anywhere outside an interviewer's unsubmitted notes and scorecard, or letting it hide material after submission.
- Running `prisma db push`, or changing the schema without a versioned migration.
- Writing `QuizQuestion` from the scorecard save, or deleting a criterion that has evidence instead of archiving it.
- Writing `criterionIds` on the `Question` row instead of on the quiz-question link.
- Counting an id of a deleted criterion left on a quiz link as evidence or as a valid criterion: the scorecard save never touches quiz links, so such an id can survive until that quiz is saved again, and `duplicateQuizAction` can even copy it to a same-position duplicate.
- Saving the AI proposal of criteria or of a guide without the user's confirmation.
- Creating five default soft criteria as stored rows: they are unsaved rows until the user saves the scorecard.
- Blocking a guide save on the sum of the section minutes, or expecting a guide question moved between sections to keep its id.
- Treating an archived criterion as editable, restorable or usable for a new link.
