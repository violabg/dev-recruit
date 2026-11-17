# CONTEXT — dev-recruit vocabulary

DevRecruit is an AI-assisted technical recruitment platform: recruiters define positions, build quizzes (often AI-generated), follow each application through its stages, send candidates a test, run live interviews, and get AI evaluations of answers and resumes. The UI is in Italian; code is in English. Rules live in `knowledge/` (read through the knowledge catalogue); this file only resolves terms.

## Glossary

| Term | Code symbol | Italian UI label | Meaning |
|---|---|---|---|
| Position | `Position` | Posizione / Posizioni | A job opening: title, description, experience level, skills, soft skills, contract type, status |
| Scheda di valutazione | `Scorecard` | Scheda di valutazione | At most one per position: the criteria used to evaluate that position's candidates. Editor at `/dashboard/positions/[id]/scorecard`, tab "Scheda di valutazione" |
| Criterio | `ScorecardCriterion` | Aggiungi criterio, Rimuovi criterio, Criteri archiviati | One row of the scorecard: name, description, category, priority, weight, expected level, anchors, source, order, `archivedAt` |
| Categoria del criterio | `CriterionCategory` | Categoria: Tecnico · Soft skill · Cultura | `technical` · `soft` · `culture` |
| Priorità del criterio | `CriterionPriority` | Priorità: Indispensabile · Preferibile | `must` · `nice` |
| Origine del criterio | `CriterionSource` | Badge: Competenza · Soft skill · Personalizzato | `skill` · `softSkill` · `custom`. Shown as a badge, not a select |
| Ancore | `anchors` (JSON `{ weak, medium, strong }`) | Risposta debole · Risposta media · Risposta forte | How a weak, medium and strong answer sounds; on the criterion and on the guide question |
| Criterio archiviato | `ScorecardCriterion.archivedAt` | Criteri archiviati ("conservati perché hanno già valutazioni") | Criterion removed from the scorecard but kept because it has evidence; there is no restore |
| Criteri soft di default | `DEFAULT_SOFT_CRITERIA` | Criteri soft di default: non sono ancora salvati | Five soft dimensions (Comunicazione, Collaborazione, Problem Solving, Culture Fit, Leadership), category `soft`, source `custom`, weight 3, expected level 3, `must` except Leadership `nice`; proposed as unsaved rows in an empty scorecard |
| Quiz | `Quiz` | Quiz | Reusable, ordered set of questions for one Position, with an optional time limit (minutes) |
| Question | `Question` (DB row); `FlexibleQuestion` / `SavedQuestion` / `Question` (schema types) | Domanda / Domande | A reusable question. In forms and AI output the DB id is carried as `dbId` |
| Quiz question link | `QuizQuestion` | — | Quiz ↔ Question link with `order` and `criterionIds` |
| Criteri verificati | `QuizQuestion.criterionIds`, `GuideQuestion.criterionIds`, `KitItem.criterionIds` | Criteri verificati | Scorecard criteria a question verifies. For quizzes they live on the link, never on `Question`; the same question in another quiz has its own list |
| Favorite question | `Question.isFavorite` | Preferite, Domande Preferite | Question kept for reuse; survives removal from its quiz |
| Candidate | `Candidate` | Candidato / Candidati | A person applying. Never signs in |
| Application | `Application` | Candidatura / Candidature | One Candidate for one Position. Holds the stage; assessments, evaluations and interviews are evidence collected on it |
| Application stage | `Application.stage` (`ApplicationStage`) | Fase | Where the application is in the hiring flow |
| Public application | `applyAsCandidateAction` | Unisciti al nostro team! | Public form where candidates apply with a CV; an email already known adds the application to the existing candidate |
| Resume | `Candidate.resumeUrl` | Curriculum Vitae / Curriculum / CV | PDF stored in Cloudflare R2 |
| Assessment | `Assessment` | Test / Test inviati (dashboard); the candidate sees "Inizia il test" | One Candidate taking one Quiz, inside one Application: token, status, timing, answers |
| Assessment token | `Assessment.token` | — (part of the link) | The candidate's only credential, in the public assessment link |
| Colloquio | `Interview` | Colloquio / Colloqui | The live conversation with the candidate, on one application; several interviews per application (rounds). Never an `Assessment`, never a `Quiz` |
| Round | `Interview.round` | Round N | The number of the interview in its application; proposed as the application's non-cancelled interviews + 1, not unique |
| Stato del colloquio | `InterviewStatus` | Pianificato · In corso · Concluso · Annullato · Non presentato | `scheduled` · `in_progress` · `completed` · `cancelled` · `no_show` |
| Partecipante | `InterviewParticipant` | Partecipanti | A user of the app taking part in an interview; one per user and interview |
| Conduttore / Osservatore | `InterviewParticipantRole` | Conduttore · Osservatore | `lead` (exactly one per interview) · `observer` |
| Kit colloquio | `InterviewKit` | Kit colloquio; Kit in bozza · Kit pronto | One per interview: a copy of the guide (sections and questions) with briefing, hypotheses to verify, checklist and missing sources; status `draft` · `ready` |
| Sezione del kit | `KitSection` | — | A copy of a guide section (title, minutes, order, kind) |
| Domanda del kit | `KitItem` | Domanda | A question of a kit section with follow-ups, criteria, anchors, required flag, order, origin, rationale ("Perché"), source, `edited` ("ritoccata"), `covered` ("Coperta") |
| Origine della domanda | `KitItemOrigin` | Modello · CV · Lacuna CV · Test · Round precedente · Manuale | `template` (a guide question, copied) · `cv` · `resume_gap` · `quiz_answer` · `previous_round` (personalised questions proposed by the AI) · `manual` |
| Domanda del modello / personalizzata | `origin = template` / AI origin | Modello / CV, Lacuna CV, Test, Round precedente | Template questions come from the guide and are never replaced; personalised ones are proposed by the AI and added |
| Nota live | `KitItemNote` | Nota rapida, Voto, Citazione a supporto | A note, a 1–5 score and a participant's quote on one question; one per participant and question; visible only to its author until they submit their scorecard |
| Scheda intervistatore | `InterviewerFeedback` | Scheda intervistatore; Salva bozza · Invia scheda | A participant's evaluation of one interview: final recommendation, notes, red flags, standout moments, per-criterion scores; one per participant and interview |
| Voto per criterio | `CriterionScore` | Valutazione per criterio | A 1–5 score and evidence of a scorecard on one criterion; an unscored criterion ("Senza prove") has no row |
| Modalità live | `/dashboard/applications/[id]/interviews/[interviewId]/live` | Colloquio live | The page used during the interview; always current data (no cache) |
| Agenda colloqui | `/dashboard/agenda`, `SECTIONS.agenda` | Agenda colloqui; Solo i miei | Scheduled and in-progress interviews, by day; entry of the Selezione group |
| Guida colloquio | `InterviewGuide` | Guida colloquio / Guide colloquio | The interview template of a position: one or more per position (one per round by convention, not by constraint), with title, round and duration |
| Sezione della guida | `GuideSection` | Titolo sezione, Aggiungi sezione, Somma sezioni | Ordered part of a guide with title, minutes and kind |
| Tipo di sezione | `GuideSectionKind` | Tipo: Introduzione · Esperienza · Tecnica · Comportamentale · Domande del candidato · Chiusura | `intro` · `experience` · `technical` · `behavioral` · `candidate_questions` · `closing` |
| Domanda della guida | `GuideQuestion` | Domanda, Approfondimenti, Criteri verificati, Obbligatoria | Text, follow-ups, verified criteria, anchors, required flag, order |
| Invite / assignment | `assignCandidatesToQuizAction`, `assignQuizzesToCandidateAction` | Invita, Assegna quiz, Associa quiz | Creating pending assessments for candidate + quiz pairs |
| Answer | `Assessment.answers` | — | Stored per Question id |
| Voice answer | `transcribeAudioAction` | — | Recorded audio transcribed to text |
| Assessment evaluation | `Evaluation` with `assessmentId` | Valutazione complessiva AI | AI scoring of an assessment's answers plus an overall judgement |
| Resume evaluation | `Evaluation` with `candidateId` + `positionId` | Valutazioni (del curriculum) | AI assessment of a resume against one Position, streamed |
| Fit score | `Evaluation.fitScore` | Punteggio di idoneità / Fit score | AI fit judgement, stored 0–10 |
| Quiz score | `Evaluation.quizScore` | Quiz score / Punteggio complessivo | Assessment evaluation only: percentage 0–100 of points earned |
| Dettaglio per risposta | `Evaluation.answerEvaluations` | Ricalcola dettaglio risposte; "Il dettaglio per risposta non è disponibile per questa valutazione." | For every evaluated question of a test: score 0–10, strengths, weaknesses |
| Valutazione per criterio | `Evaluation.criteriaAssessment` | Valutazione per criterio | Resume evaluations only: per criterion a score 1–5 or null ("Nessuna evidenza nel CV") plus its evidence |
| Recommendation | `Evaluation.recommendation` | Raccomandazione (AI card) | AI free-text recommendation |
| Manual notes | `Evaluation.notes` | Note manuali | Free-text note on an evaluation |
| Decisione (pagina) | `/dashboard/applications/[id]/decision`, `getApplicationDecision`, `loadApplicationDecision` | Decisione | Decision page of one application: criterion × source matrix, overall score, must criteria to justify, devil's advocate, decision form, read-only history |
| Matrice della decisione | `DecisionMatrix`, `computeDecisionScore` | Criterio · CV · Test · Colloquio N (Media + one interviewer per column) · Valore · Peso | One row per criterion (active, plus archived with evidence on the application or present in the saved weights); cells with no evidence say "Nessuna prova"; "Disaccordo" badge |
| Valore del criterio | `CriterionDecisionRow.value` | Valore | Mean, with the same weight, of the available sources among CV, Test and the interviewers' mean; everything on a 1–5 scale |
| Punteggio complessivo | `DecisionScore.overall` | Punteggio complessivo; "Nessuna prova" | Weighted mean of the values of the criteria with evidence, with the weights of the scorecard (or the ones saved with the decision); never stored |
| Punteggi globali | `ApplicationDecision.cv.global`, `ApplicationDecision.test.global` | Punteggio globale CV / Test (non incluso nella media) | CV (`fitScore`) or Test (`quizScore`) brought to 1–5 when the per-criterion link is missing; they never enter the mean |
| Criteri indispensabili da motivare | `MustWarning`, `mustWarningText` | Criteri indispensabili da motivare · Da motivare | A `must` criterion with no evidence or below its expected level: it never zeroes the score, the rationale must address it |
| Esito della decisione | `Application.decision` (`DECISION_OUTCOME_VALUES`) | Offerta · Assunto · Scartato | `offer` · `hired` · `rejected` |
| Pesi della decisione | `Application.decisionWeights` (`decisionWeightsSchema`) | Pesi salvati con la decisione del … / Pesi della scheda di valutazione | `{ [criterionId]: weight 1–5 }` of the matrix criteria at the moment of the decision |
| Avvocato del diavolo | `challengeDecisionAction`, `generateDecisionChallenge`, task `decision_review` | Avvocato del diavolo; Chiedi all'avvocato del diavolo | AI proposal of the reasons why the outcome chosen in the form could be wrong; never saved |
| Preset | `Preset` | Preset; editor card "Smart Question Presets" | Saved recipe for generating one AI question of a given type |
| Reference data | `ReferenceData` | Dati di riferimento | Editable pick lists (languages, frameworks, databases, tools, soft skills, contract types, experience levels) |
| User | `User` (Better Auth) | Accedi; Utente · Amministratore | Staff account, created only by an administrator (no public registration, no email sent). `role`: `user` Utente · `admin` Amministratore; the admin role only grants user management. Every signed-in user sees and edits all selection data. Never deleted: banned instead |
| Profile | `Profile` | Profilo | App profile of a User (full name, user name, avatar) |
| Setup della posizione | `getPositionSetup`, `getPositionSetupStatus` | Setup della posizione | Checklist of Dettagli, Scheda di valutazione, Quiz, Guida colloquio. Dettagli is always done; the others are done when the part exists (scorecard with at least one active criterion, at least one quiz, at least one guide) |
| Le mie azioni | `getActionCenterData`, `components/dashboard/action-center.tsx` | Le mie azioni | Home `/dashboard`, the `overview` entry of `SECTIONS`. Lists tests to evaluate, stale applications, positions with incomplete setup (a `draft` or `open` position missing the scorecard, the quiz or the guide, each row saying "Manca: …"), "Colloqui senza kit pronto" (the scheduled interviews of today and tomorrow, Rome time, whose kit is not ready, towards preparation) and "Schede da compilare" (one row per participant of a completed interview without a submitted scorecard, towards the scorecard). With "Solo le mie" only the interviews the user participates in or owns and the scorecards the user is the interviewer of |
| Prossima azione | `getNextAction`, `components/applications/next-action-card.tsx` | Prossima azione | The action the application waits for: Valuta CV, Invia test, Genera valutazione, Pianifica colloquio (to `/dashboard/applications/{id}/interviews/new`), Prepara colloquio (to the preparation of the interview), Compila scheda (to the scorecard of the interview), Vai alla decisione (opens `/dashboard/applications/{id}/decision`), Passa a <fase>, Candidatura chiusa |
| Kanban Selezione | `components/applications/application-kanban.tsx`, `getApplicationsByPosition` | Tab "Selezione" of a position | One column per stage from Candidato to Assunto, plus "Chiuse" |
| Responsabile | `Application.ownerId` | Prendi in carico / Rilascia / Solo le mie | The recruiter in charge. Never limits access |
| Stato della posizione | `updatePositionStatusAction` | Apri / Chiudi / Riapri | Position status control in the position header (`components/positions/position-status-actions.tsx`) |
| Dashboard sections | `SECTIONS` | Panoramica (Le mie azioni); Selezione (Posizioni, Candidature, Candidati, Agenda colloqui); Libreria (Quiz, Test inviati, Preset); Impostazioni | Navigation groups, each with its colour token |

## Enums and status values

Application stage (`ApplicationStage`): `applied` Candidato · `screening` Screening · `assessment` Test · `interview` Colloquio · `decision` Decisione · `offer` Offerta · `hired` Assunto · `rejected` Scartato · `withdrawn` Ritirato.

Position status (`Position.status`): `draft` Bozza · `open` Aperta · `closed` Chiusa.

Assessment status (`AssessmentStatus`): `pending` In attesa (invited, not started) · `in_progress` In corso · `completed` Completato · `cancelled` Annullato. Derived, never stored: `expired` (in progress past the time limit; closing it stores `completed`).

Interview status (`InterviewStatus`): `scheduled` Pianificato · `in_progress` In corso · `completed` Concluso · `cancelled` Annullato · `no_show` Non presentato.

Interview participant role (`InterviewParticipantRole`): `lead` Conduttore · `observer` Osservatore.

Kit status (`KitStatus`): `draft` Kit in bozza · `ready` Kit pronto.

Kit item origin (`KitItemOrigin`): `template` Modello · `cv` CV · `resume_gap` Lacuna CV · `quiz_answer` Test · `previous_round` Round precedente · `manual` Manuale.

Missing kit source (`InterviewMissingSource`): `cv` CV · `cv_evaluation` Valutazione del CV · `assessment` Test · `answer_detail` Dettaglio risposte del test.

Question type (`QuestionType`): `multiple_choice` Scelta multipla · `open_question` Domanda aperta · `code_snippet` Snippet di codice · `behavioral_scenario` Scenario comportamentale.

Criterion category (`CriterionCategory`): `technical` Tecnico · `soft` Soft skill · `culture` Cultura.

Criterion priority (`CriterionPriority`): `must` Indispensabile · `nice` Preferibile.

Criterion source (`CriterionSource`): `skill` Competenza · `softSkill` Soft skill · `custom` Personalizzato.

Guide section kind (`GuideSectionKind`): `intro` Introduzione · `experience` Esperienza · `technical` Tecnica · `behavioral` Comportamentale · `candidate_questions` Domande del candidato · `closing` Chiusura.

Difficulty (1–5): Molto Facile · Facile · Medio · Difficile · Molto Difficile.

Preset tuning values: expected response length `short` Breve · `medium` Media · `long` Lunga; distractor complexity `simple` Semplice · `moderate` Moderato · `complex` Complesso; bug type `syntax` Sintassi · `logic` Logica · `performance` Performance · `security` Sicurezza; code complexity `basic` Base · `intermediate` Intermedio · `advanced` Avanzato.

Hire recommendation (`hireRecommendation`): `strong_yes` Assolutamente sì · `yes` Sì · `maybe` Forse · `no` No · `strong_no` Assolutamente no. Everywhere the labels come from `HIRE_RECOMMENDATION_LABEL`.

Decision outcome (`DECISION_OUTCOME_VALUES`): `offer` Offerta · `hired` Assunto · `rejected` Scartato.

Reference data categories: `programmingLanguage` Linguaggi · `framework` Framework · `database` Database · `tool` Strumenti (all feed `Position.skills`) · `soft_skill` Soft Skills (`softSkills`) · `contract_type` Tipi Contratto (`contractType`) · `experience_level` Livelli Esperienza (`experienceLevel`).

## Ambiguities

- **Quiz vs Assessment vs Colloquio.** The Quiz is the template (time limit lives here); the Assessment is one candidate's sitting (start time, answers, token), shown to recruiters as "Test" and to the candidate as "test" too ("Inizia il test"). "Colloquio" means only the live conversation: an `Interview` has a kit, a live mode and an interviewer scorecard per participant.
- **Assessment (entity) vs `assessment` (stage).** The entity is one sitting of a quiz; the stage is the step of an application in which tests are sent.
- **Candidate vs Application.** The Candidate is the person (personal record, CV, "Non ricontattare" flag); the Application is that person's candidacy for one Position and carries the stage. A candidate has no status of its own.
- **Evaluation has two kinds** in one table: assessment evaluation (`assessmentId` set, `candidateId`/`positionId` null) and resume evaluation (`candidateId` + `positionId`, `assessmentId` null).
- **Scores.** Per-answer score 0–10, stored in `Evaluation.answerEvaluations` for every assessment evaluation generated now (rows saved before it existed have none) · per-criterion score 1–5 or null ("Nessuna evidenza nel CV") in `Evaluation.criteriaAssessment`, resume evaluations only · `quizScore` 0–100 (assessment evaluation only) · `fitScore` stored 0–10 (the AI returns 0–100). The overall score of an application is computed on the Decision page (and in the summary of the "Decisione" tab) by `computeDecisionScore`, never stored. All sources are brought to 1–5: `CriterionScore` and the per-criterion CV score as they are; `answerEvaluations` and `fitScore` (0–10) and `quizScore` (0–100) with `1 + 4·v/max`, one decimal. The interviewer scorecard scores are 1–5 in `CriterionScore`, a different thing.
- **Recommendation.** `recommendation` = AI text; `hireRecommendation` = interviewer's enum on the interviewer scorecard. Both show as "Raccomandazione".
- **Esito della decisione vs Raccomandazione.** `Application.decision` is the outcome recorded by the recruiter (Offerta, Assunto, Scartato) and advances the stage. `hireRecommendation` is an interviewer's recommendation (scorecard); it never changes the stage.
- **Notes.** `notes` = "Note manuali" on an evaluation; the notes written during an interview are the live notes (`KitItemNote`) and the interviewer scorecard (`InterviewerFeedback`).
- **Scheda di valutazione vs Guida colloquio.** The scorecard says what to evaluate; the guide says how to run the interview. A guide can only be generated from a scorecard with at least one active criterion.
- **Guida colloquio vs Kit colloquio.** The guide is the position's template; the kit is its copy for one interview, editable only while the interview is planned. Editing or deleting the guide never touches a kit.
- **Criterio vs Criteri verificati.** A criterion belongs to the position's scorecard; a verified-criteria list is the subset a single question checks, stored on the link, on the guide question or on the kit question.
- **Preset vs Reference data.** Preset = AI generation recipe; reference data = form pick lists. Unrelated.
- **Question `id` vs `dbId`.** `dbId` is the Question row id inside form/AI objects; `id` there is a client-only key. In the kit editor every row carries its database id in `id`.
- **"Position"** always means the job opening, never an ordering (that is `QuizQuestion.order`, `KitItem.order`).
- **User vs Candidate.** Users are staff accounts; candidates never sign in and use only the public pages.
- **`createdBy` vs `ownerId`.** `createdBy` is the author and filters nothing; `ownerId` is the recruiter in charge and only feeds the "Solo le mie" view filter.

## Code-area map

| Area | Holds |
|---|---|
| `app/dashboard/` | Signed-in recruiter area: one folder per section (positions, applications, candidates, quizzes, presets, assessments, agenda, profile, settings/reference-data). `applications/` holds the list `/dashboard/applications` and `/dashboard/applications/[id]` with the tabs Panoramica, CV, Test, Colloqui, Decisione, plus `applications/[id]/interviews/new` and `applications/[id]/interviews/[interviewId]/prepare`, `/live`, `/feedback`, and `applications/[id]/decision`; `assessments/` holds `/dashboard/assessments`; `agenda/` holds `/dashboard/agenda`. The position page has the tabs Dettagli, Scheda di valutazione, Selezione, Quiz, Guide colloquio chosen by `?tab=` (`dettagli`, `scheda`, `selezione`, `quiz`, `guide`), with the subpages `scorecard`, `guides/new`, `guides/[guideId]` and the components `guides.tsx`, `scorecard-summary.tsx`, `setup-checklist.tsx` under `positions/[id]/components/` |
| `app/recruiting/` | Public candidate pages: apply form, assessment by token |
| `app/auth/` | Login, sign-up and password pages |
| `app/api/` | Route handlers: auth library, resume-evaluation stream, position-description stream |
| `proxy.ts` | Redirects signed-out visitors to login, except auth and recruiting pages |
| `lib/data/` | Cached reads, one module per entity, including `applications.ts`, `scorecards.ts`, `interview-guides.ts`, `interviews.ts` and `users.ts` |
| `lib/actions/` | Server actions, one module per entity, plus `run-action.ts`; `applications.ts` holds the stage and owner actions; `scorecards.ts` and `interview-guides.ts` hold the scorecard and guide actions; `interviews.ts`, `interview-kits.ts` and `interviewer-feedback.ts` hold the interview, kit and scorecard actions; `application-decisions.ts` holds the decision and the devil's advocate |
| `lib/services/` | Domain logic without Next.js: `applications.ts` (`setApplicationStage`, `advanceApplicationStage`, `applicationHasEvidence`, `syncCandidateApplications`), `scorecards.ts` (`saveScorecard`, `criterionHasEvidence`, `getActiveCriteria`, `assertActiveCriteria`), `interview-guides.ts` (`syncInterviewGuide`), `interviews.ts` (interview lifecycle and kit snapshot), `interview-kits.ts` (kit save and generation context), `application-decisions.ts` (`loadApplicationDecision`, `recordApplicationDecision`), assessment and resume evaluation, quiz-question sync, R2 storage, logger, `UserError` |
| `lib/services/ai/` | AI layer: `generate.ts` (`generateStructured`), `models.ts`, `core.ts` (`aiQuizService`), `prompts.ts`, `evaluation-prompts.ts`, `scorecard-generation.ts`, `guide-generation.ts`, `kit-generation.ts`, `decision-review.ts`, `streaming.ts`, `retry.ts`, `sanitize.ts`, `types.ts` |
| `lib/schemas/` | Zod schemas and inferred types (barrel `index.ts`), including `scorecard.ts`, `interview-guide.ts` and `interview.ts` |
| `lib/utils/` | `action-result.ts`, `cache-utils.ts`, `assessment-utils.ts`, `application-stage.ts` (stages, advancement, `furthestApplication`, `isApplicationStale`, kanban columns), `next-action.ts`, `decision-score.ts`, `application-timeline.ts`, `question-utils.ts`, `question-prompt-helpers.ts`, `quiz-form-utils.tsx`, `preset-icons.ts`, `criterion-keys.ts`, `position-setup.ts`, `scorecard-defaults.ts`, `token.ts`, `interview-status.ts`, `interview-calendar.ts`, `interview-feedback.ts`, `kit-proposal.ts` |
| `lib/` root | `auth.ts`, `auth-server.ts` (`requireUser`), `prisma.ts`, `utils.ts` (`cn`), `zod-config.ts` |
| `lib/prisma/` | Generated Prisma client — do not edit |
| `prisma/` | `schema.prisma`, `migrations/` (baseline `0_init` and the procedure `README.md`), `seed.ts` and `load-env.ts` |
| `components/ui/`, `components/ui/rhf-inputs/` | UI primitives and react-hook-form field wrappers |
| `components/dashboard/` | Dashboard shell (sidebar, breadcrumbs, sections, `action-center.tsx` "Le mie azioni", `assessment-pipeline.tsx` shown in `/dashboard/assessments`) |
| `components/applications/` | Stage badge and stepper, kanban, timeline, "Prossima azione" card, move-stage menu, owner controls, "Solo le mie" toggle, test send form, `criteria-assessment-list.tsx`, and the `decision/` folder (matrix, form, devil's advocate, tab summary, `decision-presentation.ts`, `decision-interview-columns-toggle.tsx`) |
| `components/scorecard/` | Scorecard editor, criterion row and `criterion-presentation.ts` |
| `components/interview-guides/` | Guide editor, section, question, "Genera dalla scheda" dialog and `guide-section-kind.ts` |
| `components/interviews/` | Interview presentation, card, scheduling, reschedule dialog, invite panel, kit editor and generation dialog, live mode, section timer, criteria coverage, interviewer scorecard form, submitted scorecard list, agenda list, legal reminder |
| `components/assessments/` | Test status, table and filters |
| `components/<entity>/` | Feature components; root files `page-header.tsx`, `skeletons.tsx` |
| `hooks/` | Client hooks (quiz editor, AI generation, `use-live-notes-autosave.ts`) |
| `tests/` | Vitest tests mirroring the source tree; `setup.ts`, `mocks/` |
| `knowledge/` | Project knowledge documents (changed only by the knowledge-builder role) |
| `agentic-system/` | Agentic runtime; sessions in `agentic-system-sessions/` |
