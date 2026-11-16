# Fase 1 — Lista di accettazione

Lista di accettazione della Fase 1 (candidatura come perno, rinomine, ritorno a Prisma Migrate). Una riga per ogni obbligo del design (O1–O81), con il modo in cui si verifica e l'esito.

Legenda degli esiti:

- ✅ verificato da un controllo automatico eseguito durante la Fase 1 (test Vitest, `pnpm db:verify`, comando sul database `development`, ricerca testuale);
- ☐ passo manuale ancora da fare dallo sviluppatore (con la pagina da aprire, l'azione e il risultato atteso);
- ❌ controllo eseguito e fallito.

Le pagine si aprono da utente autenticato su `pnpm dev`, con `DATABASE_URL` sul ramo Neon `development`.

## Fasi e transizioni

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O1 — Ogni candidatura ha una fase tra applied, screening, assessment, interview, decision, offer, hired, rejected, withdrawn. | `tests/lib/schemas/application.test.ts` ("lists the nine stages", "refuses an unknown stage…"); `pnpm db:verify` (candidature per fase: applied 3, assessment 2, nessuna senza fase). | ✅ |
| O2 — Etichette delle fasi: Candidato, Screening, Test, Colloquio, Decisione, Offerta, Assunto, Scartato, Ritirato. | `tests/components/applications/application-stage.test.ts` ("labels every stage in Italian"). | ✅ |
| O3 — Valutare il CV porta la candidatura a screening, solo se è più avanti della fase corrente. | `tests/lib/utils/application-stage.test.ts` (tabella evento × fase, `resume_evaluated`); `tests/lib/services/resume-evaluation.test.ts` ("stores and advances to screening in one transaction"). | ✅ |
| O4 — Inviare un test porta la candidatura ad assessment, solo se è più avanti. | `tests/lib/utils/application-stage.test.ts` (`assessment_sent`); `tests/lib/actions/assessments.test.ts` ("advances the stage and refreshes the candidate when it changed", "does not refresh the candidate when the stage did not change"). | ✅ |
| O5 — Pianificare un colloquio porta a interview (regola presente; azione in Fase 3). | `tests/lib/utils/application-stage.test.ts` (`interview_scheduled` da ogni fase). | ✅ |
| O6 — Tutte le schede inviate portano a decision (regola presente; azione in Fase 3). | `tests/lib/utils/application-stage.test.ts` (`all_feedback_submitted`). | ✅ |
| O7 — Registrare la decisione porta a offer, hired o rejected (regola presente; azione in Fase 4). | `tests/lib/utils/application-stage.test.ts` (`decision_recorded` con i tre esiti, "throws when decision_recorded has no outcome"). | ✅ |
| O8 — Un'azione non fa mai arretrare la fase. | `tests/lib/utils/application-stage.test.ts` (tabella completa evento × fase, "never changes a closed application, whatever the event"); `tests/lib/services/applications.test.ts` ("never moves backwards", "never touches a closed application"). | ✅ |
| O9 — Il recruiter sposta a mano la fase in qualunque direzione e riapre scartate e ritirate. | `tests/lib/actions/applications.test.ts` ("moves backwards by hand", "reopens a rejected application", "moves the stage and refreshes the candidate reads"). Manuale: apri `/dashboard/applications/<id>`, usa il menu di spostamento fase su una candidatura Scartata e scegli Screening; atteso: badge e stepper mostrano Screening. | ✅ (test) · ☐ (manuale) |
| O10 — Ogni cambio di fase aggiorna stageChangedAt. | `tests/lib/services/applications.test.ts` ("writes the stage and the time of the change"); `tests/lib/actions/applications.test.ts` (`stageChangedAt: expect.any(Date)`). Backfill: `stageChangedAt` = `createdAt` su tutte le 5 candidature (query di sola lettura su `development`). | ✅ |
| O11 — La candidatura registra il responsabile (ownerId). | `tests/lib/actions/applications.test.ts` ("takes the application for the current user", "releases the application", "refuses an unknown owner value"); `tests/lib/actions/candidates.test.ts` ("creates the applications owned by the user…"). Backfill: tutte le 5 candidature hanno un responsabile (query di sola lettura). | ✅ |
| O12 — La candidatura può registrare l'esito (decision, decisionRationale, decidedBy, decidedAt, decisionWeights). | Schema `prisma/schema.prisma` (model `Application`); `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma` → "No difference detected". | ✅ |
| O13 — Le candidature si ordinano per attività recente; nessuna primaria. | `tests/lib/data/candidates.test.ts` ("orders the applications by recent activity and tags the joins"); `tests/lib/data/applications.test.ts` ("orders by stage change and maps the test count"). | ✅ |

## Modifica posizioni

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O14 — Posizione aggiunta al candidato → candidatura in applied. | `tests/lib/services/applications.test.ts` ("creates a new position with the owner, in the default stage"). | ✅ |
| O15 — Posizioni invariate → candidature non toccate. | `tests/lib/services/applications.test.ts` ("leaves an unchanged position untouched"). | ✅ |
| O16 — Posizione tolta con prove → candidatura withdrawn con lo storico. | `tests/lib/services/applications.test.ts` ("withdraws a removed application with evidence and reports cancelled tests"). | ✅ |
| O17 — Posizione tolta senza prove → candidatura eliminata. | `tests/lib/services/applications.test.ts` ("deletes a removed application without evidence"); `applicationHasEvidence` ("is true with a test", "is true with a resume evaluation", "is false without evidence"). | ✅ |
| O18 — I test non completati di una candidatura ritirata vengono annullati, non cancellati. | `tests/lib/services/applications.test.ts` ("cancels the open tests when withdrawn, never deleting any"); `tests/lib/actions/candidates.test.ts` ("refreshes the tests when a withdrawn application cancels some"). | ✅ |

## Candidato ed email

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O19 — Candidate.status e il suo badge non esistono più. | `pnpm db:verify` ("La colonna candidates.status non esiste più"); `tests/lib/schemas/candidate.test.ts` ("has no status field"); `tests/lib/actions/candidates.test.ts` ("ignores a status key"). Manuale: apri `/dashboard/candidates`; atteso: nessun badge di stato del candidato, solo la fase. | ✅ (automatico) · ☐ (manuale) |
| O20 — Liste e badge mostrano la fase della candidatura più avanzata. | `tests/lib/utils/application-stage.test.ts` (`furthestApplication`: fase più alta, parità, aperta contro scartata, assunto, solo chiuse, lista vuota). Manuale: apri `/dashboard/candidates` per un candidato con due candidature (Candidato e Test); atteso: badge "Test". | ✅ (test) · ☐ (manuale) |
| O21 — Flag Non ricontattare con nota sul candidato. | `tests/lib/schemas/candidate.test.ts` (flag, nota null, nota oltre 500 caratteri); `tests/lib/actions/candidates.test.ts` ("stores Non ricontattare with its note", "clears the note when Non ricontattare is switched off"). Manuale: apri `/dashboard/candidates/<id>/edit`, attiva "Non ricontattare" con una nota e salva; atteso: badge "Non ricontattare" nella pagina del candidato. | ✅ (test) · ☐ (manuale) |
| O22 — Email del candidato unica e normalizzata. | `tests/lib/schemas/candidate.test.ts` (`candidateEmailSchema`); `tests/lib/actions/candidates.test.ts` ("normalises the email", "refuses an email that already exists", "refuses the email of another candidate"); `pnpm db:verify` ("Nessuna email di candidato duplicata"). | ✅ |

## Form pubblico

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O23 — Form pubblico con email esistente e nuova posizione → candidatura aggiunta al candidato esistente. | `tests/lib/actions/candidates.test.ts` ("attaches a new position to a known email and replaces the CV"). | ✅ |
| O24 — In quel caso il CV viene aggiornato. | `tests/lib/actions/candidates.test.ts` (stesso test: il CV viene sostituito). | ✅ |
| O25 — Form pubblico con email esistente già candidata a quella posizione → conferma senza creare nulla. | `tests/lib/actions/candidates.test.ts` ("writes nothing when the known candidate already applied"). | ✅ |
| O26 — Risposta del form pubblico identica nei tre casi. | `tests/lib/actions/candidates.test.ts` ("answers exactly the same in the three cases", "refuses an invalid CV with the same answer for known and unknown emails", "does not reveal the new candidate id to the applicant"). Manuale: apri `/recruiting`, invia lo stesso form tre volte (email nuova, email nota con altra posizione, email nota con stessa posizione); atteso: la stessa conferma tutte e tre le volte. | ✅ (test) · ☐ (manuale) |

## Posizione

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O27 — Posizione con stato draft, open, closed (Bozza, Aperta, Chiusa). | `tests/lib/schemas/position.test.ts` (`positionStatusSchema`, `updatePositionStatusSchema`); `tests/components/positions/position-status.test.ts`; `tests/lib/actions/positions.test.ts` (`updatePositionStatusAction`). | ✅ |
| O28 — Nel form pubblico solo posizioni aperte. | `tests/lib/data/positions.test.ts` ("getOpenPositionsForSelect returns the open positions by title"); `tests/lib/actions/positions.test.ts` (`fetchPositionDataAction` restituisce null per draft e closed). Manuale: chiudi una posizione e apri `/recruiting`; atteso: la posizione non compare nella select. | ✅ (test) · ☐ (manuale) |
| O29 — Nelle liste attive solo posizioni aperte. | `tests/lib/data/positions.test.ts` (filtro per stato, `getOpenPositionsForSelect`, usata da `/dashboard/candidates/new` e `/dashboard/candidates/<id>/edit`). Manuale: apri `/dashboard/candidates/new`; atteso: nella select solo le posizioni Aperte. | ✅ (test) · ☐ (manuale) |
| O30 — Chiudere una posizione conserva tutto. | `tests/lib/actions/positions.test.ts` (`updatePositionStatusAction` per open, closed, draft: aggiorna solo lo stato). Manuale: apri `/dashboard/positions/<id>`, premi "Chiudi"; atteso: tab Selezione con le stesse candidature, badge "Chiusa". | ✅ (test) · ☐ (manuale) |
| O31 — Eliminazione della posizione solo senza candidature, altrimenti rifiuto con messaggio. | `tests/lib/actions/positions.test.ts` ("refuses to delete a position with applications"). Manuale: elimina una posizione con candidature da `/dashboard/positions/<id>`; atteso: toast d'errore con il messaggio del rifiuto, posizione ancora presente. | ✅ (test) · ☐ (manuale) |

## Test

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O32 — Ogni test appartiene obbligatoriamente a una candidatura. | `pnpm db:verify` ("Nessun test senza candidatura", "Ogni test appartiene a una candidatura dello stesso candidato"); `tests/lib/actions/assessments.test.ts` ("creates the test with the application id"). | ✅ |
| O78 — Un quiz si assegna solo a chi ha una candidatura per la posizione del quiz; il test nasce su quella candidatura. | `tests/lib/actions/assessments.test.ts` ("only accepts candidates linked to the quiz position", "refuses a candidate without an application for the quiz position", "refuses a quiz of a position without an open application", "creates the test on the application of the quiz position", "refuses a rejected or withdrawn application with the same error"). | ✅ |

## Rinomine e terminologia

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O33 — CandidatePosition → Application, tabella applications. | `pnpm db:verify` ("Nessun nome con candidate_positions o isPrimary nel database", applications: 5 = 5 righe di `candidate_positions`); `prisma migrate diff` dal database allo schema senza differenze. | ✅ |
| O34 — Interview/InterviewStatus → Assessment/AssessmentStatus, tabella assessments. | `pnpm db:verify` ("Nessun nome con interview nel database (a parte evaluations.interviewNotes)", assessments: 5 = 5 righe di `interviews`). | ✅ |
| O35 — Evaluation.interviewId → assessmentId. | `pnpm db:verify` (stessa asserzione); schema `Evaluation.assessmentId`; evaluations: 8 prima e dopo. | ✅ |
| O36 — /dashboard/interviews → /dashboard/assessments; /recruiting/[token] invariato. | `pnpm build` (route `/dashboard/assessments`, `/dashboard/assessments/[id]`, `/recruiting/[token]`; nessuna `/dashboard/interviews`). Manuale: apri `/dashboard/assessments` e un link `/recruiting/<token>`; atteso: entrambe le pagine si aprono. | ✅ (build) · ☐ (manuale) |
| O37 — Nessun vecchio nome residuo in action, data layer, schemi, componenti, tag di cache, test e messaggi. | Ricerca testuale (vedi "Validazione"): nessun risultato fuori dall'elenco ammesso. | ✅ (ricerca) |
| O38 — Il nome Interview resta libero. | Ricerca testuale: nessun simbolo di codice né di database chiamato `Interview`/`InterviewStatus`; restano solo gli agganci della Fase 3 ammessi (fase `interview`, evento `interview_scheduled`, fatti `interviews`, `InterviewsTab`). `pnpm db:verify` sul catalogo del database. | ✅ |
| O39 — Nell'interfaccia il quiz inviato si chiama Test; Colloquio solo per la conversazione. | Ricerca testuale: "Colloquio" compare solo per la fase, i segnaposto della Fase 3 e le note del colloquio. Manuale: apri `/dashboard/assessments` e `/dashboard/applications/<id>` (tab Test); atteso: "Test inviati" / "Invia test", mai "Colloquio" per un test. | ✅ (ricerca) · ☐ (manuale) |
| O40 — isPrimary e il badge Primaria non esistono più. | `pnpm db:verify` (nessun `isPrimary` nel database); `tests/lib/data/candidates.test.ts` e `tests/lib/actions/candidates.test.ts` (asserzioni "not.toContain isPrimary"). Manuale: apri `/dashboard/candidates/<id>`; atteso: nessun badge "Primaria". | ✅ (automatico) · ☐ (manuale) |
| O41 — La Dashboard valutazione riceve la candidatura. | `tests/lib/data/applications.test.ts` (`getApplicationEvaluationSummary`: "reads the latest evaluation of this application and the rubric", "has no assessment evaluation when no test was evaluated"); `tests/lib/utils/evaluation-score.test.ts`. Manuale: apri `/dashboard/applications/<id>?tab=decisione`; atteso: punteggio complessivo calcolato su quella candidatura. | ✅ (test) · ☐ (manuale) |
| O73 — Testi rivolti al candidato: decisione test/quiz applicata a tutti i testi. | Ricerca nei componenti `components/recruiting/`: il candidato legge "Inizia il test", "Stai per iniziare il test…", "Impossibile completare il test". Manuale: apri `/recruiting/<token>`; atteso: pulsante "Inizia il test", testi coerenti fino alla fine. | ✅ (ricerca) · ☐ (manuale) |

## Migrazione e backfill

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O42 — Lavoro sul database solo sul ramo Neon development. | Host stampato prima di ogni comando: `ep-holy-lake-agk5vrpg-pooler.c-2.eu-central-1.aws.neon.tech` (etichettato "Neon branch development" in `.env.local`), diverso dalla produzione. | ✅ |
| O43 — Schema con migrazioni versionate, non db push. | `package.json` senza `db:push`; `prisma migrate status` → "Database schema is up to date!". | ✅ |
| O44 — Migrazione di base e _prisma_migrations riallineata. | Eliminate le 3 righe orfane, `prisma migrate resolve --applied 0_init` → "Migration 0_init marked as applied."; `_prisma_migrations` contiene solo `0_init` e `20261115000000_application_hub`. | ✅ |
| O45 — Migrazione Fase 1 con rinomine ALTER … RENAME, nuovi campi, backfill, rimozione campi vecchi. | `pnpm db:migrate:deploy` → "All migrations have been successfully applied"; `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` → "No difference detected." | ✅ |
| O46 — La migrazione conserva i dati esistenti. | Conteggi prima/dopo: candidates 3 → 3, candidate_positions 5 → applications 5, interviews 5 → assessments 5, evaluations 8 → 8, positions 6 → 6. | ✅ |
| O47 — Stessa migrazione poi in produzione; mai copiare development su produzione. | Procedura in `prisma/migrations/README.md`. Manuale, al rilascio: ripetere i passi del README sul database di produzione (rollback: ramo Neon `backup/pre-application-hub-2026-11-15`, tag git `backup/pre-application-hub`). | ☐ |
| O48 — In sviluppo non si cancellano candidati presenti anche in produzione. | La migrazione non contiene DELETE di righe esistenti; candidates 3 prima e dopo. | ✅ |
| O49 — Elenco dei candidati con la stessa email normalizzata prima del vincolo unico. | `pnpm db:duplicates` → "Nessun candidato duplicato" (exit 0), eseguito prima della migrazione. | ✅ |
| O50 — Fase della candidatura primaria da Candidate.status secondo la mappa. | `pnpm db:verify` + query di sola lettura: le 3 candidature primarie (candidati `pending`) sono in `applied`. | ✅ |
| O51 — Candidature non primarie: assessment se hanno un quiz inviato, altrimenti applied. | Query di sola lettura: le 2 candidature non primarie, entrambe con un test, sono in `assessment`. | ✅ |
| O52 — Ogni test esistente riceve applicationId da candidato + posizione del quiz. | `pnpm db:verify` ("Nessun test senza candidatura", "Ogni test appartiene a una candidatura dello stesso candidato"). | ✅ |
| O53 — Candidatura mancante di un test esistente ricreata come withdrawn. | Prima della migrazione: 0 test senza collegamento, quindi 0 candidature ricreate (applications 5 = 5 + 0). La regola non è stata esercitata da dati reali. | ✅ (conteggio) |
| O54 — Posizioni esistenti con status open. | `pnpm db:verify` (posizioni per stato: open 6). | ✅ |
| O55 — Candidate.status e isPrimary rimossi solo dopo backfill e verifica. | `pnpm db:verify` ("La colonna candidates.status non esiste più", nessun `isPrimary`); la migrazione rimuove le colonne dopo le asserzioni ed è stata applicata senza errori. | ✅ |

## Pagina candidatura

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O56 — Pagina /dashboard/applications/[id] con header: candidato, posizione, stepper, responsabile. | `pnpm build` (route `/dashboard/applications/[id]`); `tests/lib/data/applications.test.ts` (`getApplicationDetail`). Manuale: apri `/dashboard/applications/<id>`; atteso: nome del candidato, titolo della posizione, badge e stepper della fase, "Prendi in carico"/"Rilascia". | ✅ (build, test) · ☐ (manuale) |
| O57 — Card Prossima azione calcolata dallo stato. | `tests/lib/utils/next-action.test.ts` (righe 1–7, precedenze, fallback). Manuale: card "Prossima azione" sulla pagina della candidatura. | ✅ (test) · ☐ (manuale) |
| O58 — CV non valutato → Valuta CV. | `tests/lib/utils/next-action.test.ts` ("1) evaluate_cv when the CV is there and not evaluated"). | ✅ |
| O59 — Fase Test senza quiz inviati → Invia test con quiz della posizione preselezionato. | `tests/lib/utils/next-action.test.ts` ("2) send_assessment…"); `tests/lib/data/applications.test.ts` ("loads the resume evaluation and the quizzes not yet sent"). Manuale: in fase Test senza test inviati premi "Invia test"; atteso: form con il quiz della posizione già scelto. | ✅ (test) · ☐ (manuale) |
| O60 — Test completato senza valutazione → Genera valutazione. | `tests/lib/utils/next-action.test.ts` ("3) generate_evaluation with the oldest completed test"). | ✅ |
| O61 — Fase Colloquio senza colloquio pianificato → Pianifica colloquio. | `tests/lib/utils/next-action.test.ts` ("4) schedule_interview…"). | ✅ |
| O62 — Colloquio pianificato con kit non pronto → Prepara colloquio. | `tests/lib/utils/next-action.test.ts` ("5) prepare_interview…"). | ✅ |
| O63 — Colloquio concluso con scheda mancante → Compila scheda. | `tests/lib/utils/next-action.test.ts` ("6) fill_feedback…"). | ✅ |
| O64 — Tutte le schede inviate → Vai alla decisione. | `tests/lib/utils/next-action.test.ts` ("7) go_to_decision when every feedback is in"). | ✅ |
| O65 — Tab Panoramica (timeline prove), CV, Test, Colloqui, Decisione. | `tests/lib/utils/application-timeline.test.ts`. Manuale: apri `/dashboard/applications/<id>` e ogni tab (`?tab=panoramica`, `cv`, `test`, `colloqui`, `decisione`); atteso: cinque tab, Colloqui vuota con "Nessun colloquio". | ✅ (test) · ☐ (manuale) |
| O66 — Pagina candidato = anagrafica + elenco candidature. | Manuale: apri `/dashboard/candidates/<id>`; atteso: anagrafica e l'elenco delle candidature con fase e link alla candidatura. | ☐ |

## Kanban

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O67 — Kanban delle candidature per fase nella pagina della posizione. | `tests/lib/utils/application-stage.test.ts` ("kanban columns"); `tests/components/applications/application-stage.test.ts` (`KANBAN_COLUMN_LABEL`); `tests/lib/data/applications.test.ts` (`getApplicationsByPosition`). Manuale: apri `/dashboard/positions/<id>`, tab "Selezione"; atteso: colonne Candidato…Assunto più "Chiuse", una scheda per candidatura. | ✅ (test) · ☐ (manuale) |

## Le mie azioni

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O68 — /dashboard è Le mie azioni e ogni riga porta all'azione. | `pnpm build` (route `/dashboard`). Manuale: apri `/dashboard`; atteso: titolo "Le mie azioni", ogni riga apre la candidatura o la posizione giusta. | ✅ (build) · ☐ (manuale) |
| O69 — Le mie azioni elenca i test completati da valutare. | `tests/lib/data/applications.test.ts` ("lists tests to evaluate, open applications and incomplete positions"). | ✅ |
| O70 — Le mie azioni elenca le candidature ferme da più di N giorni. | `tests/lib/utils/application-stage.test.ts` (`isApplicationStale`: 6 giorni no, 7 giorni no, 7 giorni e 1 ms sì, fasi chiuse mai). | ✅ |
| O71 — Le mie azioni elenca le posizioni con setup incompleto. | `tests/lib/data/applications.test.ts` (stesso test: posizioni draft/open senza quiz). | ✅ |
| O72 — Le mie azioni elenca colloqui senza kit pronto e schede da compilare (vuoti in Fase 1). | `tests/lib/data/applications.test.ts` (`interviewsWithoutKit: []`). Manuale: apri `/dashboard`; atteso: sezione "Colloqui senza kit pronto" vuota. | ✅ (test) · ☐ (manuale) |
| O80 — Il responsabile non limita mai l'accesso; alimenta solo il filtro Solo le mie. | `tests/lib/data/applications.test.ts` ("filters by stage, position, owner and search", "lists everything without filters"). Manuale: su `/dashboard/applications` attiva e disattiva "Solo le mie"; atteso: con il filtro spento si vedono tutte le candidature, anche di altri responsabili. | ✅ (test) · ☐ (manuale) |

## Regole trasversali

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O74 — Tag di cache, cascade e letture non in cache definiti per le entità della Fase 1. | `tests/lib/utils/cache-utils.test.ts` (`invalidateCandidateCache with applications`, `invalidateCandidateCacheInRouteHandler`, `invalidateBehavioralRubricCache`, `invalidateAssessmentCache`); `tests/lib/data/*.test.ts` (tag dichiarati). | ✅ |
| O75 — Collegamento della valutazione CV alla candidatura deciso (candidato + posizione). | `tests/lib/services/resume-evaluation.test.ts` ("returns the application id of candidate + position", "refuses a position the candidate did not apply to"). | ✅ |
| O76 — Definito come knowledge-builder aggiorna CONTEXT.md. | File `next-steps/FASE1_KNOWLEDGE_DELTA.md`, che nomina esplicitamente CONTEXT.md. Manuale: passarlo a knowledge-builder. | ☐ |
| O77 — Piano di test e criteri di accettazione della Fase 1. | Questo file più i test Vitest elencati sopra e `pnpm db:verify`. | ✅ |
| O79 — Candidatura pubblica accettata solo per una posizione aperta. | `tests/lib/actions/candidates.test.ts` ("accepts only open positions", "rejects a position that does not exist"). | ✅ |
| O81 — Un candidato ha da 1 a 10 posizioni esistenti, altrimenti rifiuto con messaggio. | `tests/lib/schemas/candidate.test.ts` ("should reject empty position IDs array", "should reject more than 10 positions"); `tests/lib/services/applications.test.ts` ("refuses an unknown position and writes nothing"); `tests/lib/actions/candidates.test.ts` ("throws error when position not found"). | ✅ |

## Validazione

Comandi eseguiti il 16/11/2026 sul codice finale della Fase 1.

| Comando | Risultato |
|---|---|
| `pnpm lint` | `eslint .` senza errori né avvisi (exit 0) |
| `pnpm test:run` | `Test Files  65 passed (65)` · `Tests  1055 passed (1055)` |
| `pnpm build` | `✓ Compiled successfully` · TypeScript completato · `✓ Generating static pages using 9 workers (81/81)` (exit 0). Il primo tentativo è fallito in prerender con `DatabaseNotReachable` (database Neon momentaneamente irraggiungibile); il secondo tentativo, dopo aver verificato che il database rispondesse, è passato. |
| `pnpm db:verify` (dopo la migrazione) | exit 0, tutte le asserzioni ✓ |
| `prisma migrate status` | "Database schema is up to date!" |
| `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` | "No difference detected." (exit 0) |
| `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma` | Non eseguibile: richiede `datasource.shadowDatabaseUrl` in `prisma.config.ts`, non configurato. Sostituito dai due controlli precedenti. |

### Ricerca dei vecchi nomi

Ricerca senza distinzione tra maiuscole e minuscole di `interview`, `candidatePosition`, `candidate_positions`, `isPrimary`, `CandidateStatus`, `candidate.status`, `colloqui` in `app/`, `components/`, `lib/` (escluso `lib/prisma/`), `hooks/`, `tests/`, `prisma/schema.prisma`, `prisma/*.ts`: 147 risultati in 32 file.

Risultati ammessi (147):

- campo `interviewNotes` e l'etichetta "Note del colloquio" (`prisma/schema.prisma`, `lib/schemas/evaluation.ts`, `lib/actions/evaluation-entity.ts`, `lib/data/applications.ts`, `components/applications/evaluation-summary-view.tsx`, `components/recruiting/hiring-notes-form.tsx`, test dei dati);
- testi di `hiring-notes-form.tsx` e `behavioral-rubric-form.tsx` che parlano della conversazione;
- la fase `interview` con l'etichetta "Colloquio" (`prisma/schema.prisma`, `lib/schemas/application.ts`, `lib/utils/application-stage.ts`, `components/applications/application-stage.ts` e i loro test);
- segnaposto della Fase 3: "Pianifica colloquio", "Prepara colloquio", "Nessun colloquio", tab "Colloqui", "Colloqui senza kit pronto", "La pianificazione del colloquio arriva con la Fase 3";
- agganci della Fase 3 per la conversazione: evento `interview_scheduled`, fatti opzionali `interviews` e azioni `schedule_interview`/`prepare_interview` di `lib/utils/next-action.ts` e dei loro test, `ActionCenterData.interviewsWithoutKit`, il file `app/dashboard/applications/[id]/interviews-tab.tsx` con `InterviewsTab` e il commento in `next-action-section.tsx`;
- fixture di raccomandazioni AI nei test ("Consigliato per il secondo colloquio", "Colloquio tecnico");
- controlli testuali dentro `prisma/verify-application-hub.ts` e `prisma/list-duplicate-emails.ts`;
- asserzioni negative `not.toContain("isPrimary")`, che verificano l'assenza del vecchio nome, in `tests/lib/data/candidates.test.ts:100` e `tests/lib/actions/candidates.test.ts:682`;
- testi in cui "interview" indica la conversazione dal vivo, come il prompt AI in `lib/services/ai/evaluation-prompts.ts:233` ("proceed with a live interview").

Risultati fuori dall'elenco ammesso: nessuno.

`prisma/migrations/0_init` e `prisma/migrations/20261115000000_application_hub` contengono legittimamente i vecchi nomi e sono esclusi dalla ricerca.
