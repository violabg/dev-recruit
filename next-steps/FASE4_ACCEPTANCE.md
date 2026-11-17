# Fase 4 — Decisione: criteri di accettazione

**Data:** 17 novembre 2026 · **Branch:** `claude/dreamy-shannon-17omy9` · **Sessione di design:** `fase4_interview_prep_design` (job `phase4-design`)

## 1. Perimetro

La Fase 4 aggiunge alla candidatura la **pagina Decisione** (`/dashboard/applications/[id]/decision`) e sostituisce il punteggio con pesi fissi.

- **Matrice criteri × fonti:** una riga per criterio della scheda di valutazione (attivi, più gli archiviati con prove su questa candidatura o salvati nei pesi della decisione). Le colonne sono CV, Test, ogni Colloquio (media dei suoi intervistatori) e ogni singolo intervistatore con la sua raccomandazione, poi Valore e Peso. Ogni fonte è riportata sulla scala 1–5 (`1 + 4·v/max`, un decimale). Le celle senza prove mostrano "Nessuna prova" evidenziato; i voti discordanti (scarto ≥ 2) mostrano il badge "Disaccordo".
- **CV e Test globali:** quando il CV non ha la valutazione per criterio, o il test non ha collegamenti ai criteri o il dettaglio per risposta, compaiono come "Punteggio globale CV/Test" sotto la matrice, "(non incluso nella media)".
- **Punteggio complessivo:** media pesata dei valori per criterio con i pesi della scheda, solo sui criteri con prove. Con la decisione registrata usa i pesi salvati in `decisionWeights`; prima della decisione usa i pesi correnti della scheda.
- **Criteri indispensabili:** un criterio `must` senza prove o sotto il livello atteso non azzera il punteggio; compare in "Criteri indispensabili da motivare" e nel riquadro "Da motivare" del form.
- **Avvocato del diavolo:** proposta AI (task `decision_review`) dei motivi per cui l'esito scelto nel form potrebbe essere sbagliato. Non salva nulla.
- **Form decisione:** esito (Offerta, Assunto, Scartato) e motivazione (10–5000 caratteri). Registra esito, motivazione, utente, data e pesi usati, e fa avanzare la fase della candidatura; rifiutato su candidature Assunto, Scartato, Ritirato.
- **Indipendenza degli intervistatori (vista):** per un partecipante di un colloquio che non ha ancora inviato la propria scheda, colonne di quel colloquio, celle "Valore", punteggio complessivo e liste degli avvisi sui criteri indispensabili (riquadro della pagina e "Da motivare" del form) partono chiusi, con l'invito a inviare prima la propria scheda e il pulsante "Mostra". È solo una disposizione della vista: la lettura restituisce le schede inviate a tutti.
- **Storico in sola lettura:** rubrica comportamentale e note hiring del test si vedono in "Storico (sola lettura)"; form e action di scrittura sono stati rimossi.
- **Navigazione:** la tab "Decisione" mostra un riepilogo con "Apri la decisione"; "Vai alla decisione" di "Prossima azione" apre la pagina Decisione.

Fuori perimetro: registrazione, trascrizione e sintesi AI del colloquio, guida per il candidato, feedback dopo il rifiuto (Fase 5). Nessuna migrazione del database: i campi della decisione esistono dalla Fase 1.

Legenda degli esiti:

- ✅ verificato da un controllo automatico eseguito durante la Fase 4 (test Vitest, build, ricerca nel codice);
- ☐ passo manuale ancora da fare dallo sviluppatore (elenco ordinato nella sezione 3);
- ❌ controllo eseguito e fallito.

Le pagine si aprono da utente autenticato su `pnpm dev`, con `DATABASE_URL` sul ramo Neon `development`. "M<n>" rimanda al passo manuale n della sezione 3. I passi con due utenti richiedono due browser (o una finestra anonima) con due account diversi.

## 2. Criteri di accettazione

### Navigazione

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O1 — Per ogni candidatura, in qualsiasi fase, la pagina Decisione è raggiungibile a `/dashboard/applications/{id}/decision` e mostra la decisione di quella candidatura. | `pnpm build` (route `/dashboard/applications/[id]/decision`, `◐` Partial Prerender con il segnaposto `placeholder`); `app/dashboard/applications/[id]/decision/page.tsx` (`notFound()` per un id sconosciuto). M1. | ✅ (build) · ☐ (manuale) |
| O2 — Dalla pagina della candidatura, la tab "Decisione" porta alla pagina Decisione. | `app/dashboard/applications/[id]/decision-tab.tsx` rende `DecisionSummaryCard` con il collegamento "Apri la decisione" (`components/applications/decision/decision-summary-card.tsx`). M1. | ✅ (codice) · ☐ (manuale) |
| O3 — Con tutte le schede inviate, "Prossima azione" mostra "Vai alla decisione", che apre la pagina Decisione. | `tests/lib/utils/next-action.test.ts` (riga 7, regola invariata); `components/applications/next-action-card.tsx` (`go_to_decision` → `${applicationHref}/decision`). M1. | ✅ (test + codice) · ☐ (manuale) |

### Punteggio e regole di calcolo

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O4 — Nessuna pagina mostra un punteggio complessivo calcolato con i pesi fissi (quiz 0.5, rubrica 0.3, decisione hiring 0.2). | `lib/utils/evaluation-score.ts`, `components/applications/evaluation-summary-view.tsx` e `getApplicationEvaluationSummary` eliminati; `grep -rn "evaluation-score\|EvaluationSummaryView\|getApplicationEvaluationSummary" app components lib tests` non restituisce nulla; `pnpm build` senza import pendenti. Il punteggio viene solo da `computeDecisionScore` (`tests/lib/utils/decision-score.test.ts`). M1. | ✅ |
| O12 — Per ogni criterio i voti degli intervistatori si combinano come media tra intervistatori. | `tests/lib/utils/decision-score.test.ts` ("averages the interviewers, then the available sources with equal weight": intervistatori 3 e 5 → media 4). M3. | ✅ (test) · ☐ (manuale) |
| O13 — Il punteggio complessivo è la media pesata dei valori per criterio con i pesi della scheda, solo sui criteri con prove. | `tests/lib/utils/decision-score.test.ts` ("weights the overall only over criteria with evidence": pesi 3 e 1, valori 4 e 2 → 3.5, terzo criterio senza prove escluso; "has no overall when no criterion has evidence"; "has no overall when the weights of the criteria with evidence sum to zero"). M5. | ✅ (test) · ☐ (manuale) |
| O14 — Un criterio `must` sotto il livello atteso o senza prove non azzera il punteggio e la pagina mostra un avviso che la motivazione deve affrontarlo. | `tests/lib/utils/decision-score.test.ts` ("warns on a must criterion below the expected level without changing the overall", "warns on a must criterion without evidence", "does not warn on a must criterion at or above the expected level"); `tests/components/applications/decision-presentation.test.ts` (`mustWarningText`); riquadro "Criteri indispensabili da motivare" della pagina e "Da motivare" in `decision-form.tsx` con "La motivazione della decisione deve affrontare esplicitamente questi punti". M5. | ✅ (test) · ☐ (manuale) |
| O19 — Cambiare il peso di un criterio cambia il punteggio delle candidature non decise e non tocca pesi e punteggio di quelle già decise. | `tests/lib/utils/decision-score.test.ts` ("uses the stored weights of a decided application and excludes criteria missing from them", "uses the live scorecard weights of an undecided application"); `tests/lib/actions/application-decisions.test.ts` ("uses the live weights of an undecided application, even with stored weights", "uses the stored weights of a decided application"); la pagina passa `decisionWeights` solo con `decidedAt` valorizzato. M9. | ✅ (test) · ☐ (manuale) |

### Matrice

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O5 — La pagina mostra una matrice con una riga per criterio e una colonna per fonte (CV, Test, Colloquio 1, Colloquio 2, …, singoli intervistatori); ogni cella mostra la prova di quella fonte. | `tests/lib/services/application-decisions.test.ts` ("reads only submitted scorecards…": colloqui con schede e voti per criterio; "ignores deleted criterion ids…": fonti CV e Test per criterio); componente `components/applications/decision/decision-matrix.tsx` (gruppi "Colloquio {round}" con "Media" e una colonna per scheda inviata, evidenze sotto il voto). M2. | ✅ (test) · ☐ (manuale) |
| O6 — Ogni cella senza prove è evidenziata. | `decision-matrix.tsx` (`ScoreValue`: "Nessuna prova" con `bg-warning/10 text-warning`); `tests/lib/utils/decision-score.test.ts` ("keeps the input order and treats a missing source entry as no evidence"). M2. | ✅ (codice + test) · ☐ (manuale) |
| O7 — Con intervistatori in disaccordo su un criterio la pagina lo segnala; con intervistatori d'accordo no. | `tests/lib/utils/decision-score.test.ts` (`isDisagreement`: [3,5] sì, [3,4] e [4] no; flag `disagreement` della riga); badge "Disaccordo" in `decision-matrix.tsx`. M3. | ✅ (test) · ☐ (manuale) |
| O8 — CV e Test compaiono per criterio quando il collegamento esiste, altrimenti come riga globale. | `tests/lib/services/application-decisions.test.ts` ("ignores deleted criterion ids…": `perCriterion: true`; "reads an invalid CV criteria assessment as a global CV row"; "marks the test as global when the answer details are missing"); righe "Punteggio globale CV/Test … (non incluso nella media)" in `decision-matrix.tsx`. M4. | ✅ (test) · ☐ (manuale) |
| O9 — Ogni valore della matrice e del punteggio è sulla scala 1–5. | `tests/lib/utils/decision-score.test.ts` (`toFivePointScale`: (0,10)=1, (10,10)=5, (5,10)=3, (7,10)=3.8, (70,100)=3.8, limiti; `testScoresByCriterion`: media 0–10 poi conversione); `tests/lib/services/application-decisions.test.ts` (`fitScore` 8 → 4.2, `quizScore` 70 → 3.8). M2, M4. | ✅ (test) · ☐ (manuale) |
| O10 — L'id di un criterio eliminato rimasto su un collegamento di quiz non produce righe, celle né contributi. | `tests/lib/utils/decision-score.test.ts` ("ignores criterion ids that are not in the scorecard"); `tests/lib/services/application-decisions.test.ts` ("ignores deleted criterion ids on quiz links, CV entries and interviewer scores"). | ✅ |
| O11 — Un criterio archiviato dopo che sono state raccolte prove resta visibile nella decisione, con le sue prove, segnato come archiviato; un criterio eliminato non compare mai. | `tests/lib/services/application-decisions.test.ts` ("keeps an archived criterion with evidence, flagged as archived", "drops an archived criterion without evidence on this application", "keeps an archived criterion stored in the decision weights"); etichetta " (archiviato)" in `decision-matrix.tsx`. M10. | ✅ (test) · ☐ (manuale) |

### Avvocato del diavolo

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O15 — La pagina offre un riquadro AI "Avvocato del diavolo" con i motivi per cui la decisione potrebbe essere sbagliata. | `tests/lib/services/ai/decision-review.test.ts` (task `decision_review`, temperatura 0.7, nessun seed; chiavi C<n> risolte, chiavi sconosciute scartate; al massimo 5 motivi, titoli vuoti scartati; nessun nome di candidato o intervistatore né testo libero nel prompt); `tests/lib/services/prompts.test.ts` ("decision review prompts"); `tests/lib/services/ai/models.test.ts` (modello grande per `decision_review`); `tests/lib/actions/application-decisions.test.ts` ("returns the challenge, writes nothing and invalidates nothing", "refuses a position without scorecard criteria"). M6. | ✅ (test) · ☐ (manuale) |

### Registrazione della decisione

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O16 — Il form con esito e motivazione registra sulla candidatura esito, motivazione, utente che decide e data. | `tests/lib/services/application-decisions.test.ts` ("writes the decision with the session user and the weights, then advances the stage in the same transaction"); `tests/lib/actions/application-decisions.test.ts` ("records with the session user…": l'utente viene dalla sessione, un `decidedBy` nell'input è ignorato; motivazione corta e esito non valido rifiutati); `tests/lib/schemas/application.test.ts` (`recordApplicationDecisionSchema`). M7. | ✅ (test) · ☐ (manuale) |
| O17 — Registrare la decisione porta la candidatura alla fase dell'esito (Offerta, Assunto, Scartato), mai indietro, aggiornando `stageChangedAt`. | `tests/lib/services/application-decisions.test.ts` ("moves an application in %s to %s and updates stageChangedAt": interview → hired, decision → offer, offer → rejected, offer → hired; "refuses a closed application in %s" per hired, rejected, withdrawn; "allows a new decision on an application in offer…"); regola esistente `advanceStage` (`tests/lib/utils/application-stage.test.ts`). M7, M8. | ✅ (test) · ☐ (manuale) |
| O18 — Alla registrazione si salvano in `decisionWeights` i pesi (1–5) dei criteri usati. | `tests/lib/services/application-decisions.test.ts` (`decisionWeights: { c1: 4, c2: 2 }` nello stesso `update`); `tests/lib/utils/decision-score.test.ts` (`buildDecisionWeights`); `tests/lib/schemas/application.test.ts` (`decisionWeightsSchema` rifiuta 0, 6, 2.5). M9. | ✅ (test) · ☐ (manuale) |
| O24 — Dopo la registrazione ogni pagina che mostra la candidatura, la fase o la decisione mostra i nuovi valori. | `tests/lib/actions/application-decisions.test.ts` (`invalidateCandidateCache({ candidateId, positionId, applicationId })`); `tests/lib/data/applications.test.ts` ("delegates to the decision loader with the prisma client and tags every source": nove tag di collezione più `candidate-{id}` e `positions-{id}`). M7. | ✅ (test) · ☐ (manuale) |

### Accesso e indipendenza

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O20 — Una scheda intervistatore compare nella pagina solo dopo l'invio, per tutti gli utenti autenticati; una scheda non inviata non compare mai. | `tests/lib/services/application-decisions.test.ts` ("reads only submitted scorecards of interviews not cancelled or no-show, and never live notes": `feedback.where = { submittedAt: { not: null } }`). La chiusura delle colonne per chi non ha inviato è solo di vista (`decision-interview-columns-toggle.tsx`). M11. | ✅ (test) · ☐ (manuale) |
| O21 — Note live e voti sulle domande del kit di un intervistatore non compaiono mai nella pagina prima del suo invio. | `tests/lib/services/application-decisions.test.ts` (lo stesso caso: `kitItemNote.findMany` e `interviewerFeedback.findMany` mai chiamati; la pagina non legge note live). M11. | ✅ (test) · ☐ (manuale) |

### Storico in sola lettura

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O22 — Le rubriche comportamentali esistenti si vedono in sola lettura; nessuna pagina o action le crea, modifica o elimina. | Eliminati `lib/actions/behavioral-rubrics.ts`, `components/recruiting/behavioral-rubric-form.tsx`, `behavioralRubricSchema`, `invalidateBehavioralRubricCache`; `grep -rn "upsertBehavioralRubricAction\|behavioralRubricSchema\|BehavioralRubricForm" app components lib` non restituisce nulla; `tests/lib/services/application-decisions.test.ts` ("reads the legacy rubric and hiring notes as history"); `legacy-evaluation-history.tsx` senza form né action. M12. | ✅ · ☐ (manuale) |
| O23 — I campi hiring legacy di una valutazione (`interviewNotes`, `redFlags`, `standoutMoments`, `hireRecommendation`, `nextSteps`) si vedono in sola lettura; nessuna pagina o action li scrive. | Eliminati `updateHiringManagerNotesAction` (`lib/actions/evaluation-entity.ts`), `components/recruiting/hiring-notes-form.tsx`, `hiringNotesSchema`; `grep -rn "updateHiringManagerNotesAction\|hiringNotesSchema\|HiringNotesForm" app components lib` non restituisce nulla; stesso test di O22. M12. | ✅ · ☐ (manuale) |

### Consegne

| Obbligo | Come si verifica | Esito |
|---|---|---|
| O25 — Consegna di `next-steps/FASE4_ACCEPTANCE.md`. | Questo file. | ✅ |
| O26 — Consegna di `next-steps/FASE4_KNOWLEDGE_DELTA.md` che nomina `CONTEXT.md`. | File presente; nomina `CONTEXT.md` in apertura e ha una sezione dedicata. Nessun file sotto `knowledge/` né `CONTEXT.md` modificato. M13. | ✅ (file) · ☐ (knowledge-builder) |
| O27 — Aggiornamento del piano in §6 e §8.1. | `next-steps/INTERVIEW_PREPARATION_PLAN.md` (Stato, §1, §6 riga 4, §7.2, §8.1 ter). | ✅ |

## 3. Passi manuali, in ordine

Da fare con `pnpm dev`, da utente autenticato, sul ramo `development`. Servono una posizione con scheda di valutazione (almeno un criterio `must` e uno `nice`), una candidatura con CV valutato, test valutato e un colloquio concluso con due schede inviate, e un secondo utente dell'app per M11.

1. **M1 — Arrivare alla pagina.** Su una candidatura con tutte le schede inviate, "Prossima azione" mostra "Vai alla decisione": aprendolo si arriva a `/dashboard/applications/{id}/decision`, con titolo "Decisione" e "Nome Cognome · Posizione". "Torna alla candidatura" riporta indietro. Dalla tab "Decisione" il riepilogo mostra "Da decidere", il punteggio complessivo su 5 e "Apri la decisione", che apre la stessa pagina. Nessuna pagina mostra più "Pesi: quiz 50%, scenario 30%, note hiring 20%".
2. **M2 — Colonne e celle vuote.** La matrice ha le colonne Criterio, CV, Test (con il titolo del quiz), "Colloquio 1" con "Media" e una colonna per ogni intervistatore (nome e raccomandazione), Valore, Peso. I valori sono "x/5" colorati rispetto al livello atteso; le celle senza prova mostrano "Nessuna prova" in arancione. Sotto un voto di intervistatore compare la sua evidenza. Su una candidatura senza test valutato la colonna Test è tutta "Nessuna prova".
3. **M3 — Disaccordo.** Con due intervistatori che hanno dato 2 e 4 sullo stesso criterio, la riga mostra il badge "Disaccordo" e la "Media" del colloquio è 3/5. Con voti 3 e 4 il badge non c'è.
4. **M4 — Righe globali.** Su una candidatura il cui test usa un quiz senza collegamenti ai criteri, sotto la matrice compare "Punteggio globale Test: x/5 (non incluso nella media)". Con un test valutato prima della Fase 2 compare anche "Dettaglio risposte del test assente: ricalcolalo dalla pagina del test per avere il test per criterio". Con una valutazione CV senza valutazione per criterio compare "Punteggio globale CV: x/5 (non incluso nella media)".
5. **M5 — Criteri indispensabili.** Con un criterio `must` sotto il livello atteso e un altro `must` senza prove, la card "Criteri indispensabili da motivare" li elenca ("…: sotto il livello atteso (x su y)", "…: nessuna prova") e il form mostra lo stesso elenco nel riquadro "Da motivare". Il punteggio complessivo non è zero ed è la media pesata dei soli criteri con prove ("Media pesata sui soli criteri con prove; CV e test globali non inclusi").
6. **M6 — Avvocato del diavolo.** Senza esito scelto il pulsante "Chiedi all'avvocato del diavolo" è disattivato con "Scegli un esito per ricevere i controargomenti". Scegli "Scartato", scrivi una motivazione e premi il pulsante: arrivano da 3 a 5 motivi in italiano, con i nomi dei criteri citati come badge e la nota "Proposta AI: non viene salvata". Ricaricando la pagina i motivi spariscono e nulla è cambiato.
7. **M7 — Registrare Offerta.** Scegli "Offerta", motivazione "breve": l'errore "La motivazione deve avere almeno 10 caratteri". Con una motivazione valida premi "Registra decisione": toast "Decisione registrata", la card "Decisione registrata" mostra Offerta, il tuo nome, la data e la motivazione; la fase della candidatura è Offerta. La candidatura nella pipeline, nel kanban della posizione, nella pagina del candidato e in "Le mie azioni" mostra la fase nuova senza ricaricare la cache a mano.
8. **M8 — Da Offerta ad Assunto e rifiuto sulle chiuse.** Sulla stessa candidatura registra "Assunto": la fase passa ad Assunto. Ora il form è disattivato con "Candidatura chiusa: riaprila per registrare la decisione". Su una candidatura Scartata o Ritirata il form è disattivato allo stesso modo.
9. **M9 — Cambio di peso dopo la decisione.** Annota il punteggio complessivo di una candidatura decisa (sottotitolo "Pesi salvati con la decisione del …") e di una non decisa della stessa posizione ("Pesi della scheda di valutazione"). Dalla scheda di valutazione cambia il peso di un criterio con prove e salva. La candidatura decisa mostra lo stesso punteggio e gli stessi pesi; quella non decisa mostra il punteggio ricalcolato.
10. **M10 — Criterio archiviato.** Togli dalla scheda un criterio con prove su una candidatura e salva (diventa archiviato). Nella pagina Decisione la riga resta, con " (archiviato)" e le sue prove. Un criterio eliminato (senza prove) non compare.
11. **M11 — Due utenti, indipendenza.** L'utente B è partecipante di un colloquio concluso in cui l'utente A ha già inviato la scheda e B no. B apre la pagina Decisione: vede l'avviso "Per un giudizio indipendente, invia prima la tua scheda: punteggio e schede degli altri sono nascosti finché non la mostri"; nel gruppo di quel colloquio "Compila la tua scheda" e "Mostra"; le celle degli intervistatori, la "Media", la colonna "Valore", il punteggio complessivo e le liste "Criteri indispensabili da motivare" e "Da motivare" mostrano "•••" o "Visibile dopo l'invio della tua scheda". Esito e motivazione del form restano utilizzabili. "Mostra" apre tutto. Nella tab "Decisione" B vede "Visibile dopo l'invio della tua scheda" al posto di punteggio e conteggio degli avvisi. La bozza non inviata di B non compare mai, per nessun utente, e l'utente A (che ha inviato) vede tutto aperto.
12. **M12 — Storico in sola lettura.** Su una candidatura con una rubrica comportamentale o note hiring del test salvate prima di questa fase, la pagina mostra "Storico (sola lettura)" con "Dati raccolti prima della scheda intervistatore: non sono modificabili", i voti della rubrica e le note hiring, senza campi né pulsanti. Nessuna pagina (tab Decisione, pagina del candidato, pagina del test) offre più un form per rubrica o note hiring.
13. **M13 — Knowledge.** Passare `next-steps/FASE4_KNOWLEDGE_DELTA.md` a knowledge-builder, nominando anche `CONTEXT.md`.

## 4. Limiti noti

- **Valutazione CV senza `fitScore`.** `Evaluation.fitScore` è nullable nello schema: se manca, la riga globale del CV non compare, ma i voti per criterio del CV restano nella matrice.
- **Tab Decisione e indipendenza.** Il riepilogo della tab nasconde punteggio e avvisi a chi deve ancora inviare la propria scheda, ma non ha un pulsante "Mostra": la vista completa è sulla pagina Decisione.
- **Avvocato del diavolo.** Il numero di motivi (3–5) è chiesto nel prompt; il servizio taglia a 5 e scarta i titoli vuoti, ma non scarta una risposta con meno di 3 motivi. Il divieto di argomenti su età, famiglia, figli, religione, opinioni politiche e salute è solo nel prompt.
- **Decisione ripetuta.** Una nuova decisione (per esempio da Offerta ad Assunto) sovrascrive esito, motivazione, utente, data e pesi della precedente: non c'è uno storico delle decisioni.
- **Pesi salvati.** `decisionWeights` contiene i criteri della matrice al momento della decisione; un criterio creato dopo compare senza peso ("—") ed è escluso dal punteggio. Un valore JSON non valido si legge come assente (pesi correnti).
- **Etichette.** L'esito nel form è "Offerta / Assunto / Scartato"; nel prompt dell'avvocato del diavolo è "Offerta / Assunzione / Scarto".

## 5. Punti aperti prima del rilascio

- **Conflitto con la knowledge (D1).** La knowledge (`knowledge/domain_model.md`, riga 219) descrive ancora la formula con pesi fissi dell'"application evaluation summary" e (riga 218) `updateHiringManagerNotesAction` come scrittura dei campi hiring. Il piano (§7.2) chiedeva di aggiornarla prima del design della Fase 4; non è stato fatto. Il design ha proceduto sostituendo la formula (O4, O13) e riporta le affermazioni superate in `FASE4_KNOWLEDGE_DELTA.md`.
- **Rimozione delle scritture legacy (D14).** `upsertBehavioralRubricAction`, `updateHiringManagerNotesAction`, i due form e `invalidateBehavioralRubricCache` sono stati eliminati. I dati restano nel database e si leggono nello storico; nessuna migrazione.
- **Verifica legale** (piano §7.3 punto 6: GDPR e AI Act), ora anche per l'avvocato del diavolo: **ancora aperta**. Misure adottate: nel prompt arrivano solo statistiche per criterio con chiavi C<n>, il titolo della posizione, l'esito e la motivazione ripulita (`sanitizeInput(rationale, 5000)`); mai nome, email, data di nascita, testo del CV, nomi o testi liberi degli intervistatori. La proposta non si salva e la decisione resta umana.
- **Migrazioni in produzione.** Nessuna migrazione nuova nella Fase 4; restano quelle delle Fasi 1–3 secondo `prisma/migrations/README.md`.

## Validazione

Comandi eseguiti il 17/11/2026 sul codice finale della Fase 4 (operazione IM6).

| Comando | Risultato |
|---|---|
| `pnpm lint` | `eslint .` senza errori né avvisi (exit 0) |
| `pnpm test:run` | `Test Files  101 passed (101)` · `Tests  1596 passed (1596)` (exit 0) |
| `pnpm build` | `✓ Compiled successfully` · `✓ Generating static pages using 9 workers (114/114)`; route `/dashboard/applications/[id]/decision` presente (exit 0) |

`npx tsc --noEmit` segnala un solo errore, preesistente e fuori dalla Fase 4: `tests/lib/utils/application-timeline.test.ts(5,84)` (`ApplicationDetail.interviews` opzionale nell'oggetto di test). Non blocca `pnpm build`.
