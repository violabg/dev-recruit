---
title: "domain model"
tier: "MustHave"
keywords: ["domain model","entities","quiz","question","candidate","application","stage","assessment","position status","evaluation","preset","migration","business rules"]
intent: "Always: entities, relations, cascades and business rules (quiz save path, applications and their stage, assessment lifecycle, evaluation kinds and scores, no ownership filtering, Italian)."
editable: true
---
# Domain model and business rules

Prisma Client API semantics and migration behaviour are in the official docs (context7) and are not restated here; this document holds only the domain rules the schema encodes.

## Entities and relations

| Entity | Purpose | Key fields / constraints | Deleting it removes |
|---|---|---|---|
| `Position` | A job opening | `title`, `description?`, `experienceLevel` and `contractType` (free strings from reference data), `skills[]`, `softSkills[]`, `status` (`draft`, `open`, `closed`) | Allowed only when the position has no application. Then: its quizzes, its behavioral rubrics. Resume evaluations keep the row with `positionId` set to null |
| `Quiz` | Reusable ordered set of questions for exactly one Position | `positionId` (required), `timeLimit?` in minutes (5–120, null = no limit) | its `QuizQuestion` links and its assessments (and their evaluations). The `Question` rows are NOT deleted |
| `Question` | Reusable question row | `type` (`QuestionType`), `question`, type-specific fields, `isFavorite` | its `QuizQuestion` links in every quiz |
| `QuizQuestion` | Quiz ↔ Question link with `order` (0-based) | unique (`quizId`, `questionId`): a question appears at most once per quiz | — |
| `Candidate` | A person applying; never signs in | `firstName`, `lastName`, `email` (unique, compared in lower case and without spaces), `dateOfBirth?` (18+), `resumeUrl?`, `doNotContact`, `doNotContactNote?`, `createdBy?` (null when self-applied) | its applications, assessments, evaluations, rubrics |
| `Application` | A candidacy: one Candidate for one Position | unique (`candidateId`, `positionId`), `stage` (`ApplicationStage`), `stageChangedAt`, `ownerId?` (the recruiter in charge), and the closing decision: `decision?`, `decisionRationale?`, `decidedBy?` (the deciding user, `onDelete: SetNull`), `decidedAt?`, `decisionWeights?` (JSON) | its assessments (and their evaluations). An application is deleted only when it holds no evidence: no assessment, evaluation or conversation |
| `Assessment` | One Candidate taking one Quiz, inside one Application | `applicationId` (required), `token` (unique), `status` (`AssessmentStatus`), `startedAt?`, `completedAt?`, `answers` (JSON keyed by Question id) | its evaluation |
| `Evaluation` | AI assessment, two kinds (see Evaluations) | `assessmentId?` (unique), `candidateId?`, `positionId?`, `fitScore`, `quizScore?`, hiring fields | — |
| `BehavioralRubric` | Recruiter's manual soft-skill scores | unique (`candidateId`, `positionId`), four required scores 1–5, `leadershipScore?` | — |
| `Preset` | Recipe for generating one AI question | unique `name`, `questionType`, tuning fields, `difficulty` 1–5 | — (no relations) |
| `ReferenceData` | Pick-list values for forms and filters | unique (`category`, `label`), `isActive`, `order` | — (values are copied as strings, no FK) |

the quiz result lives in `Evaluation.quizScore`.

## Access: no ownership filtering, no roles

Every signed-in user sees and edits every entity. `createdBy` records the author only.

- NEVER add `where: { createdBy: user.id }` or any per-user filter to a read or a mutation.
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

```ts
// syncQuizQuestions, after removing this quiz's old links and the dropped questions
for (const [order, question] of questions.entries()) {
  // existing dbId -> tx.question.update(prepareQuestionForUpdate(question))
  // otherwise     -> tx.question.create(prepareQuestionForCreate(question, userId))
  await tx.quizQuestion.create({ data: { quizId, questionId, order } });
}
```

## AI generation never persists

`generateNewQuizAction` and `generateNewQuestionAction` only return questions. The editor shows them as unsaved changes; nothing is stored until the user presses Save, which calls `upsertQuizAction`. NEVER add Prisma writes or cache invalidation to generation actions.

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
- A `draft` or `open` position with no quiz is an incomplete setup: the action center lists it.

```ts
// Only positions that are new create an Application; the ones that stay are untouched
applications: {
  create: newPositionIds.map((positionId) => ({ positionId })),
},
```

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

- Score scales: per-answer score 0–10, stored in `answerEvaluations` (assessment evaluations only); `quizScore` = earned points over the evaluated questions, as a 0–100 percentage; the AI returns `fitScore` 0–100 and it is ALWAYS stored as `Math.round(fitScore / 10)`, i.e. 0–10, for both kinds.
- `answerEvaluations` is JSON keyed by Question id, one entry per evaluated answer: `{ score, strengths, weaknesses }`, `score` 0–10. It is written together with the assessment evaluation when that evaluation is generated. Evaluations saved before it existed have no `answerEvaluations`: read it as optional. Recomputing the per-answer detail of a saved evaluation writes `answerEvaluations` only and NEVER changes the stored `quizScore` or `fitScore`.
- To find a candidate's assessment evaluations go through `assessment.candidateId`; filtering `Evaluation.candidateId` returns resume evaluations only.
- `recommendation` is AI free text. `hireRecommendation` is the hiring manager's enum (`strong_yes`, `yes`, `maybe`, `no`, `strong_no`), saved with `interviewNotes`, `redFlags`, `standoutMoments`, `nextSteps` by `updateHiringManagerNotesAction`, which also sets `assessedBy`/`assessedAt`. `notes` is a separate free-text field ("Note manuali").
- The application evaluation summary belongs to one application: it reads the assessments, the rubric and the hiring decision of that application's candidate and position. Its score is computed, never stored: quiz (`quizScore / 10`, weight 0.5), rubric (average of the four required scores × 2, weight 0.3), `hireRecommendation` (10/8/6/4/2, weight 0.2), weighted over the parts present.

## Behavioral rubrics and presets

- `BehavioralRubric` is a manual 1–5 scoring by the recruiter for a candidate + position. It is unrelated to the `behavioral_scenario` question type, which is a quiz question answered by the candidate and scored by the AI.
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
- Running `prisma db push`, or changing the schema without a versioned migration.
