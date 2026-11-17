# Fase 4 — Aggiornamenti per knowledge-builder

Questo file elenca le affermazioni di `knowledge/` e di `CONTEXT.md` che la Fase 4 (Decisione) ha reso superate o incomplete, e le regole nuove da documentare. Serve al ruolo knowledge-builder, l'unico autorizzato a modificare questi file: nessuna operazione della Fase 4 li ha toccati.

**Anche `CONTEXT.md` va aggiornato, sebbene non sia nel catalogo della knowledge**: va nominato esplicitamente tra i file da aggiornare quando si avvia knowledge-builder (sezione 1).

Ogni voce è stata verificata sul codice reale e riporta cosa dice oggi il documento, cosa deve dire e dove si trova nel codice. I numeri di riga dei documenti sono quelli della versione letta il 17/11/2026.

**Un conflitto va confermato dallo sviluppatore** (sezione 9): D1, la formula con pesi fissi che la knowledge prescriveva ancora quando è partito il design.

## 1. CONTEXT.md

### 1.1 Termini nuovi del glossario

| Termine | Simbolo nel codice | Etichetta UI | Significato |
|---|---|---|---|
| Decisione (pagina) | `/dashboard/applications/[id]/decision`, `getApplicationDecision`, `loadApplicationDecision` | Decisione | Pagina della decisione di una candidatura: matrice criteri × fonti, punteggio complessivo, criteri indispensabili da motivare, avvocato del diavolo, form della decisione, storico in sola lettura |
| Matrice della decisione | `DecisionMatrix` (`components/applications/decision/decision-matrix.tsx`), `computeDecisionScore` | Criterio · CV · Test · Colloquio N (Media + un intervistatore per colonna) · Valore · Peso | Una riga per criterio (attivi, più archiviati con prove sulla candidatura o presenti nei pesi salvati); celle senza prove "Nessuna prova"; badge "Disaccordo" |
| Valore del criterio | `CriterionDecisionRow.value` | Valore | Media, con lo stesso peso, delle fonti disponibili tra CV, Test e media degli intervistatori; tutto su scala 1–5 |
| Punteggio complessivo | `DecisionScore.overall` | Punteggio complessivo; "Nessuna prova" | Media pesata dei valori dei soli criteri con prove, con i pesi della scheda (o quelli salvati con la decisione); mai salvato |
| Punteggi globali | `ApplicationDecision.cv.global`, `.test.global` | Punteggio globale CV / Test (non incluso nella media) | CV (`fitScore`) o Test (`quizScore`) riportati su 1–5 quando manca il collegamento per criterio; non entrano nella media |
| Criteri indispensabili da motivare | `MustWarning`, `mustWarningText` | Criteri indispensabili da motivare · Da motivare | Criterio `must` senza prove o con valore sotto il livello atteso: non azzera il punteggio, la motivazione deve affrontarlo |
| Esito della decisione | `Application.decision` (`DECISION_OUTCOME_VALUES`) | Offerta · Assunto · Scartato | `offer` · `hired` · `rejected` |
| Pesi della decisione | `Application.decisionWeights` (`decisionWeightsSchema`) | Pesi salvati con la decisione del … / Pesi della scheda di valutazione | `{ [criterionId]: peso 1–5 }` dei criteri della matrice al momento della decisione |
| Avvocato del diavolo | `challengeDecisionAction`, `generateDecisionChallenge`, task `decision_review` | Avvocato del diavolo; Chiedi all'avvocato del diavolo | Proposta AI dei motivi per cui l'esito scelto nel form potrebbe essere sbagliato; non si salva |
| Storico (sola lettura) | `LegacyEvaluationHistory`, `ApplicationDecision.legacy` | Storico (sola lettura) | Rubrica comportamentale e note hiring del test raccolte prima della scheda intervistatore, non più modificabili |

### 1.2 Correzioni

1. **Riga 62, "Application evaluation summary".**
   - Oggi dice: `getApplicationEvaluationSummary`, "Punteggio complessivo (tab "Decisione")", punteggio da quiz, rubrica e decisione hiring, card "Quiz", "Scenario comportamentale", "Decisione hiring".
   - Deve dire: la voce si sostituisce con "Decisione (pagina)" e "Punteggio complessivo" della tabella 1.1. `getApplicationEvaluationSummary` non esiste più. La tab "Decisione" mostra solo un riepilogo (esito registrato o "Da decidere", punteggio complessivo, numero di criteri indispensabili da motivare) con "Apri la decisione".
2. **Riga 59, "Hiring notes".**
   - Aggiungere: i campi hiring del test sono storico in sola lettura, mostrati in "Storico (sola lettura)" della pagina Decisione; il form e `updateHiringManagerNotesAction` non esistono più. La card "Decisione hiring" non esiste più.
3. **Riga 61, "Behavioral rubric".**
   - Aggiungere: è storico in sola lettura nella pagina Decisione; il form e `upsertBehavioralRubricAction` non esistono più. La card "Scenario comportamentale" non esiste più.
4. **Riga 69, "Prossima azione".**
   - Oggi dice: "Vai alla decisione (the Decisione tab)".
   - Deve dire: "Vai alla decisione" apre la pagina `/dashboard/applications/{id}/decision`.
5. **Riga 107, "Hire recommendation".**
   - Togliere "the test hiring-notes form still says "Sì, decisamente" / "No, decisamente"": il form non esiste più. Le etichette sono sempre quelle di `HIRE_RECOMMENDATION_LABEL`, anche nello storico.
6. **Riga 117, "Scores".**
   - Oggi dice: "The overall score of an application is computed in the "Decisione" tab, never stored."
   - Deve dire: il punteggio complessivo si calcola nella pagina Decisione (e nel riepilogo della tab) con `computeDecisionScore`, mai salvato. Tutte le fonti sono riportate su 1–5: `CriterionScore` e il voto CV per criterio così come sono; `answerEvaluations` e `fitScore` (0–10) e `quizScore` (0–100) con `1 + 4·v/max`, un decimale.
7. **Sezione nuova di ambiguità: "Esito della decisione vs Raccomandazione".**
   - `Application.decision` è l'esito registrato dal recruiter (Offerta, Assunto, Scartato) e fa avanzare la fase.
   - `hireRecommendation` è la raccomandazione di un intervistatore (scheda) o, nello storico, delle note hiring di un test; non cambia la fase.
8. **Code-area map.**
   - Riga 135 (`app/dashboard/`): aggiungere la sottopagina `applications/[id]/decision`.
   - Riga 141 (`lib/actions/`): aggiungere `application-decisions.ts` (decisione e avvocato del diavolo); togliere `behavioral-rubrics.ts`.
   - Riga 142 (`lib/services/`): aggiungere `application-decisions.ts` (`loadApplicationDecision`, `recordApplicationDecision`).
   - Riga 143 (`lib/services/ai/`): aggiungere `decision-review.ts`.
   - Riga 145 (`lib/utils/`): togliere `evaluation-score.ts`, aggiungere `decision-score.ts`.
   - Riga 151 (`components/applications/`): togliere "evaluation summary view"; aggiungere la cartella `decision/` (matrice, form, avvocato del diavolo, riepilogo della tab, storico, `decision-presentation.ts`, `decision-interview-columns-toggle.tsx`).
   - `components/recruiting/`: `behavioral-rubric-form.tsx` e `hiring-notes-form.tsx` non esistono più.

## 2. knowledge/domain_model.md

1. **Riga 219, "application evaluation summary": formula da sostituire.**
   - Oggi dice: punteggio calcolato da quiz (`quizScore / 10`, peso 0.5), rubrica (media dei quattro voti × 2, peso 0.3), `hireRecommendation` (10/8/6/4/2, peso 0.2).
   - Deve dire (regole della pagina Decisione, tutte in `lib/utils/decision-score.ts`, funzioni pure):
     - **Scala 1–5.** `toFivePointScale(v, max) = 1 + 4·v/max`, limitato a [1, 5], un decimale. Ogni valore derivato si arrotonda a un decimale.
     - **CV per criterio.** Voce di `criteriaAssessment` della valutazione CV della candidatura (stesso candidato e posizione, `assessmentId` null); una voce con voto null non è una prova.
     - **Test per criterio.** Test = l'ultimo test concluso della candidatura che ha una valutazione (`completedAt` decrescente). Per ogni criterio: media dei voti 0–10 di `answerEvaluations` delle domande collegate (`QuizQuestion.criterionIds`) a cui il candidato ha risposto, poi convertita su 1–5. Esiste solo con `answerEvaluations` e almeno una domanda collegata con risposta.
     - **Intervistatori.** Media dei `CriterionScore` di tutte le schede **inviate** (tutti i round) sul criterio. Disaccordo (`isDisagreement`): almeno due voti e massimo − minimo ≥ 2 (`DISAGREEMENT_GAP`).
     - **Valore del criterio.** Media con lo stesso peso delle fonti disponibili tra CV, Test e media degli intervistatori; un criterio ha prove quando almeno una esiste.
     - **Punteggio complessivo.** Σ(peso · valore) / Σ(peso) sui soli criteri con prove e con peso > 0; null quando nessuno ha prove (UI "Nessuna prova").
     - **Righe globali.** Senza `criteriaAssessment` il CV compare come riga globale da `fitScore` (0–10); senza collegamenti o senza `answerEvaluations` il Test compare come riga globale da `quizScore` (0–100). Le righe globali **non** entrano nella media.
     - **Criteri indispensabili.** Un criterio `must` senza prove (`no_evidence`) o con valore < `expectedLevel` (`below_expected`) produce un avviso e non cambia il punteggio. I criteri `nice` non producono avvisi.
     - **Righe della matrice.** Ogni criterio attivo della scheda, in ordine, più ogni criterio archiviato con prove sulla candidatura (voce CV, test collegato, voto di intervistatore) o presente nei pesi salvati; mostrato come archiviato. Gli id di criteri eliminati (su collegamenti di quiz, voci CV, voti) si ignorano.
   - Codice: `lib/utils/decision-score.ts`; `lib/services/application-decisions.ts:143`.
2. **Riga 218, campi hiring.**
   - Oggi dice: i campi hiring sono "saved … by `updateHiringManagerNotesAction`, which also sets `assessedBy`/`assessedAt`".
   - Deve dire: i campi `interviewNotes`, `redFlags`, `standoutMoments`, `hireRecommendation`, `nextSteps` (con `assessedBy`/`assessedAt`) sono storico in sola lettura. Nessuna action li scrive più; si leggono nello storico della pagina Decisione (la valutazione di un test della candidatura più recente che ha almeno uno di questi campi).
3. **Riga 223 (e riga 37), `BehavioralRubric`.**
   - Oggi dice: punteggio manuale 1–5 del recruiter; "the rubric row, its scores and its card do not change".
   - Deve dire: la rubrica è storico in sola lettura. Nessuna pagina o action la crea, modifica o elimina (`upsertBehavioralRubricAction` rimossa); i dati esistenti si leggono in "Storico (sola lettura)" della pagina Decisione. Si elimina ancora a cascata con posizione o candidato.
4. **Riga 34, `Application`: esito della decisione.** Aggiungere le regole di registrazione:
   - `recordApplicationDecision` scrive in una transazione `decision` (`offer`, `hired`, `rejected`), `decisionRationale`, `decidedBy` (utente della sessione), `decidedAt` (ora) e `decisionWeights`, poi chiama `advanceApplicationStage(tx, id, "decision_recorded", outcome)`: la fase avanza all'esito, mai indietro, aggiornando `stageChangedAt`.
   - Motivazione obbligatoria, 10–5000 caratteri dopo il trim.
   - Rifiutata su `hired`, `rejected`, `withdrawn` ("Candidatura chiusa: riaprila per registrare la decisione"); ammessa da ogni fase aperta, anche da `offer` di nuovo per passare ad `hired` o `rejected`. Una nuova decisione sovrascrive la precedente.
   - `decisionWeights` = `{ [criterionId]: peso }` di ogni riga della matrice al momento della decisione (attivi più archiviati con prove).
   - Una candidatura è **decisa** quando `decidedAt` è valorizzato: il punteggio usa allora `decisionWeights`, e un criterio assente dalla mappa (creato dopo) compare senza peso ed è escluso. Senza `decidedAt` si usano i pesi correnti della scheda. Un `decisionWeights` non valido si legge come null (pesi correnti).
   - Codice: `lib/services/application-decisions.ts:465`.
5. **Riga 131, peso di un criterio.** Invariata ("never touches `Application.decisionWeights`"); aggiungere che il cambio di peso cambia quindi solo il punteggio delle candidature non decise.
6. **Righe 43–52, "Access": vista di indipendenza nella pagina Decisione.**
   - La lettura della decisione (`getApplicationDecision`, in cache) restituisce solo le schede **inviate** e mai le note live, uguale per tutti.
   - Per un utente partecipante di un colloquio senza la propria scheda inviata, la pagina parte con chiusi: le colonne di quel colloquio (intervistatori e "Media"), la colonna "Valore", il punteggio complessivo e le liste degli avvisi sui criteri indispensabili (card della pagina e "Da motivare" del form), con l'avviso "Per un giudizio indipendente, invia prima la tua scheda", il collegamento "Compila la tua scheda" e il pulsante "Mostra". Il riepilogo della tab "Decisione" mostra "Visibile dopo l'invio della tua scheda" al posto di punteggio e conteggio degli avvisi. Esito e motivazione del form restano utilizzabili.
   - È una disposizione della vista, **mai** una regola d'accesso: i dati sono già nella pagina e l'utente può aprirli.
   - Codice: `components/applications/decision/decision-interview-columns-toggle.tsx`; `app/dashboard/applications/[id]/decision/page.tsx`; `app/dashboard/applications/[id]/decision-tab.tsx`.
7. **Riga 86, "AI generation never persists".** Aggiungere `challengeDecisionAction`: restituisce solo la proposta dell'avvocato del diavolo, non scrive e non invalida; non esiste un salvataggio della proposta.
8. **Righe 240–260, "Common mistakes".** Aggiungere:
   - calcolare un punteggio complessivo con pesi fissi o includervi le righe globali di CV e Test;
   - usare i pesi correnti della scheda per una candidatura già decisa, o i pesi salvati per una non decisa;
   - leggere schede non inviate o note live nella lettura della decisione;
   - trasformare la chiusura delle colonne della pagina Decisione in un filtro della lettura;
   - prendere `decidedBy` dall'input invece che dalla sessione;
   - riaggiungere una scrittura della rubrica comportamentale o dei campi hiring del test.

## 3. knowledge/server_actions.md

1. **Righe 76–96, azioni autenticate.** Tutte chiamano `requireUser()` e nessuna fa controlli di ruolo o proprietario. Aggiungere (`lib/actions/application-decisions.ts`):
   - `recordApplicationDecisionAction({ applicationId, outcome, rationale })` → `{ stage }`: l'utente che decide è sempre quello della sessione. Errori: "Candidatura non trovata", "Candidatura chiusa: riaprila per registrare la decisione", e i messaggi dello schema "La motivazione deve avere almeno 10 caratteri", "La motivazione può avere al massimo 5000 caratteri", "Esito della decisione non valido". Chiama `invalidateCandidateCache({ candidateId, positionId, applicationId })`; nessun redirect (il client fa `router.refresh()`).
   - `challengeDecisionAction({ applicationId, outcome, rationale?, specificModel? })` → `{ challenge: { reasons: { title, explanation, criterionIds }[] } }`. Errori: "Candidatura non trovata", "Crea prima la scheda di valutazione della posizione" (nessun criterio), errori AI tramite `describeAIError`. Calcola il punteggio con i pesi salvati solo se `decidedAt` è valorizzato.
2. **Riga 97, action di generazione in sola lettura.** Aggiungere `challengeDecisionAction` all'elenco: non scrive e non invalida.
3. **Azioni rimosse.** Togliere ogni riferimento a `updateHiringManagerNotesAction` (`lib/actions/evaluation-entity.ts`, restano `updateEvaluationNotesAction` e `deleteEvaluationAction`) e a `upsertBehavioralRubricAction` (file `lib/actions/behavioral-rubrics.ts` eliminato).

## 4. knowledge/ai_generation.md

1. **Riga 37, task di `getOptimalModel`.** Nuovo `LLMTaskType` `decision_review` sul modello grande (`LLM_MODELS.GPT_OSS_120B`), nel gruppo di scorecard, guida e kit. Codice: `lib/services/ai/models.ts`.
2. **Righe 43–50, Determinism.** L'avvocato del diavolo usa temperatura 0.7 e nessun seed.
3. **Righe 52–63, Prompts: avvocato del diavolo.**
   - Prompt in `lib/services/ai/prompts.ts` (`buildDecisionReviewSystemPrompt`, `buildDecisionReviewPrompt`): argomentare **contro** l'esito proposto con 3–5 motivi; JSON `{ reasons: [{ title, explanation, criterionKeys }] }`; valori in italiano; solo le chiavi elencate; mai argomenti su età, famiglia, stato civile, figli, religione, opinioni politiche o salute.
   - **Solo statistiche.** Il prompt riceve il titolo della posizione (`sanitizeInput`), l'esito in italiano (Offerta, Assunzione, Scarto), la motivazione `sanitizeInput(rationale, 5000)` o "nessuna motivazione", il punteggio complessivo, una riga per criterio con chiave C<n>, nome (`sanitizeInput`), priorità, peso, livello atteso, CV, Test, media dei colloqui con numero di intervistatori e i segni "senza prove", "voti discordanti", "archiviato", e le righe globali. Mai nome, email, data di nascita o testo del CV del candidato, mai nomi o testi liberi degli intervistatori.
4. **Righe 65–69, chiavi.** I criteri sono le righe della matrice in ordine, con `buildCriterionKeys`; le chiavi restituite si risolvono con `resolveCriterionKeys` (sconosciute scartate).
5. **Flusso nuovo "Decision review".** `challengeDecisionAction` → `loadApplicationDecision` → `computeDecisionScore` → `generateDecisionChallenge` (`lib/services/ai/decision-review.ts`): `generateStructured({ task: "decision_review", schema: aiDecisionChallengeSchema, temperature: 0.7 })`; motivi con titolo e spiegazione senza spazi ai bordi, titoli vuoti scartati, al massimo `MAX_CHALLENGE_REASONS` (5). Nessuna scrittura.

## 5. knowledge/cache_invalidation.md

1. **Letture che usano i tag esistenti.** Aggiungere `getApplicationDecision(applicationId)` (`lib/data/applications.ts`): `cacheLife("hours")`, tag `candidates`, `positions`, `assessments`, `evaluations`, `quizzes`, `questions`, `scorecards`, `interviews`, `behavioral-rubrics`, poi `candidate-{id}` e `positions-{id}`. Restituisce solo schede inviate e nessuna nota live; non legge la sessione. Sostituisce `getApplicationEvaluationSummary`, eliminata.
2. **Riga 93, helper.** Togliere `invalidateBehavioralRubricCache`: non esiste più. Restano `CacheTags.BEHAVIORAL_RUBRICS`, `entityTag.behavioralRubric` e le voci di `CASCADE_ON_DELETE` (righe 117 e 119), usati dalle letture e dalle eliminazioni.
3. **Scrittura della decisione.** `recordApplicationDecisionAction` chiama `invalidateCandidateCache({ candidateId, positionId, applicationId })`: scade `candidates`, portato da `getApplicationDecision`, e rivalida pipeline, candidatura, candidato, posizione e home. Nessun tag nuovo. `challengeDecisionAction` non invalida nulla.
4. **Righe 12–20, letture e sessione.** La pagina Decisione e la tab Decisione leggono la sessione dopo `await connection()` (vista di indipendenza), fuori dalla lettura in cache.

## 6. knowledge/styling.md

1. **Righe 33–65, mappe di presentazione.** Aggiungere il modulo `components/applications/decision/decision-presentation.ts`, unica mappa della decisione:
   - `DECISION_OUTCOME_LABEL` (Offerta, Assunto, Scartato) e `DECISION_OUTCOME_OPTIONS` nell'ordine offer, hired, rejected;
   - `mustWarningText(warning)`: "{criterio}: nessuna prova" / "{criterio}: sotto il livello atteso ({valore} su {atteso})";
   - `scoreTintClass(value, expectedLevel)`: `bg-success/10 text-success` da `expectedLevel` in su, `bg-warning/10 text-warning` fino a un punto sotto, `bg-destructive/10 text-destructive` più in basso, `bg-muted text-muted-foreground` senza valore (stessa regola del voto CV per criterio, ma su valori con un decimale).
2. **Matrice.** Celle senza prove "Nessuna prova" `bg-warning/10 text-warning`; badge "Disaccordo" `bg-warning/10 text-warning`; priorità con `CRITERION_PRIORITY_PRESENTATION`; raccomandazione con `HIRE_RECOMMENDATION_LABEL` ("Nessuna raccomandazione" se assente). Prima colonna fissa, tabella con scorrimento orizzontale.
3. **Etichette della raccomandazione.** `styling.md` non cita il form delle note hiring; il riferimento a "Sì, decisamente" è solo in `CONTEXT.md` (sezione 1.2, punto 5).

## 7. knowledge/testing.md

1. **Righe 44–46, file di test.** Aggiungere i file della Fase 4 (layout invariato):
   - `tests/lib/utils/decision-score.test.ts`;
   - `tests/lib/services/application-decisions.test.ts`;
   - `tests/lib/services/ai/decision-review.test.ts`;
   - `tests/lib/actions/application-decisions.test.ts`;
   - `tests/components/applications/decision-presentation.test.ts`;
   - casi nuovi in `tests/lib/data/applications.test.ts` (`getApplicationDecision`), `tests/lib/services/prompts.test.ts` ("decision review prompts"), `tests/lib/services/ai/models.test.ts` e `tests/lib/schemas/application.test.ts`.
   - Eliminato `tests/lib/utils/evaluation-score.test.ts`.
2. **Strategie.**
   - Il servizio della decisione si testa con un client costruito a mano (`application`, `scorecardCriterion`, `evaluation`, `assessment`, `interview`, `behavioralRubric`, più `kitItemNote` e `interviewerFeedback` per verificare che non siano mai chiamati); per `recordApplicationDecision` un `vi.mock("@/lib/prisma")` a livello di file con `$transaction: (fn) => fn(tx)` e `advanceApplicationStage` mockata parzialmente con `importOriginal` (o con l'implementazione reale tramite `vi.importActual` per verificare il passaggio di fase).
   - `tests/lib/services/prompts.test.ts` mocka `@/lib/services/ai/sanitize` con una spia che chiama l'implementazione reale, per verificare `sanitizeInput(rationale, 5000)`.

## 8. Nulla da cambiare

Verificati sul codice e ancora corretti:

- `knowledge/domain_model.md`: avanzamenti mai all'indietro e mai su candidature chiuse (la Fase 4 usa l'evento esistente `decision_recorded`); nessun ruolo; eccezione d'accesso limitata al materiale non inviato.
- `knowledge/server_actions.md`: forma dell'action, contratto degli errori, autenticazione, form client.
- `knowledge/ai_generation.md`: unico punto d'ingresso `generateStructured`, fallback, `describeAIError`.
- `knowledge/cache_invalidation.md`: regola dei tag di dipendenza, nessun tag per `Application`.
- `knowledge/question_schemas.md`: nessuna modifica.
- Database: nessuna migrazione; i campi della decisione esistono dalla Fase 1.

## 9. Conflitti

1. **D1 — La knowledge prescriveva ancora la formula con pesi fissi.**
   - **Il piano** (§7.2, riga della Fase 4) chiedeva di aggiornare la regola della "Dashboard valutazione" (oggi "application evaluation summary", `knowledge/domain_model.md` riga 219) **prima** del design della Fase 4. Non è stato fatto.
   - **Il design** ha proceduto comunque, sostituendo la formula (obblighi O4 e O13) e rendendo in sola lettura rubrica e campi hiring (D14), in contrasto con le righe 218 e 223 di `domain_model.md`.
   - **Da fare:** lo sviluppatore conferma la scelta alla revisione del design; knowledge-builder sostituisce le righe 218, 219 e 223 come descritto nella sezione 2.

## Fuori da knowledge/ e CONTEXT.md (solo segnalazione)

- `next-steps/INTERVIEW_PREPARATION_PLAN.md`: aggiornato (Stato, §1, §6, §7.2, §8.1 ter).
- `tests/lib/utils/application-timeline.test.ts`: errore di tipo preesistente segnalato da `npx tsc --noEmit` (non dalla build); non riguarda la Fase 4.
