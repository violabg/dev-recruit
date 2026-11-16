# Fase 2 — Lista di accettazione

## 1. Perimetro

La Fase 2 aggiunge alla posizione la **Scheda di valutazione** (criteri con categoria, priorità, peso, livello atteso, ancore; proposta AI; archiviazione dei criteri con prove) e le **Guide colloquio** (modelli con sezioni e domande, "Genera dalla scheda").
Collega i criteri alle domande dei quiz e delle guide, salva il **dettaglio per risposta** delle valutazioni dei test (con "Ricalcola dettaglio risposte") e la **valutazione del CV per criterio**, ripulendo il testo del candidato.
La pagina della posizione ha cinque tab e la checklist di setup; "Le mie azioni" segnala le posizioni senza scheda, quiz o guida.

Legenda degli esiti:

- ✅ verificato da un controllo automatico eseguito durante la Fase 2 (test Vitest, comando sul database `development`, build);
- ☐ passo manuale ancora da fare dallo sviluppatore (con la pagina da aprire, l'azione e il risultato atteso; elenco ordinato nella sezione 3);
- ❌ controllo eseguito e fallito.

Le pagine si aprono da utente autenticato su `pnpm dev`, con `DATABASE_URL` sul ramo Neon `development`. Nelle righe che seguono, "M<n>" rimanda al passo manuale n della sezione 3.

## 2. Criteri di accettazione

### Scheda di valutazione

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O1 — Una posizione ha al più una scheda di valutazione, e una scheda appartiene a una sola posizione. | Schema: `Scorecard.positionId @unique` (`prisma/schema.prisma:176`), indice `scorecards_positionId_key` nella migrazione. `tests/lib/services/scorecards.test.ts` ("creates the scorecard on the first save…": `upsert` per `positionId`, mai una seconda scheda). | ✅ |
| O2 — Ogni criterio salvato conserva nome, descrizione, categoria, priorità, peso, livello atteso, ancore, origine, ordine e data di archiviazione e li mostra alla riapertura. | `tests/lib/services/scorecards.test.ts` (dati scritti in create e update); `tests/lib/data/scorecards.test.ts` ("splits active and archived criteria and normalizes the anchors": vista completa del criterio). M2. | ✅ (test) · ☐ (manuale) |
| O3 — La categoria è `technical`, `soft` o `culture`; altri valori rifiutati. | `tests/lib/schemas/scorecard.test.ts` ("accepts category …", "refuses another category with the Italian message"). | ✅ |
| O4 — La priorità è `must` o `nice`; altri valori rifiutati. | `tests/lib/schemas/scorecard.test.ts` ("accepts priority …", "refuses another priority"). | ✅ |
| O5 — Il livello atteso è un intero da 1 a 5. | `tests/lib/schemas/scorecard.test.ts` (1 e 5 accettati; 0, 6 e decimali rifiutati). | ✅ |
| O6 — L'origine è `skill`, `softSkill` o `custom`; altri valori rifiutati. | `tests/lib/schemas/scorecard.test.ts` ("accepts source …", "refuses another source"). | ✅ |
| O7 — Le ancore sono tre testi separati `weak`, `medium`, `strong`. | `tests/lib/schemas/scorecard.test.ts` ("requires anchors as the three texts…", "fills missing anchor texts…"); `tests/lib/data/scorecards.test.ts` (ancore sempre restituite come oggetto completo). | ✅ |
| O8 — I criteri si mostrano nell'ordine di `order` e l'ordine scelto resta dopo il salvataggio. | `tests/lib/services/scorecards.test.ts` (`order` = indice nell'array); `tests/lib/data/scorecards.test.ts` (lettura `orderBy: { order: "asc" }`). M3. | ✅ (test) · ☐ (manuale) |
| O9 — Editor della scheda in `/dashboard/positions/[id]/scorecard`. | `pnpm build` (route `/dashboard/positions/[id]/scorecard`). M1. | ✅ (build) · ☐ (manuale) |
| O10 — L'AI propone i criteri a partire da skill, soft skill e livello della posizione. | `tests/lib/actions/scorecards.test.ts` ("returns the proposal built from the position…"); `tests/lib/services/ai/scorecard-generation.test.ts`; `tests/lib/services/prompts.test.ts` ("scorecard prompts"). M4. | ✅ (test) · ☐ (manuale) |
| O11 — La proposta AI dei criteri non salva nulla finché il recruiter non conferma. | `tests/lib/actions/scorecards.test.ts` ("writes nothing and invalidates nothing"); `tests/lib/services/ai/scorecard-generation.test.ts` ("writes nothing to the database"). M4. | ✅ (test) · ☐ (manuale) |
| O12 — Il recruiter modifica i criteri proposti e salvati, ne aggiunge di personalizzati e li riordina. | `tests/lib/services/scorecards.test.ts` (update delle righe con id, create delle nuove, ordine). M3, M4. | ✅ (test) · ☐ (manuale) |
| O13 — Le 5 dimensioni della rubrica comportamentale sono i criteri soft di default. | Costante `DEFAULT_SOFT_CRITERIA` (`lib/utils/scorecard-defaults.ts`); `tests/lib/services/prompts.test.ts` ("lists existing names and the default soft criteria as not to propose"). M1. | ✅ (test) · ☐ (manuale) |
| O14 — I criteri soft di default non cambiano le rubriche già salvate. | La migrazione `20261117000000_scorecard_guides` non contiene istruzioni su `behavioral_rubrics`; modello `BehavioralRubric`, form e action invariati; `pnpm db:verify` dopo la migrazione con gli stessi conteggi. | ✅ |
| O15 — Un criterio con prove non si elimina: si archivia con la data. | `tests/lib/services/scorecards.test.ts` ("archives a removed criterion with evidence instead of deleting it", "deletes a removed criterion without evidence…", `criterionHasEvidence` vero e falso). In questa fase la prova è una valutazione CV della posizione che contiene il criterio; voti e kit arrivano con la Fase 3 e si aggiungono in `criterionHasEvidence`. M5. | ✅ (test) · ☐ (manuale) |
| O16 — Un criterio archiviato resta visibile nelle decisioni già avviate. | La pagina Decisione è della Fase 4. Il dato è già pronto: la riga resta con `archivedAt` e la lettura della candidatura la restituisce marcata archiviata (`tests/lib/data/applications.test.ts`, "resolves the CV assessment per criterion with names, order and archived flag"). | ✅ (modello dati) |
| O17 — Un criterio archiviato non compare nei nuovi kit e nelle nuove schede. | Kit e schede sono della Fase 3. Le letture che li alimenteranno escludono già gli archiviati: `getActiveCriteria` (`tests/lib/services/scorecards.test.ts`, "reads only the non-archived criteria…") e `getCriterionOptionsByPosition` (`tests/lib/data/scorecards.test.ts`, `where: { archivedAt: null }`). | ✅ (modello dati) |
| O18 — Nome, descrizione e ancore restano modificabili anche dopo i voti. | `tests/lib/services/scorecards.test.ts` ("loads only active criteria and updates the rows with a stored id"): l'update scrive sempre nome, descrizione e ancore, senza controllare le prove. | ✅ |
| O19 — Un cambio di peso vale solo per le candidature non decise. | `tests/lib/services/scorecards.test.ts` ("a weight change updates only the criterion row, never the applications"): `decisionWeights` non viene mai scritto. Il salvataggio dei pesi alla decisione è della Fase 4. | ✅ |

### Quiz e criteri

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O20 — I criteri di una domanda stanno sul collegamento quiz-domanda: la stessa domanda in due quiz ha due elenchi indipendenti. | Schema `QuizQuestion.criterionIds` (`prisma/schema.prisma:412`); `tests/lib/services/quiz-questions.test.ts` ("creates the links in array order with their criterionIds", "never writes criterionIds on the Question row"); `tests/lib/utils/question-utils.test.ts` ("the same question row keeps independent lists in two quizzes"). M7. | ✅ (test) · ☐ (manuale) |
| O21 — Generando il quiz dalla scheda, l'AI propone i criteri di ogni domanda. | `tests/lib/actions/quizzes.test.ts` ("generate passes the active criteria of the position to the AI service"); `tests/lib/services/core.test.ts` ("maps the proposed keys to criterion ids and removes criterionKeys"); `tests/lib/services/prompts.test.ts` ("lists the criteria by key and asks for criterionKeys"). M6. | ✅ (test) · ☐ (manuale) |
| O22 — I quiz esistenti restano senza collegamenti e contano come punteggio globale. | Migrazione: `criterionIds TEXT[] DEFAULT ARRAY[]::TEXT[]`, nessun backfill; `computeQuizScore` invariato (`tests/lib/services/assessment-evaluation.test.ts`, "computeQuizScore"); `tests/lib/services/core.test.ts` ("without criteria returns the questions as before"). | ✅ |
| O46 — I criteri proposti dall'AI sono modifiche non salvate: si salvano solo con il quiz. | `tests/lib/actions/quizzes.test.ts` ("generate passes the active criteria…": nessuna transazione, nessun `quizQuestion.create`; "upsert stores the active criteria on the link"). M6. | ✅ (test) · ☐ (manuale) |

### Guide colloquio

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O23 — Una posizione può avere una o più guide. | Schema `InterviewGuide.positionId` con indice, senza vincolo unico (`prisma/schema.prisma:212`); `tests/lib/data/interview-guides.test.ts` ("counts sections and questions": due guide sulla stessa posizione). M8. | ✅ (test) · ☐ (manuale) |
| O24 — Una guida salvata conserva posizione, titolo, round e durata. | `tests/lib/services/interview-guides.test.ts` ("creates the guide, its sections and questions in order", "updates the guide and keeps the ids…"); `tests/lib/data/interview-guides.test.ts`. M8. | ✅ (test) · ☐ (manuale) |
| O25 — Sezioni ordinate con titolo, minuti, ordine e tipo tra i sei ammessi. | `tests/lib/schemas/interview-guide.test.ts` (sei tipi accettati, "refuses another kind with 'Tipo di sezione non valido'"); `tests/lib/services/interview-guides.test.ts` (`order` dall'indice). | ✅ |
| O26 — Domande ordinate con testo, approfondimenti, criteri, ancore, obbligatorietà e ordine. | `tests/lib/services/interview-guides.test.ts` (dati della domanda in create e update); `tests/lib/data/interview-guides.test.ts` ("orders sections and questions by order and normalizes the anchors"). | ✅ |
| O27 — Editor della guida in `/dashboard/positions/[id]/guides/[guideId]`. | `pnpm build` (route `/dashboard/positions/[id]/guides/[guideId]` e `/guides/new`). M8, M9. | ✅ (build) · ☐ (manuale) |
| O28 — "Genera dalla scheda": l'AI genera il contenuto della guida dalla scheda. | `tests/lib/services/ai/guide-generation.test.ts` (chiavi tradotte in id, chiavi sconosciute scartate, minuti arrotondati); `tests/lib/actions/interview-guides.test.ts` ("returns the generated guide…", "refuses a position without active criteria…"). M10. | ✅ (test) · ☐ (manuale) |
| O29 — La guida generata non salva nulla finché il recruiter non conferma. | `tests/lib/actions/interview-guides.test.ts` ("returns the generated guide and never writes or invalidates"). M10. | ✅ (test) · ☐ (manuale) |

### Valutazioni

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O30 — Alla generazione della valutazione di un test si salva il dettaglio per risposta (punteggio 0–10, punti di forza, debolezze). | `tests/lib/services/assessment-evaluation.test.ts` ("completeAssessmentEvaluation stores only score, strengths and weaknesses per question"); `tests/lib/schemas/evaluation.test.ts` (`answerEvaluationsSchema`: 0 e 10 accettati, 11 rifiutato). M11. | ✅ (test) · ☐ (manuale) |
| O31 — Le valutazioni salvate prima della Fase 2 restano valide senza dettaglio. | `tests/lib/data/evaluations.test.ts` (colonne null lette come null; JSON non valido letto come null). M12. | ✅ (test) · ☐ (manuale) |
| O32 — "Ricalcola dettaglio risposte" riesegue l'AI sulle risposte e salva il dettaglio. | `tests/lib/actions/evaluations.test.ts` (`recalculateAnswerEvaluationsAction`); `tests/lib/services/assessment-evaluation.test.ts` (tre casi di errore e scrittura). M12. | ✅ (test) · ☐ (manuale) |
| O33 — Il ricalcolo non cambia mai `quizScore` e `fitScore`. | `tests/lib/services/assessment-evaluation.test.ts` ("recalculateAnswerEvaluations writes answerEvaluations only": i dati dell'update hanno solo la chiave `answerEvaluations`). M12. | ✅ (test) · ☐ (manuale) |
| O34 — La valutazione del CV salva una valutazione per ogni criterio della scheda. | `tests/lib/services/resume-evaluation.test.ts` ("lists the active criteria by key…", "stores the assessment per criterion keyed by id, inside the transaction", JsonNull senza criteri o senza voci valide); `tests/lib/data/applications.test.ts` (nomi, ordine, archiviati). M13. | ✅ (test) · ☐ (manuale) |
| O35 — Il testo del candidato (CV, risposte) è ripulito prima di entrare nel prompt. | `tests/lib/services/ai/evaluation-prompts.test.ts` ("filters injection patterns in the candidate answer", "filters injection patterns in the CV and in the position texts", taglio a `MAX_ANSWER_CHARS` e `MAX_RESUME_CHARS`). | ✅ |
| O36 — Data di nascita e foto non arrivano al modello; la data di nascita è tolta anche dal testo del CV. | `tests/lib/services/sanitize.test.ts` (`redactBirthDate` per ogni marcatore e formato, date senza marcatore intatte); `tests/lib/services/ai/evaluation-prompts.test.ts` ("removes a marked birth date and keeps the other dates"); `tests/lib/services/resume-evaluation.test.ts` ("removes a marked birth date from the CV before the prompt"). `prepareResumeEvaluation` non legge `dateOfBirth` né foto. Limite noto in sezione 4. | ✅ |

### Pagina della posizione e Le mie azioni

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O37 — Tab Dettagli, Scheda di valutazione, Selezione, Quiz, Guide colloquio. | `pnpm build`; `tests/lib/utils/position-setup.test.ts` ("lists the five tabs in order"). M14. | ✅ (test) · ☐ (manuale) |
| O38 — Checklist di setup con dettagli, scheda, quiz, guida, ciascuno fatto quando la parte esiste. | `tests/lib/utils/position-setup.test.ts` (otto combinazioni); `tests/lib/data/positions.test.ts` (`getPositionSetupStatus`: conteggi, criteri tutti archiviati = scheda mancante). M15. | ✅ (test) · ☐ (manuale) |
| O39 — "Le mie azioni" elenca anche le posizioni senza scheda o senza guida. | `tests/lib/data/applications.test.ts` ("lists every missing part in the order scorecard, quiz, guide and skips complete positions"). M16. | ✅ (test) · ☐ (manuale) |

### Regole trasversali

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O40 — Dopo ogni modifica di scheda, criteri, guide o collegamenti le pagine mostrano i dati aggiornati. | `tests/lib/utils/cache-utils.test.ts` (tag `scorecards`, `interview-guides`, `scorecard-<id>`, `interview-guide-<id>`, i due helper, cascata della posizione); `tests/lib/actions/scorecards.test.ts` e `tests/lib/actions/interview-guides.test.ts` (chiamata degli helper); `tests/lib/data/scorecards.test.ts`, `interview-guides.test.ts`, `applications.test.ts`, `positions.test.ts` (tag delle letture). M2, M8. | ✅ (test) · ☐ (manuale) |
| O41 — Migrazione versionata con `pnpm db:migrate`, mai `db push`, prima su `development`, dati conservati. | Cartella `prisma/migrations/20261117000000_scorecard_guides` (solo `CREATE TYPE`, `CREATE TABLE`, indici, chiavi esterne e `ADD COLUMN`); `pnpm db:migrate` sul ramo `development`; `prisma migrate status` → "Database schema is up to date!"; `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` → migrazione vuota; `pnpm db:verify` exit 0 con candidates 3, applications 5, assessments 5, evaluations 8. Produzione: sezione 5. | ✅ (development) · ☐ (produzione) |
| O42 — Consegna di `next-steps/FASE2_ACCEPTANCE.md`. | Questo file. | ✅ |
| O43 — Consegna di `next-steps/FASE2_KNOWLEDGE_DELTA.md` che nomina `CONTEXT.md`. | File presente; nomina `CONTEXT.md` in apertura e ha una sezione dedicata. Nessun file sotto `knowledge/` modificato. M17. | ✅ (file) · ☐ (knowledge-builder) |
| O44 — Aggiornamento del piano in §6 e §8.1. | `next-steps/INTERVIEW_PREPARATION_PLAN.md` (Stato, §1, §6, §7.2, §7.3, §8.1, §8.2). | ✅ |
| O45 — `pnpm lint`, `pnpm test:run`, `pnpm build` passano. | Sezione "Validazione". | ✅ |
| O47 — Ogni operazione richiede un utente autenticato; nessun ruolo e nessun filtro per proprietario. | `tests/lib/actions/scorecards.test.ts`, `interview-guides.test.ts`, `evaluations.test.ts` (risultato "Sessione scaduta. Accedi di nuovo per continuare." senza sessione; "applies no ownership check…"). | ✅ |
| O48 — Tutti i testi aggiunti sono in italiano, compresi i valori generati dall'AI. | Messaggi degli schemi in italiano (`tests/lib/schemas/scorecard.test.ts`, `interview-guide.test.ts`); prompt che richiedono l'italiano (`tests/lib/services/prompts.test.ts`, "requires Italian values"). M4, M10, M13: controllare a vista etichette e testi generati. | ✅ (test) · ☐ (manuale) |

## 3. Passi manuali, in ordine

Da fare con `pnpm dev`, da utente autenticato, sul ramo `development`.

1. **M1 — Scheda nuova.** Apri `/dashboard/positions/<id>?tab=scheda` di una posizione senza scheda: vedi "Nessuna scheda di valutazione" e "Crea scheda". Premi "Crea scheda": l'editor mostra le 5 righe Comunicazione, Collaborazione, Problem Solving, Culture Fit, Leadership e l'avviso "Criteri soft di default: non sono ancora salvati".
2. **M2 — Salvataggio e riapertura.** Modifica nome, descrizione, categoria, priorità, peso, livello atteso e le tre ancore di un criterio, premi "Salva scheda": toast "Scheda di valutazione salvata". Ricarica la pagina: tutti i campi sono quelli salvati. La tab "Scheda di valutazione" della posizione mostra i criteri raggruppati per categoria, con priorità, "Peso N/5" e "Livello atteso N/5".
3. **M3 — Ordine e criteri personalizzati.** Premi "Aggiungi criterio", compila e trascina le righe in un altro ordine; salva e ricarica: l'ordine resta, il criterio aggiunto ha l'etichetta "Personalizzato".
4. **M4 — Proposta AI.** Premi "Proponi criteri con AI": compaiono solo righe nuove, in italiano, con le tre ancore; "Modifiche non salvate" è visibile. Lascia la pagina senza salvare e riaprila: la scheda è quella di prima.
5. **M5 — Eliminare o archiviare.** Rimuovi un criterio mai usato e salva: sparisce. Valuta il CV di un candidato della posizione (M13), poi rimuovi uno dei criteri valutati e salva: compare nel riquadro "Criteri archiviati" con la data e resta nella valutazione del CV, marcato "(archiviato)".
6. **M6 — Quiz dalla scheda.** Da `/dashboard/positions/<id>/quiz/new` genera un quiz con l'AI: ogni domanda ha il campo "Criteri verificati" già compilato e il quiz è segnato come non salvato. Esci senza salvare: nessun quiz creato. Rigenera e salva: aprendo `/dashboard/quizzes/<quizId>` ogni domanda mostra "Criteri verificati:" con i nomi.
7. **M7 — Stessa domanda in due quiz.** Aggiungi da "Domande preferite" la stessa domanda a un secondo quiz della posizione con criteri diversi, salva: in ciascun quiz la domanda mostra i propri criteri.
8. **M8 — Due guide.** Dalla tab "Guide colloquio" premi "Nuova guida", crea "Colloquio tecnico" (round 1) con due sezioni e una domanda con approfondimenti, criteri, ancore e "Obbligatoria"; salva: si apre `/dashboard/positions/<id>/guides/<guideId>`. Ricarica: tutti i campi sono salvati. Crea una seconda guida "Colloquio culturale": la tab elenca entrambe con round, minuti, sezioni e domande.
9. **M9 — Guida di un'altra posizione ed eliminazione.** Apri `/dashboard/positions/<altraPosizione>/guides/<guideId>` con la guida della prima posizione: pagina non trovata. Elimina una guida con "Elimina": torni alla tab "Guide colloquio" e la guida non c'è più.
10. **M10 — Genera dalla scheda.** In una guida con sezioni premi "Genera dalla scheda": il dialogo avvisa "Le sezioni attuali saranno sostituite". Genera: sezioni e domande in italiano, con criteri della scheda, come modifiche non salvate; "Somma sezioni: X min su Y" è in giallo se la somma è diversa dalla durata. Esci senza salvare: la guida salvata è invariata. Su una posizione senza criteri attivi il pulsante è disattivato con "Crea prima la scheda di valutazione".
11. **M11 — Dettaglio per risposta.** Apri `/dashboard/assessments/<id>` di un test completato non valutato, premi "Valuta risposte con AI". Ricarica la pagina: ogni risposta valutata mostra punteggio, punti di forza e aree di miglioramento.
12. **M12 — Ricalcolo.** Apri un test valutato prima della Fase 2: vedi "Il dettaglio per risposta non è disponibile per questa valutazione." e "Ricalcola dettaglio risposte". Annota il punteggio complessivo e il fit score, premi il pulsante: toast "Dettaglio risposte ricalcolato", i punteggi per risposta compaiono, punteggio complessivo e fit score restano identici anche dopo il ricaricamento.
13. **M13 — CV per criterio.** Su una posizione con scheda, apri `/dashboard/applications/<id>?tab=cv` di un candidato con CV che contiene "Data di nascita: …" e valuta il CV: la card salvata mostra "Valutazione per criterio" con un punteggio "N/5 · atteso M" o "Nessuna evidenza nel CV" per ogni criterio. Su una posizione senza scheda la valutazione si salva come prima, senza quella sezione.
14. **M14 — Tab della posizione.** Apri `/dashboard/positions/<id>?tab=scheda`, `?tab=guide`, `?tab=selezione` e `?tab=xyz`: si aprono rispettivamente Scheda di valutazione, Guide colloquio, Selezione (kanban invariato) e Dettagli.
15. **M15 — Checklist.** Su una posizione con scheda, quiz e guida la checklist "Setup della posizione" mostra quattro spunte; togli la guida e ricarica: "Guida colloquio" non è spuntata e il link apre la tab Guide colloquio.
16. **M16 — Le mie azioni.** Apri `/dashboard`: una posizione bozza o aperta con un quiz ma senza scheda compare con "Manca: Scheda di valutazione" (e le altre parti mancanti separate da virgola); il link apre la tab della prima parte mancante. Una posizione con scheda, quiz e guida non compare; una posizione chiusa non compare mai.
17. **M17 — Knowledge.** Passare `next-steps/FASE2_KNOWLEDGE_DELTA.md` a knowledge-builder, nominando anche `CONTEXT.md`.

## 4. Limiti noti

- **Data di nascita senza marcatore.** `redactBirthDate` toglie una data solo se, sulla stessa riga, segue "nato il", "nata il", "nato/a il", "nato a … il", "data di nascita", "date of birth", "born on", "born" o "DOB". Una data di nascita scritta da sola, o su una riga diversa dal marcatore, resta nel testo inviato al modello.
- **Valutazioni CV precedenti.** Le valutazioni del CV salvate prima della Fase 2 non hanno la valutazione per criterio e non si possono rigenerare: esiste una sola valutazione CV per candidato e posizione (409 sulla seconda).
- **Testo della valutazione per risposta.** Si salvano solo punteggio, punti di forza e aree di miglioramento di ogni risposta; il paragrafo "Valutazione AI" si vede solo per le risposte valutate nella sessione corrente.
- **Criteri archiviati.** Un criterio archiviato non si può ripristinare. Le domande dei quiz e delle guide che già lo citano lo mantengono e lo mostrano "(archiviato)"; non si può collegare a domande nuove di un altro quiz o di un'altra guida.
- **Id di criteri eliminati sui quiz.** Eliminare un criterio lo toglie subito dalle domande delle guide, ma non dai collegamenti dei quiz (scritti solo da `syncQuizQuestions`): l'id resta finché il quiz non viene salvato di nuovo, e ogni lettura lo ignora.

## 5. Punti aperti prima del rilascio

- **Verifica legale** (piano §7.3 punto 6: AI Act e GDPR) sulla proposta AI dei criteri ancora aperta. La funzione viene rilasciata con la conferma umana di ogni criterio: nulla si salva senza "Salva scheda".
- **Migrazione in produzione.** Ripetere la migrazione sul database di produzione con `pnpm db:migrate:deploy`, seguendo `prisma/migrations/README.md`, poi `pnpm db:verify`.

## Validazione

Comandi eseguiti il 16/11/2026 sul codice finale della Fase 2 (operazione IM9).

| Comando | Risultato |
|---|---|
| `pnpm lint` | `eslint .` senza errori (exit 0) |
| `pnpm test:run` | `Test Files  82 passed (82)` · `Tests  1308 passed (1308)` (exit 0) |
| `pnpm build` | `✓ Compiled successfully` · `✓ Generating static pages using 9 workers (96/96)` (exit 0) |
| `pnpm db:verify` (dopo la migrazione) | exit 0, tutte le asserzioni ✓ (candidates 3, applications 5, assessments 5, evaluations 8) |
| `prisma migrate status` | "Database schema is up to date!" |
| `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` | "This is an empty migration." |
| `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma` | Non eseguibile: richiede `datasource.shadowDatabaseUrl`, non configurato. Sostituito dai due controlli precedenti. |

`pnpm db:verify` è stato adattato (`prisma/verify-application-hub.ts`): il controllo della Fase 1 rifiutava ogni nome con "interview" e ora esclude i nomi della tabella `interview_guides` della Fase 2, mantenendo il controllo sulla vecchia tabella `interviews`.
