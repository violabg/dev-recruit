# CONTEXT — dev-recruit vocabulary

DevRecruit is an AI-assisted technical recruitment platform: recruiters define positions, build quizzes (often AI-generated), follow each application through its stages, send candidates a test, run live interviews, and get AI evaluations of answers and resumes. The UI is in Italian; code is in English. Rules live in `knowledge/` (read through the knowledge catalogue); this file only resolves terms. UI labels, navigation and the position and application pages follow `next-steps/UX_REDESIGN_DECISIONS.md`; screens not yet migrated by that plan still show the labels it replaces.

## Glossary

| Term | Code symbol | Italian UI label | Meaning |
|---|---|---|---|
| Position | `Position` | Posizione / Posizioni | A job opening: title, description, experience level, skills, soft skills, contract type, status |
| Criteri della posizione | `Scorecard` | Criteri | At most one per position: the criteria used to evaluate that position's candidates. Editor at `/dashboard/positions/[id]/scorecard`, reached from the position tab "Criteri e domande". Never called "scheda" |
| Criterio | `ScorecardCriterion` | Aggiungi criterio, Rimuovi criterio, Criteri archiviati | One row of the scorecard: name, description, category, priority, weight, expected level, anchors, source, order, `archivedAt` |
| Categoria del criterio | `CriterionCategory` | Categoria: Tecnico · Soft skill · Cultura | `technical` · `soft` · `culture` |
| Priorità del criterio | `CriterionPriority` | Priorità: Indispensabile · Preferibile | `must` · `nice` |
| Origine del criterio | `CriterionSource` | Badge: Competenza · Soft skill · Personalizzato | `skill` · `softSkill` · `custom`. Shown as a badge, not a select |
| Ancore | `anchors` (JSON `{ weak, medium, strong }`) | Risposta debole · Risposta media · Risposta forte | How a weak, medium and strong answer sounds; on the criterion and on the guide question |
| Criterio archiviato | `ScorecardCriterion.archivedAt` | Criteri archiviati ("conservati perché hanno già valutazioni") | Criterion removed from the scorecard but kept because it has evidence; there is no restore |
| Criteri soft di default | `DEFAULT_SOFT_CRITERIA` | Criteri soft di default: non sono ancora salvati | Five soft dimensions (Comunicazione, Collaborazione, Problem Solving, Culture Fit, Leadership), category `soft`, source `custom`, weight 3, expected level 3, `must` except Leadership `nice`; proposed as unsaved rows in an empty scorecard |
| Test | `Quiz` | Test; menu "Libreria" › Test | Reusable, ordered set of questions for one Position, with an optional time limit (minutes). The word "Quiz" never appears in the UI |
| Question | `Question` (DB row); `FlexibleQuestion` / `SavedQuestion` / `Question` (schema types) | Domanda / Domande | A reusable question. In forms and AI output the DB id is carried as `dbId` |
| Quiz question link | `QuizQuestion` | — | Quiz ↔ Question link with `order` and `criterionIds` |
| Criteri verificati | `QuizQuestion.criterionIds`, `GuideQuestion.criterionIds`, `KitItem.criterionIds` | Criteri verificati | Scorecard criteria a question verifies. For quizzes they live on the link, never on `Question`; the same question in another quiz has its own list |
| Favorite question | `Question.isFavorite` | Preferite, Domande Preferite | Question kept for reuse; survives removal from its quiz |
| Candidate | `Candidate` | Candidato / Candidati | A person applying. Never signs in |
| Application | `Application` | Candidatura / Candidature | One Candidate for one Position. Holds the stage; assessments, evaluations and interviews are evidence collected on it |
| Application stage | `Application.stage` (`ApplicationStage`) | Fase | Where the application is in the hiring flow |
| Public application | `applyAsCandidateAction` | Unisciti al nostro team! | Public form where candidates apply with a CV; an email already known adds the application to the existing candidate |
| Resume | `Candidate.resumeUrl` | Curriculum Vitae / Curriculum / CV | PDF stored in Cloudflare R2 |
| Test inviato | `Assessment` | Test inviato / Test inviati (dashboard); the candidate sees "Inizia il test" | One Candidate taking one Quiz, inside one Application: token, status, timing, answers |
| Assessment token | `Assessment.token` | — (part of the link) | The candidate's only credential, in the public assessment link |
| Colloquio | `Interview` | Colloquio / Colloqui | The live conversation with the candidate, on one application; several interviews per application (rounds). Never an `Assessment`, never a `Quiz` |
| Round | `Interview.round` | Round N | The number of the interview in its application; proposed as the application's non-cancelled interviews + 1, not unique |
| Stato del colloquio | `InterviewStatus` | Pianificato · In corso · Concluso · Annullato · Non presentato | `scheduled` · `in_progress` · `completed` · `cancelled` · `no_show` |
| Partecipante | `InterviewParticipant` | Partecipanti | A user of the app taking part in an interview; one per user and interview |
| Conduttore / Osservatore | `InterviewParticipantRole` | Conduttore · Osservatore | `lead` (exactly one per interview) · `observer` |
| Preparazione | `InterviewKit` | Preparazione; Preparazione in bozza · Preparazione pronta | One per interview: a copy of the traccia (sections and questions) with briefing, hypotheses to verify, checklist and missing sources; status `draft` · `ready`. The word "kit" never appears in the UI |
| Sezione della preparazione | `KitSection` | — | A copy of a guide section (title, minutes, order, kind) |
| Domanda della preparazione | `KitItem` | Domanda | A question of a kit section with follow-ups, criteria, anchors, required flag, order, origin, rationale ("Perché"), source, `edited` ("ritoccata"), `covered` ("Coperta") |
| Origine della domanda | `KitItemOrigin` | Modello · CV · Lacuna CV · Test · Round precedente · Manuale | `template` (a traccia question, copied) · `cv` · `resume_gap` · `quiz_answer` · `previous_round` (personalised questions proposed by the AI) · `manual` |
| Domanda del modello / personalizzata | `origin = template` / AI origin | Modello / CV, Lacuna CV, Test, Round precedente | Template questions come from the traccia and are never replaced; personalised ones are proposed by the AI and added |
| Nota live | `KitItemNote` | Nota rapida, Voto, Citazione a supporto | A note, a 1–5 score and a participant's quote on one question; one per participant and question; visible only to its author until they submit their feedback |
| Feedback | `InterviewerFeedback` | Feedback del colloquio; Scrivi il feedback · Salva bozza · Invia feedback | A participant's evaluation of one interview: final recommendation, notes, red flags, standout moments, per-criterion scores; one per participant and interview. Never "scheda" |
| Voto per criterio | `CriterionScore` | Valutazione per criterio | A 1–5 score and evidence of a feedback on one criterion; an unscored criterion ("Senza prove") has no row |
| Modalità live | `/dashboard/applications/[id]/interviews/[interviewId]/live` | Colloquio live | The page used during the interview; always current data (no cache) |
| Agenda | `/dashboard/agenda`, `SECTIONS.agenda` | Agenda; Solo i miei | Scheduled and in-progress interviews, by day; entry of the main sidebar group |
| Traccia del colloquio | `InterviewGuide` | Traccia del colloquio / Tracce | The interview template of a position: one or more per position (one per round by convention, not by constraint), with title, round and duration |
| Sezione della traccia | `GuideSection` | Titolo sezione, Aggiungi sezione, Somma sezioni | Ordered part of a guide with title, minutes and kind |
| Tipo di sezione | `GuideSectionKind` | Tipo: Introduzione · Esperienza · Tecnica · Comportamentale · Domande del candidato · Chiusura | `intro` · `experience` · `technical` · `behavioral` · `candidate_questions` · `closing` |
| Domanda della traccia | `GuideQuestion` | Domanda, Approfondimenti, Criteri verificati, Obbligatoria | Text, follow-ups, verified criteria, anchors, required flag, order |
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
| Pesi della decisione | `Application.decisionWeights` (`decisionWeightsSchema`) | Pesi salvati con la decisione del … / Pesi dei criteri | `{ [criterionId]: weight 1–5 }` of the matrix criteria at the moment of the decision |
| Avvocato del diavolo | `challengeDecisionAction`, `generateDecisionChallenge`, task `decision_review` | Avvocato del diavolo; Chiedi all'avvocato del diavolo | AI proposal of the reasons why the outcome chosen in the form could be wrong; never saved |
| Preset | `Preset` | Preset; editor card "Smart Question Presets" | Saved recipe for generating one AI question of a given type |
| Reference data | `ReferenceData` | Dati di riferimento | Editable pick lists (languages, frameworks, databases, tools, soft skills, contract types, experience levels) |
| User | `User` (Better Auth) | Accedi / Registrazione; Utente · Amministratore | Staff account, from the open sign-up form or created by an administrator. No email is sent: a new account signs in only after an administrator switches its email verification on. `role`: `user` Utente · `admin` Amministratore; the admin role only grants user management. Every signed-in user sees and edits all selection data. Never deleted: banned instead |
| Profile | `Profile` | Profilo (the user's own) | App profile of a User (full name, user name, avatar) |
| Criteri e domande | `getPositionSetup`, `getPositionSetupStatus` | Tab "Criteri e domande"; "da completare" | What the position asks and how it checks it: Criteri, Test, Tracce, with the coverage of each criterion. Complete when the part exists (scorecard with at least one active criterion, at least one quiz, at least one guide); never called "setup" in the UI |
| Le mie azioni | `getActionCenterData`, `components/dashboard/action-center.tsx` | Le mie azioni | Home `/dashboard`, the `overview` entry of `SECTIONS`. Lists "Posizioni da preparare" (a `draft` or `open` position missing the scorecard, the quiz or the guide, each row saying "Manca: …"), tests to evaluate, "Colloqui senza preparazione pronta" (the scheduled interviews of today and tomorrow, Rome time, whose kit is not ready, towards preparation), "Feedback da inviare" (one row per participant of a completed interview without a submitted feedback, towards the feedback) and stale applications. With "Solo le mie" only the interviews the user participates in or owns and the feedback the user is the interviewer of |
| Prossima azione | `getNextAction`, `components/applications/next-action-card.tsx` | Prossima azione | The action the application waits for: Valuta CV, Invia test, Genera valutazione, Pianifica colloquio (to `/dashboard/applications/{id}/interviews/new`), Prepara colloquio (to the preparation of the interview), Scrivi il feedback (to the feedback of the interview), Vai alla decisione (opens `/dashboard/applications/{id}/decision`), Passa a <fase>, Candidatura chiusa |
| Kanban Candidati | `components/applications/application-kanban.tsx`, `getApplicationsByPosition` | Tab "Candidati" of a position | One column per stage from Candidato to Assunto, plus "Chiuse" |
| Responsabile | `Application.ownerId` | Prendi in carico / Rilascia / Solo le mie | The recruiter in charge. Never limits access |
| Stato della posizione | `updatePositionStatusAction` | Apri / Chiudi / Riapri | Position status control in the position header (`components/positions/position-status-actions.tsx`) |
| Dashboard sections | `SECTIONS` | Main group (Le mie azioni, Posizioni, Candidati, Agenda); Libreria (Test, Test inviati, Preset); Impostazioni | Navigation groups, each with its colour token. Candidature has no menu entry: `/dashboard/applications` is reached by link |

## Enums and status values

Application stage (`ApplicationStage`): `applied` Candidato · `screening` Screening · `assessment` Test · `interview` Colloquio · `decision` Decisione · `offer` Offerta · `hired` Assunto · `rejected` Scartato · `withdrawn` Ritirato.

Position status (`Position.status`): `draft` Bozza · `open` Aperta · `closed` Chiusa.

Assessment status (`AssessmentStatus`): `pending` In attesa (invited, not started) · `in_progress` In corso · `completed` Completato · `cancelled` Annullato. Derived, never stored: `expired` (in progress past the time limit; closing it stores `completed`).

Interview status (`InterviewStatus`): `scheduled` Pianificato · `in_progress` In corso · `completed` Concluso · `cancelled` Annullato · `no_show` Non presentato.

Interview participant role (`InterviewParticipantRole`): `lead` Conduttore · `observer` Osservatore.

Kit status (`KitStatus`): `draft` Preparazione in bozza · `ready` Preparazione pronta.

Kit item origin (`KitItemOrigin`): `template` Modello · `cv` CV · `resume_gap` Lacuna CV · `quiz_answer` Test · `previous_round` Round precedente · `manual` Manuale.

Missing preparation source (`InterviewMissingSource`): `cv` CV · `cv_evaluation` Valutazione del CV · `assessment` Test · `answer_detail` Dettaglio risposte del test.

Question type (`QuestionType`): `multiple_choice` Scelta multipla · `open_question` Domanda aperta · `code_snippet` Snippet di codice · `behavioral_scenario` Scenario comportamentale.

Criterion category (`CriterionCategory`): `technical` Tecnico · `soft` Soft skill · `culture` Cultura.

Criterion priority (`CriterionPriority`): `must` Indispensabile · `nice` Preferibile.

Criterion source (`CriterionSource`): `skill` Competenza · `softSkill` Soft skill · `custom` Personalizzato.

Guide section kind (`GuideSectionKind`): `intro` Introduzione · `experience` Esperienza · `technical` Tecnica · `behavioral` Comportamentale · `candidate_questions` Domande del candidato · `closing` Chiusura.

Difficulty (1–5): Molto Facile · Facile · Medio · Difficile · Molto Difficile.

Preset tuning values: expected response length `short` Breve · `medium` Media · `long` Lunga; distractor complexity `simple` Semplice · `moderate` Moderato · `complex` Complesso; bug type `syntax` Sintassi · `logic` Logica · `performance` Performance · `security` Sicurezza; code complexity `basic` Base · `intermediate` Intermedio · `advanced` Avanzato.

Hire recommendation (`hireRecommendation`, on the feedback): `strong_yes` Assolutamente sì · `yes` Sì · `maybe` Forse · `no` No · `strong_no` Assolutamente no. Everywhere the labels come from `HIRE_RECOMMENDATION_LABEL`.

Decision outcome (`DECISION_OUTCOME_VALUES`): `offer` Offerta · `hired` Assunto · `rejected` Scartato.

Reference data categories: `programmingLanguage` Linguaggi · `framework` Framework · `database` Database · `tool` Strumenti (all feed `Position.skills`) · `soft_skill` Soft Skills (`softSkills`) · `contract_type` Tipi Contratto (`contractType`) · `experience_level` Livelli Esperienza (`experienceLevel`).

## Ambiguities

- **Test vs Test inviato vs Colloquio.** "Test" (`Quiz`) is the template (time limit lives here); "Test inviato" (`Assessment`) is one candidate's sitting (start time, answers, token); the candidate sees "test" ("Inizia il test"). "Colloquio" means only the live conversation: an `Interview` has a preparation, a live mode and a feedback per participant.
- **Assessment (entity) vs `assessment` (stage).** The entity is one sitting of a quiz; the stage is the step of an application in which tests are sent.
- **Candidate vs Application.** The Candidate is the person (personal record, CV, "Non ricontattare" flag); the Application is that person's candidacy for one Position and carries the stage. A candidate has no status of its own.
- **Evaluation has two kinds** in one table: assessment evaluation (`assessmentId` set, `candidateId`/`positionId` null) and resume evaluation (`candidateId` + `positionId`, `assessmentId` null).
- **Scores.** Per-answer score 0–10, stored in `Evaluation.answerEvaluations` for every assessment evaluation generated now (rows saved before it existed have none) · per-criterion score 1–5 or null ("Nessuna evidenza nel CV") in `Evaluation.criteriaAssessment`, resume evaluations only · `quizScore` 0–100 (assessment evaluation only) · `fitScore` stored 0–10 (the AI returns 0–100). The overall score of an application is computed on the Decision page (and in the summary of the Decisione stop of the application page) by `computeDecisionScore`, never stored. All sources are brought to 1–5: `CriterionScore` and the per-criterion CV score as they are; `answerEvaluations` and `fitScore` (0–10) and `quizScore` (0–100) with `1 + 4·v/max`, one decimal. The feedback scores are 1–5 in `CriterionScore`, a different thing.
- **Recommendation.** `recommendation` = AI text; `hireRecommendation` = interviewer's enum on the feedback. Both show as "Raccomandazione".
- **Esito della decisione vs Raccomandazione.** `Application.decision` is the outcome recorded by the recruiter (Offerta, Assunto, Scartato) and advances the stage. `hireRecommendation` is an interviewer's recommendation (feedback); it never changes the stage.
- **Notes.** `notes` = "Note manuali" on an evaluation; the notes written during an interview are the live notes (`KitItemNote`) and the feedback (`InterviewerFeedback`).
- **Criteri vs Traccia del colloquio.** The criteri (`Scorecard`) say what to evaluate; the traccia (`InterviewGuide`) says how to run the interview. A traccia can only be generated from criteri with at least one active criterion.
- **Traccia vs Preparazione.** The traccia (`InterviewGuide`) is the position's template; the preparazione (`InterviewKit`) is its copy for one interview, editable only while the interview is planned. Editing or deleting the traccia never touches a preparazione.
- **Feedback vs Valutazione.** "Feedback" is an interviewer's judgement of one interview (`InterviewerFeedback`); "Valutazione" is only the AI evaluation of a CV or a test (`Evaluation`).
- **Profilo candidato vs Profilo.** "Profilo candidato" is the candidate's page; "Profilo" alone is the signed-in user's own profile.
- **Criterio vs Criteri verificati.** A criterion belongs to the position's scorecard; a verified-criteria list is the subset a single question checks, stored on the link, on the guide question or on the kit question.
- **Preset vs Reference data.** Preset = AI generation recipe; reference data = form pick lists. Unrelated.
- **Question `id` vs `dbId`.** `dbId` is the Question row id inside form/AI objects; `id` there is a client-only key. In the kit editor every row carries its database id in `id`.
- **"Position"** always means the job opening, never an ordering (that is `QuizQuestion.order`, `KitItem.order`).
- **User vs Candidate.** Users are staff accounts; candidates never sign in and use only the public pages.
- **`createdBy` vs `ownerId`.** `createdBy` is the author and filters nothing; `ownerId` is the recruiter in charge and only feeds the "Solo le mie" view filter.

## Code-area map

| Area | Holds |
|---|---|
| `app/dashboard/` | Signed-in recruiter area: one folder per section (positions, applications, candidates, quizzes, presets, assessments, agenda, profile, settings/reference-data). `applications/` holds the list `/dashboard/applications` and `/dashboard/applications/[id]`, a vertical story of stops (CV, one per test sent, one per interview, Decisione) with the current stop open, plus `applications/[id]/interviews/new` and `applications/[id]/interviews/[interviewId]/prepare` (read-only) with `/prepare/edit` (preparation editor), `/live`, `/feedback`, and `applications/[id]/decision`; `assessments/` holds `/dashboard/assessments`; `agenda/` holds `/dashboard/agenda`. The position page has the tabs Candidati, Criteri e domande, Dettagli chosen by `?tab=` (`candidati`, `criteri`, `dettagli`; the values `selezione` → `candidati` and `scheda`, `quiz`, `guide` → `criteri` still resolve), with the subpages `scorecard`, `guides/new`, `guides/[guideId]` (read-only) with `guides/[guideId]/edit` (traccia editor) and the components `guides.tsx`, `scorecard-summary.tsx`, `setup-checklist.tsx` under `positions/[id]/components/` |
| `app/recruiting/` | Public candidate pages: apply form (`/recruiting`), single-position apply (`/recruiting/positions/[id]`), assessment by token |
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
| `components/interview-guides/` | Traccia editor, section, question, "Genera dai criteri" dialog and `guide-section-kind.ts` |
| `components/interviews/` | Interview presentation, card, scheduling, reschedule dialog, invite panel, kit editor and generation dialog, live mode, section timer, criteria coverage, interviewer scorecard form, submitted scorecard list, agenda list, legal reminder |
| `components/assessments/` | Test status, table and filters |
| `components/<entity>/` | Feature components; root files `page-header.tsx`, `skeletons.tsx` |
| `hooks/` | Client hooks (quiz editor, AI generation, `use-live-notes-autosave.ts`) |
| `tests/` | Vitest tests mirroring the source tree; `setup.ts`, `mocks/` |
| `knowledge/` | Project knowledge documents (changed only by the knowledge-builder role) |
| `agentic-system/` | Agentic runtime; sessions in `agentic-system-sessions/` |
