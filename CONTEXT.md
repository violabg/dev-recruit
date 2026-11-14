# CONTEXT — dev-recruit vocabulary

DevRecruit is an AI-assisted technical recruitment platform: recruiters define positions, build quizzes (often AI-generated), invite candidates to take them, and get AI evaluations of answers and resumes. The UI is in Italian; code is in English. Rules live in `knowledge/` (read through the knowledge catalogue); this file only resolves terms.

## Glossary

| Term | Code symbol | Italian UI label | Meaning |
|---|---|---|---|
| Position | `Position` | Posizione / Posizioni | A job opening: title, description, experience level, skills, soft skills, contract type |
| Quiz | `Quiz` | Quiz | Reusable, ordered set of questions for one Position, with an optional time limit (minutes) |
| Question | `Question` (DB row); `FlexibleQuestion` / `SavedQuestion` / `Question` (schema types) | Domanda / Domande | A reusable question. In forms and AI output the DB id is carried as `dbId` |
| Quiz question link | `QuizQuestion` | — | Quiz ↔ Question link with `order` |
| Favorite question | `Question.isFavorite` | Preferite, Domande Preferite | Question kept for reuse; survives removal from its quiz |
| Candidate | `Candidate` | Candidato / Candidati | A person applying. Never signs in |
| Candidate position | `CandidatePosition`, `isPrimary` | Primaria (badge) | Candidate ↔ Position link; the first one is the primary position |
| Public application | `applyAsCandidateAction` | Unisciti al nostro team! | Public form where candidates apply with a CV |
| Resume | `Candidate.resumeUrl` | Curriculum Vitae / Curriculum / CV | PDF stored in Cloudflare R2 |
| Interview | `Interview` | Colloquio / Colloqui (dashboard); the candidate sees "Inizia il quiz" | One Candidate taking one Quiz: token, status, timing, answers |
| Interview token | `Interview.token` | — (part of the link) | The candidate's only credential, in the public interview link |
| Invite / assignment | `assignCandidatesToQuizAction`, `assignQuizzesToCandidateAction` | Invita, Assegna quiz, Associa quiz | Creating pending interviews for candidate + quiz pairs |
| Answer | `Interview.answers` | — | Stored per Question id |
| Voice answer | `transcribeAudioAction` | — | Recorded audio transcribed to text |
| Interview evaluation | `Evaluation` with `interviewId` | Valutazione complessiva AI | AI scoring of an interview's answers plus an overall assessment |
| Resume evaluation | `Evaluation` with `candidateId` + `positionId` | Valutazioni (del curriculum) | AI assessment of a resume against one Position, streamed |
| Fit score | `Evaluation.fitScore` | Punteggio di idoneità / Fit score | AI fit judgement, stored 0–10 |
| Quiz score | `Evaluation.quizScore` | Quiz score / Punteggio complessivo | Interview only: percentage 0–100 of points earned |
| Recommendation | `Evaluation.recommendation` | Raccomandazione (AI card) | AI free-text recommendation |
| Hiring notes | `interviewNotes`, `redFlags`, `standoutMoments`, `hireRecommendation`, `nextSteps` | Note del colloquio, Red flags, Momenti di rilievo, Raccomandazione, Prossimi step; card "Decisione hiring" | Hiring manager's decision recorded on an evaluation |
| Manual notes | `Evaluation.notes` | Note manuali | Free-text note on an evaluation |
| Behavioral rubric | `BehavioralRubric` | Comunicazione, Collaborazione, Problem Solving, Culture Fit, Leadership; card "Scenario comportamentale" | Recruiter's manual 1–5 soft-skill scores per candidate + position |
| Evaluation dashboard | — | Dashboard valutazione / Valutazione unificata | Computed overall score from quiz, rubric and hiring decision |
| Preset | `Preset` | Preset; editor card "Smart Question Presets" | Saved recipe for generating one AI question of a given type |
| Reference data | `ReferenceData` | Dati di riferimento | Editable pick lists (languages, frameworks, databases, tools, soft skills, contract types, experience levels) |
| User | `User` (Better Auth) | Accedi / Registrazione | Recruiter account. Every signed-in user sees everything |
| Profile | `Profile` | Profilo | App profile of a User (full name, user name, avatar) |
| Dashboard sections | `SECTIONS` | Panoramica; Selezione (Posizioni, Candidati, Colloqui); Libreria (Quiz, Preset); Impostazioni | Navigation groups, each with its colour token |

## Enums and status values

Candidate status (`Candidate.status`): `pending` In attesa · `contacted` Contattato · `interviewing` In colloquio · `hired` Assunto · `rejected` Rifiutato.

Interview status (`InterviewStatus`): `pending` In attesa (invited, not started) · `in_progress` In corso · `completed` Completato · `cancelled` Annullato. Derived, never stored: `expired` (in progress past the time limit; closing it stores `completed`).

Question type (`QuestionType`): `multiple_choice` Scelta multipla · `open_question` Domanda aperta · `code_snippet` Snippet di codice · `behavioral_scenario` Scenario comportamentale.

Difficulty (1–5): Molto Facile · Facile · Medio · Difficile · Molto Difficile.

Preset tuning values: expected response length `short` Breve · `medium` Media · `long` Lunga; distractor complexity `simple` Semplice · `moderate` Moderato · `complex` Complesso; bug type `syntax` Sintassi · `logic` Logica · `performance` Performance · `security` Sicurezza; code complexity `basic` Base · `intermediate` Intermedio · `advanced` Avanzato.

Hire recommendation (`hireRecommendation`): `strong_yes` · `yes` · `maybe` · `no` · `strong_no`.

Reference data categories: `programmingLanguage` Linguaggi · `framework` Framework · `database` Database · `tool` Strumenti (all feed `Position.skills`) · `soft_skill` Soft Skills (`softSkills`) · `contract_type` Tipi Contratto (`contractType`) · `experience_level` Livelli Esperienza (`experienceLevel`).

## Ambiguities

- **Quiz vs Interview.** The Quiz is the template (time limit lives here); the Interview is one candidate's sitting (start time, answers, token). "Colloquio", "Intervista" and the candidate-side "quiz" all mean the Interview.
- **Evaluation has two kinds** in one table: interview evaluation (`interviewId` set, `candidateId`/`positionId` null) and resume evaluation (`candidateId` + `positionId`, `interviewId` null).
- **Scores.** Per-answer score 0–10 (not stored) · `quizScore` 0–100 (interview only) · `fitScore` stored 0–10 (the AI returns 0–100).
- **Recommendation.** `recommendation` = AI text; `hireRecommendation` = hiring manager's enum. Both show as "Raccomandazione".
- **Notes.** `notes` = "Note manuali"; `interviewNotes` = "Note del colloquio" (part of hiring notes).
- **`behavioral_scenario` vs Behavioral rubric.** The first is an AI-scored quiz question type; the second is the recruiter's manual scoring.
- **Preset vs Reference data.** Preset = AI generation recipe; reference data = form pick lists. Unrelated.
- **Question `id` vs `dbId`.** `dbId` is the Question row id inside form/AI objects; `id` there is a client-only key.
- **"Position"** always means the job opening, never an ordering (that is `QuizQuestion.order`).
- **User vs Candidate.** Users are staff accounts; candidates never sign in and use only the public pages.
- **`createdBy`** is the author, never an owner filter.

## Code-area map

| Area | Holds |
|---|---|
| `app/dashboard/` | Signed-in recruiter area: one folder per section (positions, candidates, quizzes, presets, interviews, profile, settings/reference-data) |
| `app/recruiting/` | Public candidate pages: apply form, interview by token |
| `app/auth/` | Login, sign-up and password pages |
| `app/api/` | Route handlers: auth library, resume-evaluation stream, position-description stream |
| `proxy.ts` | Redirects signed-out visitors to login, except auth and recruiting pages |
| `lib/data/` | Cached reads, one module per entity |
| `lib/actions/` | Server actions, one module per entity, plus `run-action.ts` |
| `lib/services/` | Domain logic without Next.js: interview and resume evaluation, quiz-question sync, R2 storage, logger, `UserError` |
| `lib/services/ai/` | AI layer: `generate.ts` (`generateStructured`), `models.ts`, `core.ts` (`aiQuizService`), `prompts.ts`, `evaluation-prompts.ts`, `streaming.ts`, `retry.ts`, `sanitize.ts`, `types.ts` |
| `lib/schemas/` | Zod schemas and inferred types (barrel `index.ts`) |
| `lib/utils/` | `action-result.ts`, `cache-utils.ts`, `interview-utils.ts`, `question-utils.ts`, `question-prompt-helpers.ts`, `quiz-form-utils.tsx`, `preset-icons.ts`, `token.ts` |
| `lib/` root | `auth.ts`, `auth-server.ts` (`requireUser`), `prisma.ts`, `utils.ts` (`cn`), `zod-config.ts` |
| `lib/prisma/` | Generated Prisma client — do not edit |
| `prisma/` | `schema.prisma`, `seed.ts` |
| `components/ui/`, `components/ui/rhf-inputs/` | UI primitives and react-hook-form field wrappers |
| `components/dashboard/` | Dashboard shell (sidebar, breadcrumbs, sections, interview pipeline) |
| `components/<entity>/` | Feature components; root files `page-header.tsx`, `skeletons.tsx` |
| `hooks/` | Client hooks (quiz editor, AI generation) |
| `tests/` | Vitest tests mirroring the source tree; `setup.ts`, `mocks/` |
| `knowledge/` | Project knowledge documents (changed only by the knowledge-builder role) |
| `agentic-system/` | Agentic runtime; sessions in `agentic-system-sessions/` |
