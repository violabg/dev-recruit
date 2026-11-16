---
title: "domain model"
tier: "MustHave"
keywords: ["domain model","entities","quiz","question","candidate","application","stage","assessment","position status","evaluation","preset","migration","business rules"]
intent: "Always: entities, relations, cascades and business rules (quiz save path, scorecard and interview guide, interviews with kits, live notes and interviewer scorecards, applications and their stage, assessment lifecycle, evaluation kinds and scores, access with no per-user filtering except unsubmitted interviewer material, Italian)."
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
| `InterviewGuide` | An interview template of a Position | `positionId` (required, not unique: several per position), `title`, `round` (1-based), `durationMinutes`, `createdBy` | its sections (and their questions). An `Interview` that used it keeps the row with `guideId` set to null |
| `GuideSection` | An ordered part of a guide | `title`, `minutes`, `order`, `kind` (`GuideSectionKind`) | its questions |
| `GuideQuestion` | A question of a guide section | `text`, `followUps[]`, `criterionIds[]`, `anchors`, `required`, `order` | — (deleted with its section) |
| `Interview` | A live conversation ("Colloquio") of an Application, prepared from an interview guide | `applicationId`, `guideId?`, `round` 1–10, `scheduledAt`, `durationMinutes` 10–480, `meetingUrl?`, `status` (`InterviewStatus`), `startedAt?`, `endedAt?`, `sequence` (the `.ics` SEQUENCE, +1 on every reschedule), `createdBy?` | its participants, its kit (with sections, items and notes) and its interviewer scorecards (with their criterion scores). Application `Cascade`, guide `SetNull`, creator `SetNull`. There is no action that deletes an interview |
| `InterviewParticipant` | A user of the app taking part in an interview | `interviewId`, `userId`, `role` (`lead`, exactly one per interview, or `observer`); unique (`interviewId`, `userId`) | its live notes. User `Cascade` |
| `InterviewKit` | The interview's copy of its guide ("Kit colloquio"), one per interview | `interviewId` unique (1:1), `status` (`draft`, `ready`), `briefing?` (JSON, at most 5 points), `hypotheses?` (JSON `{ criterionId, hypothesis, howToVerify }[]`), `checklist` (JSON `{ id, category: communicate \| logistics, text, done }[]`), `missingSources[]` | its sections, its items and their notes |
| `KitSection` | A copy of a guide section inside a kit | `kitId`, `title`, `minutes`, `order`, `kind` (`GuideSectionKind`) | its items |
| `KitItem` | A question of a kit | `kitId`, `sectionId`, `text`, `followUps[]`, `criterionIds[]`, `anchors?`, `required`, `order` (position inside its section), `origin` (`KitItemOrigin`), `rationale?` ("Perché"), `sourceRef?` (`quiz:{questionId}`, `feedback:{feedbackId}` or `cv:{quote}`), `edited` ("ritoccata"), `covered` ("Coperta"), `coveredAt?` | its live notes. Section `Cascade` |
| `KitItemNote` | A participant's live note on a kit question | `kitItemId`, `participantId`, `note?`, `score?` 1–5, `evidenceQuote?`; unique (`kitItemId`, `participantId`) | — |
| `InterviewerFeedback` | The scorecard ("Scheda intervistatore") one participant fills for one interview | `interviewId`, `interviewerId`, `hireRecommendation?` (the values of `Evaluation.hireRecommendation`, validated by the schema), `notes?`, `redFlags[]`, `standoutMoments[]`, `submittedAt?`; unique (`interviewId`, `interviewerId`) | its criterion scores. User `Cascade` |
| `CriterionScore` | The score of one scorecard on one criterion | `feedbackId`, `criterionId`, `score` 1–5, `evidence?`; unique (`feedbackId`, `criterionId`) | — |
| `Candidate` | A person applying; never signs in | `firstName`, `lastName`, `email` (unique, compared in lower case and without spaces), `dateOfBirth?` (18+), `resumeUrl?`, `doNotContact`, `doNotContactNote?`, `createdBy?` (null when self-applied) | its applications, assessments, evaluations, rubrics and, through its applications, its interviews |
| `Application` | A candidacy: one Candidate for one Position | unique (`candidateId`, `positionId`), `stage` (`ApplicationStage`), `stageChangedAt`, `ownerId?` (the recruiter in charge), and the closing decision: `decision?`, `decisionRationale?`, `decidedBy?` (the deciding user, `onDelete: SetNull`), `decidedAt?`, `decisionWeights?` (JSON) | its assessments (and their evaluations) and its interviews (and everything they hold). An application is deleted only when it holds no evidence: no assessment, evaluation or interview |
| `Assessment` | One Candidate taking one Quiz, inside one Application | `applicationId` (required), `token` (unique), `status` (`AssessmentStatus`), `startedAt?`, `completedAt?`, `answers` (JSON keyed by Question id) | its evaluation |
| `Evaluation` | AI assessment, two kinds (see Evaluations) | `assessmentId?` (unique), `candidateId?`, `positionId?`, `fitScore`, `quizScore?`, `answerEvaluations?`, `criteriaAssessment?`, hiring fields | — |
| `BehavioralRubric` | Recruiter's manual soft-skill scores | unique (`candidateId`, `positionId`), four required scores 1–5, `leadershipScore?` | — |
| `Preset` | Recipe for generating one AI question | unique `name`, `questionType`, tuning fields, `difficulty` 1–5 | — (no relations) |
| `ReferenceData` | Pick-list values for forms and filters | unique (`category`, `label`), `isActive`, `order` | — (values are copied as strings, no FK) |

the quiz result lives in `Evaluation.quizScore`.

## Access: no ownership filtering, no roles

Every signed-in user sees and edits every entity, with one deliberate exception: the live notes of an interviewer and the interviewer scorecard stay visible only to their author until they are submitted.

- NEVER add `where: { createdBy: user.id }` or any per-user filter to a read or a mutation, with that single exception: unsubmitted live notes and an unsubmitted interviewer scorecard are filtered to their author, and to nobody else.
- The exception is about visibility, never about ownership or permission: each interviewer sees only their own material until their own submission, submitting is the only thing that publishes it, and it never becomes a role.
- A submitted scorecard, its criterion scores and the live notes of its author are returned to every signed-in user.
- Submitting locks them: a submitted scorecard, its criterion scores and its author's live notes on that interview are read-only for everyone, author included. There is no action that reopens a submitted scorecard.
- An interviewer who has not submitted yet sees the already submitted scorecards in a collapsed section "Schede già inviate (n)" with the warning "Per un giudizio indipendente, leggile dopo aver inviato la tua". That is a view arrangement, not an access rule: the read returns the submitted scorecards to every user.
- NEVER add role or permission checks. `requireUser()` only checks that a session exists.
- `Application.ownerId` names the recruiter in charge. It may feed a view filter the user can switch off ("Solo le mie"); it never limits what a user can open or edit.
  - Creating an application from the dashboard makes the signed-in user the owner.
  - Applications added by editing a candidate's positions take the user who performs the edit as owner.
  - A public application has no owner (`createdBy: null`).
  - "Prendi in carico" sets the current user as owner, "Rilascia" clears it (`owner: "me" | "none"`), and the filter is labelled "Solo le mie".
- The "Solo i miei" filter of the Agenda and the "Solo le mie" filter of the home are view filters too: participant or owner for interviews, interviewer for the scorecards to fill in.
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

`generateNewQuizAction`, `generateNewQuestionAction`, `generateScorecardCriteriaAction`, `generateInterviewGuideAction` and `generateInterviewKitAction` only return a proposal. The editor shows it as unsaved changes; nothing is stored until the user presses Save, which calls `upsertQuizAction`, `saveScorecardAction`, `upsertInterviewGuideAction` or `saveInterviewKitAction`. The criteria proposed for the questions of a generated quiz are stored only with the quiz. NEVER add Prisma writes or cache invalidation to generation actions.

## Candidates and applications

- A candidate has 1 to 10 positions; every id MUST exist, otherwise `UserError("Una o più posizioni selezionate non sono valide")`.
- The candidate holds no state of its own: no `Candidate.status`, no candidate status badge. A candidate's situation is the stage of their application, and lists show the stage of their furthest application.
- No position is primary. There is no `isPrimary` flag and no "Primaria" badge, and no read orders applications by a primary flag.
- An update that sends `positionIds` is a diff, never a replace-all:
  - an id that is new gets an `Application` in stage `applied`;
  - an id that is unchanged is left untouched, with everything already recorded on it;
  - a previously withdrawn id that is selected again reopens the same `Application` at `applied`, keeping its history, instead of creating a new one; a withdrawn application that is not selected again stays as it is;
  - an id that disappears moves its `Application` to `withdrawn` and keeps every assessment, evaluation, interview and note already recorded; it is deleted only when it holds no evidence. The non-completed assessments of a withdrawn application are set to `cancelled`, never deleted, and so are its `scheduled` interviews. In-progress and completed interviews are never touched.
- Stages (`ApplicationStage`): `applied`, `screening`, `assessment`, `interview`, `decision`, `offer`, `hired`, `rejected`, `withdrawn`.
- The stage lives on the `Application`. An action that reaches a later step advances it and updates `stageChangedAt`; automation never moves a stage backwards. The recruiter can still move it by hand in either direction, from any stage, and can reopen a `rejected` or `withdrawn` application.
- Automation never touches a closed application: no event advances a `rejected` or `withdrawn` one. Only the manual move reopens it. The next-action card shows "Candidatura chiusa" for `hired`, `rejected` and `withdrawn`, and offers reopening only for `rejected` and `withdrawn`.
- An open application whose stage has not changed for more than `STALE_APPLICATION_DAYS` (7) days is stale. Decide it with `isApplicationStale(application, now)`; `hired`, `rejected` and `withdrawn` are never stale.
- Automatic advances: a saved resume evaluation moves the application to `screening`; creating an assessment moves it to `assessment`; scheduling an interview moves it to `interview` (event `interview_scheduled`, in the same transaction that creates the interview and its kit); when every scorecard is submitted it moves to `decision` (event `all_feedback_submitted`). All of them only when the application is in an earlier stage, and never on a closed application.
- "Every scorecard submitted" (`allFeedbackSubmitted`) is true when at least one interview is completed, none is scheduled or in progress, and every participant (lead and observers) of every completed interview has submitted. Cancelled and no-show interviews are ignored. The check runs after a scorecard submission, a cancellation and a no-show.
- A resume evaluation is evidence of an application: it exists only for a candidate already applied to that position (a candidate with no application gets a 404). Saving it and moving the application to `screening` happen in the same transaction.
- An application holds evidence when it has any assessment, any interview in any status, or a resume evaluation. Evidence blocks its deletion.
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
- `criterionHasEvidence` is the single place that decides archive versus delete. The evidence is, in this order: an entry for that criterion in the `criteriaAssessment` of a CV evaluation of the position (the score is not inspected, so an entry with no score still counts, and an evaluation of any candidate of the position is enough; test evaluations never count); a `CriterionScore` of that criterion, in a submitted or unsubmitted interviewer scorecard; a `KitItem` of an interview of the position that cites it; a hypothesis of a kit of the position that cites it (a malformed JSON value is ignored). Every interview status counts.
- Archived criteria are not offered for new links: they are excluded from the AI criteria proposal, from quiz generation, from guide generation, from the selectors used to create a new quiz or a new guide, and from new CV evaluations. They stay visible where a link already exists, marked as archived, so an existing quiz, guide or kit keeps showing what it cites. The scorecard editor opens with the default soft criteria whenever there are no active criteria, so a scorecard whose criteria are all archived shows them again.
- Name, description and anchors stay editable. A weight change updates only the criterion and never touches `Application.decisionWeights`.
- `weight` and `expectedLevel` are integers 1–5, relative to the other criteria, with no rule on the sum. A scorecard holds at most 40 criteria; there is no minimum, so saving an empty list is valid and archives or deletes every active criterion. A blank description is stored as null and the anchors are always stored as three strings.
- An empty scorecard opens with the five default soft criteria (`DEFAULT_SOFT_CRITERIA`: Comunicazione, Collaborazione, Problem Solving, Culture Fit, Leadership) as unsaved rows: category `soft`, source `custom`, weight 3, expected level 3, priority `must` except Leadership `nice`. `BehavioralRubric` does not change: only their five dimensions coincide.

## Interview guides

- A position has one or more interview guides, one per round by convention: `round` is 1-based, has no unique constraint and the editor proposes the next number. `durationMinutes` is the planned duration of the round.
- `upsertInterviewGuideAction` saves the guide, its sections and their questions together; `syncInterviewGuide` is the only writer of `GuideSection` and `GuideQuestion` and runs in the caller's transaction.
- Rows match by id inside their parent: a section whose id belongs to that guide is updated, a question whose id belongs to that section is updated, any other row is created, and stored rows missing from the input are deleted (a deleted section deletes its questions by cascade). A question that keeps its id but is submitted under another section is not moved: it is created in the target section with a new id and the old row is deleted as a leftover of its source section. Kept rows keep their ids; `order` is the position in the list.
- The criteria of the questions must be active criteria of the position, except ids already present anywhere on the same guide: the scope is the whole guide, so an archived criterion already cited by that guide may move to another question of it.
- When the guide already exists, the position comes from the stored guide and the `positionId` sent by the client is ignored. Creating a guide requires a position, enforced by the schema message "La posizione è obbligatoria per creare una guida".
- A guide can be deleted freely (`deleteInterviewGuideAction`, redirecting to `?tab=guide` with the position of the deleted guide). Interviews reference it with `guideId` (`onDelete: SetNull`): deleting it only clears the reference, and the interview and its kit stay whole; the interview card no longer shows the guide title.
- The guide is the template of the position; each interview gets a kit, its own copy. Editing or deleting a guide never touches an existing kit: after the copy the guide is not read again.
- The sum of the section minutes is shown beside the duration but never blocks the save: there is no cross-field rule.
- Guide generation refuses a position without active criteria: `UserError("Crea prima la scheda di valutazione della posizione")`.

## Interviews: states and transitions

- `Interview.status`: `scheduled`, `in_progress`, `completed`, `cancelled`, `no_show`. `INTERVIEW_TRANSITIONS` is the single source; no transition happens automatically with the clock.
- Start: `scheduled` → `in_progress`, recording `startedAt`.
- Complete: `in_progress` → `completed`, recording `endedAt`.
- Cancel and no-show: only from `scheduled`.
- Reschedule: only from `scheduled`. It changes date, duration, call link and participants of the same interview, keeps the kit and increments `sequence`; the guide and the round never change.
- Any other transition is `UserError("Operazione non consentita nello stato attuale del colloquio")`.
- Scheduling is refused on `rejected`, `withdrawn` and `hired` applications ("Candidatura non trovata o chiusa"). The guide is mandatory and must belong to the same position. Participants are 1 to 10, all users of the app, with exactly one lead. Past dates are allowed.
- A participant who already has notes or a scorecard cannot be removed ("Il partecipante ha già note o una scheda").
- The app sends no email: the summary and the `.ics` file are shared by hand.

## Interview kits

- **Copy of the guide.** At scheduling the kit is born `draft` as a copy of the guide: one `KitSection` per section, one `KitItem` with origin `template` per question, in the same order, and the default checklist (five items). The copied criteria keep only the **active** criteria of the position; archived and unknown ids are dropped, so an archived criterion never appears on a new kit. The guide is not read after the copy.
- **Deleted guide.** Only the reference is cleared: `Interview.guideId` becomes null, interviews and kits stay whole.
- **Editing the kit.** It is editable only while the interview is `scheduled` ("Il kit si modifica solo prima del colloquio"), with a single save (`saveInterviewKitAction`).
- `syncKitItems` is the only writer of `KitItem` and never writes `covered`. Rows match by id inside the kit: a row with no id is created with the AI origin of the proposal, otherwise `manual` (never `template`); missing rows are deleted with their notes. `order` is the position among the rows of the same section.
- An AI-origin row whose text, follow-ups or criteria change becomes `edited` ("ritoccata"); `template` and `manual` rows never become `edited`.
- The criteria of questions and hypotheses follow the guide rule: ids that are not criteria of the scorecard are dropped; archived criteria are allowed only when already present on the same kit.
- The save does not change the status; "Segna come pronto" / "Riporta in bozza" change it only while the interview is scheduled.
- **Regeneration** replaces only the AI rows with `edited = false`. Template, manual and edited rows stay. Briefing and hypotheses are replaced; checklist suggestions are added when their text (trimmed, lower-case) is new; missing sources are replaced.
- The legal reminder is fixed text (`LEGAL_REMINDER_TEXT`), never generated and never stored.

## Live notes and interviewer scorecards

- **Live notes.** Only participants write notes. They are written while the interview is `scheduled` or `in_progress` ("Il colloquio non accetta più note") and never after their own scorecard is submitted ("La scheda è già stata inviata"). One note per participant and question; only the fields present in the input are saved.
- **"Coperta" mark.** It is shared: any signed-in user can change it, while the interview is scheduled or in progress.
- **Interviewer scorecard.** Only for participants; the interviewer is always the signed-in user.
  - It is saved as a draft in every status except cancelled and no-show.
  - It is submitted only when the interview is completed ("Puoi inviare la scheda solo a colloquio concluso") and with the recommendation ("Indica la raccomandazione finale").
  - Submission records `submittedAt`.
  - Scores are saved only for the criteria that were scored, active or archived but cited by the kit.
  - The scorecard page pre-fills from the own notes only when there is no draft: score = rounded average of the own scores on the questions citing that criterion; evidence = notes and quotes joined.
- **Lock after submission.** A submitted scorecard, its criterion scores and the live notes of its author on that interview are read-only for everyone, author included. There is no action that reopens it.

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
- `recommendation` is AI free text. `hireRecommendation` is the hiring manager's enum (`strong_yes`, `yes`, `maybe`, `no`, `strong_no`), saved with `interviewNotes`, `redFlags`, `standoutMoments`, `nextSteps` by `updateHiringManagerNotesAction`, which also sets `assessedBy`/`assessedAt`. `notes` is a separate free-text field ("Note manuali"). These hiring fields belong to the evaluation of a test, not to the interview: the notes of an interview are the live notes (`KitItemNote`) and the interviewer scorecard.
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

All user-facing text is Italian: UI labels, toasts, `UserError` messages, custom Zod messages, AI-generated content. Code identifiers and JSON field names stay in English. The values of the kit proposal (briefing, hypotheses, questions, follow-ups, rationales, checklist) are Italian too.

Both audiences call an `Assessment` a **Test**: recruiters see "Test" / "Test inviati", and the candidate's pages say "Inizia il test". **Colloquio** names an `Interview`, the live conversation, and is never used for an `Assessment` or for a `Quiz`.

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
- Keeping the `scheduled` interviews of a withdrawn application, or cancelling the in-progress and completed ones.
- Using `Application.ownerId` to restrict access, or deriving the owner from anything but the creating/editing user, "Prendi in carico" and "Rilascia".
- Advancing or reopening a `rejected`/`withdrawn` application from an automatic rule.
- Producing a resume evaluation without an application, or outside the transaction that advances the stage.
- Assigning a quiz to a `rejected` or `withdrawn` application.
- Confusing `BehavioralRubric` with `behavioral_scenario` questions, or Preset with ReferenceData.
- Filtering by `createdBy`, or calling `requireUser()` in a candidate-facing action.
- Applying the interviewer visibility exception anywhere outside an interviewer's unsubmitted live notes and scorecard, letting it hide submitted material, or letting a submitted scorecard stay editable.
- Running `prisma db push`, or changing the schema without a versioned migration.
- Writing `QuizQuestion` from the scorecard save, or deleting a criterion that has evidence instead of archiving it.
- Writing `criterionIds` on the `Question` row instead of on the quiz-question link.
- Counting an id of a deleted criterion left on a quiz link as evidence or as a valid criterion: the scorecard save never touches quiz links, so such an id can survive until that quiz is saved again, and `duplicateQuizAction` can even copy it to a same-position duplicate.
- Saving the AI proposal of criteria, of a guide or of a kit without the user's confirmation.
- Creating five default soft criteria as stored rows: they are unsaved rows until the user saves the scorecard.
- Blocking a guide save on the sum of the section minutes, or expecting a guide question moved between sections to keep its id.
- Treating an archived criterion as editable, restorable or usable for a new link.
- Writing `KitItem` rows outside `syncKitItems`, or writing `covered` from the kit save.
- Reading live notes or an unsubmitted scorecard in a cached read, or taking the interviewer from the input instead of the session.
- Changing a submitted scorecard, or naming the interview `LiveInterview` (the interview is `Interview`; live mode uses `InterviewLiveSession`, `getInterviewLiveSession`, `InterviewLiveMode`).
