---
title: "domain model"
tier: "MustHave"
keywords: ["domain model","entities","quiz","question","candidate","interview","evaluation","preset","business rules"]
intent: "Always: entities, relations, cascades and business rules (quiz save path, candidate positions, interview lifecycle, evaluation kinds and scores, no ownership filtering, Italian)."
editable: true
---
# Domain model and business rules

Prisma Client API semantics and migration behaviour are in the official docs (context7) and are not restated here; this document holds only the domain rules the schema encodes.

## Entities and relations

| Entity | Purpose | Key fields / constraints | Deleting it removes |
|---|---|---|---|
| `Position` | A job opening | `title`, `description?`, `experienceLevel` and `contractType` (free strings from reference data), `skills[]`, `softSkills[]` | its quizzes (and their interviews and interview evaluations), its `CandidatePosition` links, its behavioral rubrics. Resume evaluations keep the row with `positionId` set to null |
| `Quiz` | Reusable ordered set of questions for exactly one Position | `positionId` (required), `timeLimit?` in minutes (5–120, null = no limit) | its `QuizQuestion` links and its interviews (and their evaluations). The `Question` rows are NOT deleted |
| `Question` | Reusable question row | `type` (`QuestionType`), `question`, type-specific fields, `isFavorite` | its `QuizQuestion` links in every quiz |
| `QuizQuestion` | Quiz ↔ Question link with `order` (0-based) | unique (`quizId`, `questionId`): a question appears at most once per quiz | — |
| `Candidate` | A person applying; never signs in | `firstName`, `lastName`, `email`, `dateOfBirth?` (18+), `status`, `resumeUrl?`, `createdBy?` (null when self-applied) | its position links, interviews, evaluations, rubrics |
| `CandidatePosition` | Candidate ↔ Position link | unique (`candidateId`, `positionId`), `isPrimary` | — |
| `Interview` | One Candidate taking one Quiz | `token` (unique), `status` (`InterviewStatus`), `startedAt?`, `completedAt?`, `answers` (JSON keyed by Question id) | its evaluation |
| `Evaluation` | AI assessment, two kinds (see Evaluations) | `interviewId?` (unique), `candidateId?`, `positionId?`, `fitScore`, `quizScore?`, hiring fields | — |
| `BehavioralRubric` | Recruiter's manual soft-skill scores | unique (`candidateId`, `positionId`), four required scores 1–5, `leadershipScore?` | — |
| `Preset` | Recipe for generating one AI question | unique `name`, `questionType`, tuning fields, `difficulty` 1–5 | — (no relations) |
| `ReferenceData` | Pick-list values for forms and filters | unique (`category`, `label`), `isActive`, `order` | — (values are copied as strings, no FK) |

the quiz result lives in `Evaluation.quizScore`.

## Access: no ownership filtering, no roles

Every signed-in user sees and edits every entity. `createdBy` records the author only.

- NEVER add `where: { createdBy: user.id }` or any per-user filter to a read or a mutation.
- NEVER add role or permission checks. `requireUser()` only checks that a session exists.
- Candidates are not users: they reach the public apply page and the interview page through public routes only.

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

## Candidates and positions

- A candidate has 1 to 10 positions; every id MUST exist, otherwise `UserError("Una o più posizioni selezionate non sono valide")`.
- The first id in `positionIds` is the primary position (`isPrimary: index === 0`). Reads order links by `isPrimary desc`.
- An update that sends `positionIds` replaces all links (`deleteMany: {}` + `create`). Removing a position from a candidate also deletes that candidate's non-completed interviews on quizzes of the removed position.
- Candidate status values: `pending` (default, also for public applications), `contacted`, `interviewing`, `hired`, `rejected`. Only the recruiter changes it; no flow changes it automatically.
- A quiz can be assigned only to candidates linked to the quiz's position.

```ts
positions: {
  create: payload.positionIds.map((positionId, index) => ({
    positionId,
    isPrimary: index === 0,
  })),
},
```

## Interviews

- The interview `token` is the candidate's only credential. Candidate-facing actions look the interview up by token and never call `requireUser()`.
- One interview per (candidate, quiz): `createPendingInterview` skips an existing pair (application check, no DB constraint). It is the only place that creates interviews.
- Stored status transitions: `pending` → `in_progress` (start, sets `startedAt`) → `completed` (sets `completedAt`, only through `closeInterview`).
- `expired` is a derived state, never stored. An interview that runs out of time ends as `completed` and the answers already given count.
- NEVER compute expiry by hand. Use the shared rules from the interview utils: `interviewState(interview, now)` (`pending | in_progress | expired | completed | cancelled`), `acceptsAnswers(interview, now)` (includes a 60 s grace, `EXPIRY_GRACE_SECONDS`), `getRemainingSeconds(startedAt, timeLimit, now)`.
- Answers are stored by Question id: multiple choice = selected option index, code snippet = `{ code }`, open question and behavioral scenario = text.

```ts
const state = interviewState(interview);
if (state === "completed" || state === "cancelled") {
  throw new UserError("Il colloquio è già concluso");
}
if (!acceptsAnswers(interview)) {
  await closeInterview(interview.id); // ends as completed, answers count
  throw new UserError("Il tempo a disposizione è scaduto");
}
```

## Evaluations (polymorphic)

| | Interview evaluation | Resume evaluation |
|---|---|---|
| Ids set | `interviewId` only (`candidateId`, `positionId` null) | `candidateId` + `positionId` (`interviewId` null) |
| Uniqueness | one per interview (unique `interviewId` + app check) | one per candidate + position (app check, HTTP 409) |
| Scores | `quizScore` 0–100 and `fitScore` 0–10 | `fitScore` 0–10, no `quizScore` |
| `title` | quiz title | position title |

- Score scales: per-answer score 0–10 (not stored); `quizScore` = earned points over the evaluated questions, as a 0–100 percentage; the AI returns `fitScore` 0–100 and it is ALWAYS stored as `Math.round(fitScore / 10)`, i.e. 0–10, for both kinds.
- To find a candidate's interview evaluations go through `interview.candidateId`; filtering `Evaluation.candidateId` returns resume evaluations only.
- `recommendation` is AI free text. `hireRecommendation` is the hiring manager's enum (`strong_yes`, `yes`, `maybe`, `no`, `strong_no`), saved with `interviewNotes`, `redFlags`, `standoutMoments`, `nextSteps` by `updateHiringManagerNotesAction`, which also sets `assessedBy`/`assessedAt`. `notes` is a separate free-text field ("Note manuali").
- The evaluation dashboard score is computed, never stored: quiz (`quizScore / 10`, weight 0.5), rubric (average of the four required scores × 2, weight 0.3), `hireRecommendation` (10/8/6/4/2, weight 0.2), weighted over the parts present.

## Behavioral rubrics and presets

- `BehavioralRubric` is a manual 1–5 scoring by the recruiter for a candidate + position. It is unrelated to the `behavioral_scenario` question type, which is a quiz question answered by the candidate and scored by the AI.
- `Preset` has no relations. In the quiz editor the client spreads the preset's own fields as generation options; the server never loads a preset by id while generating. `questionType` accepts all four question types.
- `seedDefaultPresetsAction` deletes ALL presets, including user-created ones, then recreates the defaults.

## Language

All user-facing text is Italian: UI labels, toasts, `UserError` messages, custom Zod messages, AI-generated content. Code identifiers and JSON field names stay in English.

## Common mistakes

- Writing `QuizQuestion` rows or creating quiz questions outside `syncQuizQuestions`, or outside the quiz-save transaction.
- Sending the same `dbId` twice in one question array (violates the unique link).
- Forgetting that editing a question with a `dbId` changes it in every quiz that links it.
- Storing `expired` or `cancelled` when time runs out, or discarding the answers of an expired interview.
- Storing the AI's 0–100 `fitScore` without dividing by 10.
- Reading interview evaluations by `Evaluation.candidateId`.
- Relying on a database constraint for "one interview per candidate + quiz" or "one resume evaluation per candidate + position": both are application checks.
- Confusing `BehavioralRubric` with `behavioral_scenario` questions, or Preset with ReferenceData.
- Filtering by `createdBy`, or calling `requireUser()` in a candidate-facing action.
