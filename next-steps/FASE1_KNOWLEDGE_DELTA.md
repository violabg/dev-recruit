# Fase 1 — Aggiornamenti per knowledge-builder

Questo file elenca le affermazioni di `knowledge/` e di `CONTEXT.md` che la Fase 1 ha reso superate o incomplete. Serve al ruolo knowledge-builder, l'unico autorizzato a modificare questi file: nessuna operazione della Fase 1 li ha toccati. **Anche `CONTEXT.md` va aggiornato, sebbene non sia nel catalogo della knowledge**: va nominato esplicitamente tra i file da aggiornare quando si avvia knowledge-builder. Ogni voce è stata verificata sul codice reale. Riporta il file, la riga o la sezione, cosa dice oggi e cosa fa ora il codice, con il percorso del codice.

## knowledge/testing.md

### 1. Riga 16 — factory di test inesistenti

- **Dice oggi:** "Shared data factories (`mockUser`, `mockQuiz`, `mockPosition`, `mockCandidate`, `mockAssessment`, `mockEvaluation`, `mockPreset`, question mocks) are exported from `@/tests/mocks`."
- **Codice:** `tests/mocks/index.ts` esporta solo le factory delle domande: `mockMultipleChoiceQuestion`, `mockOpenQuestion`, `mockCodeSnippetQuestion`. Nessuna delle altre factory esiste; i test costruiscono i dati inline.

### 2. Riga 29 — modelli del mock globale di Prisma

- **Dice oggi:** elenca come esempi di modelli assenti dal mock globale `upsert`, `profile`, `behavioralRubric`, `referenceData`.
- **Codice:** `tests/setup.ts` contiene ora anche il delegato `application` (righe 75–83) e `assessment.updateMany` (righe 84–93). `behavioralRubric` resta assente e richiede ancora un mock a livello di file (come in `tests/lib/data/applications.test.ts`). Voce incompleta, non errata: aggiungere `application` tra i delegati presenti.

## knowledge/cache_invalidation.md

### 3. Riga 62 — opzioni e percorsi di `invalidateCandidateCache`

- **Dice oggi:** `invalidateCandidateCache({ candidateId?, positionId?, positionIds?, deleted? })`.
- **Codice:** `lib/utils/cache-utils.ts:197` accetta anche `applicationId?` e `applicationIds?`. Oltre ai tag, rivalida sempre `/dashboard/candidates`, `/dashboard/applications` e `/dashboard` (la home "Le mie azioni"), più `/dashboard/applications/{id}` per ogni candidatura passata (`revalidateApplicationPaths`, riga 186). Le candidature non hanno un tag proprio: ogni scrittura su una candidatura chiama questo helper con candidato, posizione/i e id della candidatura (commento alle righe 193–196).

### 4. Tabella "Invalidating mutations" — helper mancante `invalidateCandidateCacheInRouteHandler`

- **Dice oggi:** la tabella ha la variante per route handler solo per le valutazioni (`invalidateEvaluationCacheInRouteHandler`).
- **Codice:** `lib/utils/cache-utils.ts:241` definisce `invalidateCandidateCacheInRouteHandler({ candidateId?, positionId?, applicationId? })`. Scade `candidates` e i tag di entità con `revalidateTag(…, { expire: 0 })` e rivalida gli stessi percorsi della variante per le action. È usato da `app/api/evaluations/stream/route.ts:78`, perché la valutazione del CV può far avanzare la candidatura a screening.

### 5. Riga 63 — percorsi di `invalidateAssessmentCache`

- **Dice oggi:** la tabella non indica percorsi.
- **Codice:** `lib/utils/cache-utils.ts:272` rivalida anche `/dashboard` (la home "Le mie azioni" elenca i test da valutare), oltre a `/dashboard/assessments` e `/dashboard/assessments/{id}`.

### 6. Riga 66 — percorsi di `invalidateBehavioralRubricCache`

- **Dice oggi:** solo i tag (`behavioral-rubrics` e l'entità).
- **Codice:** `lib/utils/cache-utils.ts:333` rivalida `/dashboard/candidates/{candidateId}` e `/dashboard/applications`. Non esiste più il percorso della Dashboard valutazione (`/dashboard/candidates/{id}/evaluation-dashboard`), rimossa a favore della tab Decisione della candidatura.

### 7. Righe 19–35 e 51 — nessun tag per gli utenti; Application non è più una tabella di collegamento

- **Dice oggi:** il vocabolario dei tag non ha voci per gli utenti. La riga 51 dice "Join tables have no tag of their own".
- **Codice:**
  - Le letture in cache delle candidature includono il nome del responsabile (`ownerSelect = { select: { id: true, name: true } }`, `lib/data/applications.ts:24`). Sono taggate con `candidates`, `positions`, ecc., ma nessun tag copre `User`: se un utente cambia nome, le letture restano vecchie finché non scade un altro tag o il `cacheLife`. Va deciso e scritto se serve un tag per gli utenti o se il comportamento è accettato.
  - `Application` è un'entità con fase e responsabile, non un collegamento. Non ha un tag proprio ed è coperta da `candidates` più i tag di entità di candidato e posizione (letture in `lib/data/applications.ts`, ad esempio righe 205–211 e 269–272).

### 8. Sezione "Where caching lives" — lettura della sessione dopo una richiesta reale

- **Dice oggi:** "`requireUser()` and `getCurrentUser()` read the session cookie, so the framework's rules for request APIs apply to them: never inside a `"use cache"` scope."
- **Codice:** con Partial Prefetching attivo (`next.config.ts`), `headers()` si risolve nell'App Shell. Un server component che legge la sessione dopo aver atteso solo `params` noti da `generateStaticParams`, o nient'altro, fa eseguire `auth.api.getSession` durante il prerender: errore "Blocking Route… unstable value `new Date()`" su `/dashboard/applications/[id]`. Oggi ogni server component che legge la sessione ha prima `await connection()` oppure `await searchParams`:
  - `app/dashboard/applications/[id]/application-header.tsx`, `app/page.tsx` (`StartButton`), `app/dashboard/profile/page.tsx` e `app/dashboard/profile/edit/page.tsx` usano `connection()`;
  - `app/dashboard/page.tsx` e `app/dashboard/applications/runtime-section.tsx` usano `searchParams`.

  Regola del progetto da aggiungere.

## knowledge/server_actions.md

### 9. Sezione "Authentication and public actions" e azioni nuove

- **Dice oggi:** il documento non elenca le action per entità; la tabella delle action pubbliche ne conta sei.
- **Codice:**
  - Nuove action autenticate (tutte con `requireUser()`): `moveApplicationStageAction` e `setApplicationOwnerAction` in `lib/actions/applications.ts:22` e `:52`, `updatePositionStatusAction` in `lib/actions/positions.ts:79`.
  - Le action pubbliche sono ancora esattamente sei: `startAssessmentAction`, `submitAnswerAction`, `completeAssessmentAction`, `transcribeAudioAction`, `applyAsCandidateAction`, `fetchPositionDataAction`.
  - `fetchPositionDataAction` restituisce `position: null` anche per una posizione esistente che non è `open` (`lib/actions/positions.ts:150`).

  Voce incompleta: valutare se citare le tre action nuove dove il documento parla del contratto.

## knowledge/domain_model.md

### 10. Riga 21 — campi di esito della candidatura

- **Dice oggi:** chiavi di `Application`: unique (`candidateId`, `positionId`), `stage`, `stageChangedAt`, `ownerId?`.
- **Codice:** `prisma/schema.prisma:189–199` aggiunge i campi di esito `decision?`, `decisionRationale?`, `decidedBy?` (relazione `decider` verso `User`, `onDelete: SetNull`), `decidedAt?`, `decisionWeights?` (Json). Sono scritti dalla Fase 4; oggi nessuna action li valorizza.

### 11. Riga 36 — regole del responsabile

- **Dice oggi:** `ownerId` nomina il recruiter responsabile e alimenta il filtro "le mie".
- **Codice:**
  - Creazione dalla dashboard: il responsabile è l'utente che crea, `ownerId: user.id` (`lib/actions/candidates.ts:156`).
  - Le candidature aggiunte modificando le posizioni del candidato hanno come responsabile l'utente che modifica (`lib/actions/candidates.ts:422` → `syncCandidateApplications`, `lib/services/applications.ts:214`).
  - Candidatura pubblica: nessun responsabile (`createdBy: null`, `lib/actions/candidates.ts:231`).
  - "Prendi in carico" imposta l'utente corrente e "Rilascia" azzera (`owner: "me" | "none"`, `lib/actions/applications.ts:66`; etichette in `components/applications/owner-controls.tsx`).
  - Il filtro dell'interfaccia si chiama "Solo le mie" (`components/applications/mine-toggle.tsx`).
  - Backfill: `ownerId` = `candidates.createdBy`.

### 12. Righe 71–72 — fasi chiuse mai toccate dagli automatismi

- **Dice oggi:** "automation never moves a stage backwards".
- **Codice:** gli avanzamenti automatici non toccano mai una candidatura `rejected` o `withdrawn`, qualunque sia l'evento (`advanceStage` in `lib/utils/application-stage.ts`; `advanceApplicationStage` in `lib/services/applications.ts`). Solo lo spostamento manuale le riapre. Nella card Prossima azione, `hired`, `rejected` e `withdrawn` mostrano "Candidatura chiusa" (`lib/utils/next-action.ts:140–145`); solo `rejected` e `withdrawn` hanno `canReopen`.

### 13. Riga 69 — riaggiungere una posizione ritirata

- **Dice oggi:** non dice cosa succede se una posizione ritirata viene riselezionata.
- **Codice:** `syncCandidateApplications` riapre la stessa candidatura portandola ad `applied`, senza crearne una nuova, e conserva lo storico (`lib/services/applications.ts:220–222`, `reopenedPositionIds`). Una candidatura ritirata non riselezionata resta com'è (riga 233).

### 14. Riga 72 e sezione "Evaluations" — la valutazione del CV richiede una candidatura

- **Dice oggi:** "a stored resume evaluation moves the application to `screening`".
- **Codice:** `prepareResumeEvaluation` rifiuta con 404 una posizione a cui il candidato non è candidato (`lib/services/resume-evaluation.ts:108–117`, "A resume evaluation is evidence of an application"). Il salvataggio e l'avanzamento a screening avvengono nella stessa transazione (`saveResumeEvaluation`).

### 15. Riga 73 — il test si invia solo a candidature non chiuse

- **Dice oggi:** "A quiz can be assigned only to candidates with an application for the quiz's position."
- **Codice:** la candidatura deve inoltre essere né `rejected` né `withdrawn` (`CLOSED_APPLICATION_STAGES`, `lib/actions/assessments.ts:24`, usato alle righe 306 e 379). L'errore è lo stesso per candidatura assente o chiusa.

### 16. Righe 79–80 — liste che mostrano solo posizioni aperte

- **Dice oggi:** solo le posizioni `open` compaiono nel form pubblico.
- **Codice:** `getOpenPositionsForSelect` (`lib/data/positions.ts:108`, `where: { status: "open" }`) alimenta il form pubblico (`app/recruiting/page.tsx`) e anche le select del form candidato in dashboard (`app/dashboard/candidates/new/page.tsx`, `app/dashboard/candidates/[id]/edit/page.tsx`). "Le mie azioni" elenca come setup incompleto le posizioni `draft` e `open` senza quiz (`lib/data/applications.ts:583`).

### 17. Candidature ferme — soglia di 7 giorni

- **Dice oggi:** nessuna regola.
- **Codice:** una candidatura aperta è "ferma" quando `stageChangedAt` è più vecchio di `STALE_APPLICATION_DAYS = 7` giorni (`lib/utils/application-stage.ts:34`, `isApplicationStale` con `now` esplicito). Non vale per `hired`, `rejected` e `withdrawn`. "Le mie azioni" usa questa regola.

## knowledge/styling.md

### 18. Riga 34 — mappa fase → token

- **Dice oggi:** la scelta del token di ogni fase è una decisione di design, senza riportarla.
- **Codice:** `APPLICATION_STAGE_PRESENTATION` in `components/applications/application-stage.ts`. Badge `bg-stage-<token>/10 text-stage-<token>`, punto `bg-stage-<token>`:

  | Fase | Token |
  |---|---|
  | `applied` | `stage-pending` |
  | `screening`, `assessment`, `interview`, `decision` | `stage-progress` |
  | `offer`, `hired` | `stage-done` |
  | `rejected` | `stage-cancelled` |
  | `withdrawn` | `stage-expired` |

  Valore sconosciuto: `bg-muted text-muted-foreground`, punto `bg-muted-foreground`. Colonne del kanban: `KANBAN_COLUMN_LABEL`, con la colonna delle chiuse intitolata "Chiuse".

### 19. Sezione "Status and score colours" — stato della posizione

- **Dice oggi:** nessuna regola.
- **Codice:** `POSITION_STATUS_PRESENTATION` in `components/positions/position-status.ts`:

  | Stato | Etichetta | Badge |
  |---|---|---|
  | `draft` | Bozza | `bg-warning/10 text-warning` |
  | `open` | Aperta | `bg-success/10 text-success` |
  | `closed` | Chiusa | `bg-muted text-muted-foreground` |

  Valore sconosciuto: muted. Leggere sempre da `getPositionStatusPresentation(status)`.

### 20. Riga 25 — colore della sezione Candidature

- **Dice oggi:** i token di sezione sono `section-positions`, `section-candidates`, `section-quizzes`, `section-presets`, `section-assessments`, `section-settings`.
- **Codice:** non esiste `section-applications`. La sezione Candidature riusa la tinta dei candidati (`text-section-candidates`, `bg-section-candidates`, `components/dashboard/sections.ts:63–72`, commento "Same hue as the candidates"). La voce `overview` usa `primary`.

## CONTEXT.md

### 21. Riga 19 e riga 60 — come il candidato chiama il test

- **Dice oggi:**
  - riga 19: "the candidate sees 'Inizia il quiz'";
  - riga 60: "shown to recruiters as 'Test' and to the candidate as 'quiz'".
- **Codice:** il candidato legge "test" ovunque: pulsante "Inizia il test" (`components/recruiting/assessment-client.tsx:358`), "Stai per iniziare il test per la posizione di…" (riga 295), "Impossibile avviare il test", "Impossibile completare il test".

### 22. Riga 33 — Dashboard valutazione

- **Dice oggi:** "Evaluation dashboard | — | Dashboard valutazione / Valutazione unificata".
- **Codice:** la pagina `/dashboard/candidates/[id]/evaluation-dashboard` è stata rimossa. Il punteggio complessivo vive nella tab Decisione della candidatura (`/dashboard/applications/[id]?tab=decisione`, `app/dashboard/applications/[id]/decision-tab.tsx`, `components/applications/evaluation-summary-view.tsx`) con le card "Punteggio complessivo", "Quiz", "Scenario comportamentale", "Decisione hiring". Il simbolo del codice è `getApplicationEvaluationSummary` (`lib/data/applications.ts`).

### 23. Glossario — righe nuove

Aggiungere:

| Termine | Codice | Etichetta UI | Note |
|---|---|---|---|
| Le mie azioni | `getActionCenterData` (`lib/data/applications.ts`), `components/dashboard/action-center.tsx` | Le mie azioni | Home `/dashboard` e voce `overview` di `SECTIONS`. Elenca test da valutare, candidature ferme, posizioni con setup incompleto, colloqui senza kit (vuoto in Fase 1); filtro "Solo le mie" |
| Prossima azione | `getNextAction` (`lib/utils/next-action.ts`), `components/applications/next-action-card.tsx` | Prossima azione | Valuta CV, Invia test, Genera valutazione, Pianifica colloquio, Prepara colloquio, Compila scheda, Vai alla decisione, Passa a <fase>, Candidatura chiusa |
| Kanban Selezione | `components/applications/application-kanban.tsx`, `getApplicationsByPosition` | Tab "Selezione" della posizione | Una colonna per fase da Candidato ad Assunto, più "Chiuse" |
| Responsabile | `Application.ownerId` | Prendi in carico / Rilascia / Solo le mie | Non limita mai l'accesso |
| Stato della posizione | `updatePositionStatusAction` | Apri / Chiudi / Riapri | Pulsante nell'header della posizione (`components/positions/position-status-actions.tsx`) |

Riga 38: il gruppo "Panoramica" contiene la voce "Le mie azioni".

### 24. Code-area map — rotte e file nuovi

- **Rotte:**
  - `app/dashboard/` contiene `applications/` (lista `/dashboard/applications` e pagina `/dashboard/applications/[id]` con le tab Panoramica, CV, Test, Colloqui, Decisione) e `assessments/` (`/dashboard/assessments`, ex `/dashboard/interviews`).
  - Non esiste più `candidates/[id]/evaluation-dashboard`.
- **`lib/services/` (riga 85):** aggiungere `applications.ts` (`setApplicationStage`, `advanceApplicationStage`, `applicationHasEvidence`, `syncCandidateApplications`).
- **`lib/utils/` (riga 88):** aggiungere `application-stage.ts` (fasi, avanzamento, `furthestApplication`, `isApplicationStale`, colonne kanban), `next-action.ts`, `evaluation-score.ts`, `application-timeline.ts`.
- **`lib/data/` e `lib/actions/`:** nuovi moduli `applications.ts`.
- **`components/`:** `components/applications/` (badge e stepper di fase, kanban, timeline, card Prossima azione, menu di spostamento fase, controlli del responsabile, filtro "Solo le mie", form di invio test, vista del punteggio) e `components/assessments/` (stato del test, tabella, filtri).
- **`components/dashboard/` (riga 93):** contiene anche `action-center.tsx` ("Le mie azioni"). La pipeline dei test (`assessment-pipeline.tsx`) è ora mostrata in `/dashboard/assessments`, non nella home.
- **`prisma/` (riga 91):** dice "`schema.prisma`, `migrations/`, `seed.ts`". Aggiungere gli script `list-duplicate-emails.ts` (`pnpm db:duplicates`), `verify-application-hub.ts` (`pnpm db:verify`) e `load-env.ts`. `migrations/` contiene `0_init`, `20261115000000_application_hub` e il `README.md` della procedura.

## Fuori da knowledge/ e CONTEXT.md (solo segnalazione)

- `README.md`: aggiornato. Copre ora il modello dati (Application, Assessment), gli script di migrazione (`db:migrate`, `db:migrate:deploy`, `db:duplicates`, `db:verify`, con il link a `prisma/migrations/README.md`), la riga "Candidate Tracking" (una candidatura per posizione, con fase e responsabile) e le cartelle `applications/` in `app/dashboard/` e in `components/`. Non richiede interventi di knowledge-builder.
