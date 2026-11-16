# Fase 2 — Aggiornamenti per knowledge-builder

Questo file elenca le affermazioni di `knowledge/` e di `CONTEXT.md` che la Fase 2 (Scheda di valutazione e guide) ha reso superate o incomplete, e le regole nuove da documentare. Serve al ruolo knowledge-builder, l'unico autorizzato a modificare questi file: nessuna operazione della Fase 2 li ha toccati. **Anche `CONTEXT.md` va aggiornato, sebbene non sia nel catalogo della knowledge**: va nominato esplicitamente tra i file da aggiornare quando si avvia knowledge-builder.

Ogni voce è stata verificata sul codice reale e riporta cosa dice oggi il documento, cosa deve dire e dove si trova nel codice. I numeri di riga dei documenti sono quelli della versione letta il 16/11/2026.

## 1. CONTEXT.md

### 1.1 Termini nuovi del glossario

| Termine | Simbolo nel codice | Etichetta UI | Significato |
|---|---|---|---|
| Scheda di valutazione | `Scorecard` (`prisma/schema.prisma:176`) | Scheda di valutazione | Al più una per posizione: i criteri con cui si valutano i candidati di quella posizione. Editor `/dashboard/positions/[id]/scorecard`, tab "Scheda di valutazione" della posizione |
| Criterio | `ScorecardCriterion` (`prisma/schema.prisma:190`) | Criterio / Criteri | Voce della scheda: nome, descrizione, categoria, priorità, peso 1–5, livello atteso 1–5, ancore, origine, ordine, `archivedAt` |
| Categoria del criterio | `CriterionCategory` | Tecnico · Soft skill · Cultura | `technical` · `soft` · `culture` |
| Priorità del criterio | `CriterionPriority` | Indispensabile · Preferibile | `must` · `nice` |
| Origine del criterio | `CriterionSource` | Competenza · Soft skill · Personalizzato | `skill` · `softSkill` · `custom` |
| Ancore | `anchors` (JSON `{ weak, medium, strong }`) | Risposta debole · Risposta media · Risposta forte | Come suona una risposta debole, media e forte; sul criterio e sulla domanda della guida |
| Criterio archiviato | `ScorecardCriterion.archivedAt` | Criteri archiviati | Criterio tolto dalla scheda ma conservato perché ha prove; non si ripristina |
| Criteri soft di default | `DEFAULT_SOFT_CRITERIA` (`lib/utils/scorecard-defaults.ts`) | Comunicazione, Collaborazione, Problem Solving, Culture Fit, Leadership | Le 5 dimensioni della rubrica, proposte come righe non salvate in una scheda vuota |
| Guida colloquio | `InterviewGuide` (`prisma/schema.prisma:212`) | Guida colloquio / Guide colloquio | Modello di colloquio di una posizione, una o più (una per round): titolo, round, durata |
| Sezione della guida | `GuideSection` (`prisma/schema.prisma:230`) | Sezione | Parte ordinata della guida con titolo, minuti e tipo |
| Tipo di sezione | `GuideSectionKind` | Introduzione · Esperienza · Tecnica · Comportamentale · Domande del candidato · Chiusura | `intro` · `experience` · `technical` · `behavioral` · `candidate_questions` · `closing` |
| Domanda della guida | `GuideQuestion` (`prisma/schema.prisma:245`) | Domanda, Approfondimenti, Criteri verificati, Obbligatoria | Testo, approfondimenti, criteri verificati, ancore, obbligatorietà, ordine |
| Criteri verificati | `QuizQuestion.criterionIds`, `GuideQuestion.criterionIds` | Criteri verificati | Criteri della scheda che una domanda verifica; per i quiz stanno sul collegamento quiz-domanda |
| Dettaglio per risposta | `Evaluation.answerEvaluations` | Ricalcola dettaglio risposte | Per ogni domanda valutata di un test: punteggio 0–10, punti di forza, debolezze |
| Valutazione per criterio | `Evaluation.criteriaAssessment` | Valutazione per criterio | Valutazione CV: per ogni criterio punteggio 1–5 oppure null ("Nessuna evidenza nel CV") e motivazione |
| Checklist di setup | `getPositionSetup` (`lib/utils/position-setup.ts`), `getPositionSetupStatus` | Setup della posizione | Dettagli, Scheda di valutazione, Quiz, Guida colloquio, ciascuno fatto quando la parte esiste |

### 1.2 Correzioni

1. **Riga 69, sezione Ambiguities, "Scores".**
   - Oggi dice: "Per-answer score 0–10 (not stored)".
   - Deve dire: il punteggio per risposta 0–10 è salvato in `Evaluation.answerEvaluations` per le valutazioni dei test generate dalla Fase 2; le valutazioni precedenti non lo hanno. Aggiungere la scala 1–5 (o null) della valutazione CV per criterio.
   - Codice: `lib/services/assessment-evaluation.ts:180` (`completeAssessmentEvaluation`) e `:253` (`recalculateAnswerEvaluations`); `lib/services/resume-evaluation.ts:183` (`buildCriteriaAssessment`).
2. **Riga 32, "Behavioral rubric".** Aggiungere che le sue 5 dimensioni sono anche i criteri soft di default della scheda (`DEFAULT_SOFT_CRITERIA`), senza che la rubrica cambi.
3. **Riga 38, "Le mie azioni".** "positions with incomplete setup" significa ora posizioni bozza o aperte senza scheda (criteri attivi), quiz o guida; ogni riga dice "Manca: …".
4. **Riga 12, "Quiz question link".** Il collegamento porta anche `criterionIds`.
5. **Code-area map.**
   - Riga 83 (`app/dashboard/`): la pagina della posizione ha le tab Dettagli, Scheda di valutazione, Selezione, Quiz, Guide colloquio scelte da `?tab=` (`dettagli`, `scheda`, `selezione`, `quiz`, `guide`) e le sottopagine `scorecard`, `guides/new`, `guides/[guideId]`.
   - Riga 88 e 89 (`lib/data/`, `lib/actions/`): nuovi moduli `scorecards.ts` e `interview-guides.ts`.
   - Riga 90 (`lib/services/`): aggiungere `scorecards.ts` (`saveScorecard`, `criterionHasEvidence`, `getActiveCriteria`, `assertActiveCriteria`) e `interview-guides.ts` (`syncInterviewGuide`).
   - Riga 91 (`lib/services/ai/`): aggiungere `scorecard-generation.ts` e `guide-generation.ts`.
   - Riga 93 (`lib/utils/`): aggiungere `criterion-keys.ts`, `position-setup.ts`, `scorecard-defaults.ts`.
   - Riga 96 (`prisma/`): `migrations/` contiene anche `20261117000000_scorecard_guides`.
   - `components/`: nuove cartelle `components/scorecard/` (editor della scheda, riga del criterio, `criterion-presentation.ts`) e `components/interview-guides/` (editor della guida, sezione, domanda, dialogo "Genera dalla scheda", `guide-section-kind.ts`); `components/applications/criteria-assessment-list.tsx`.

## 2. knowledge/domain_model.md

1. **Righe 14–26, tabella delle entità: entità nuove.**
   - Oggi dice: nessuna riga per scheda, criteri e guide.
   - Deve dire:
     - `Scorecard`: una per posizione (`positionId` unico); la cancellazione della posizione la elimina con i criteri.
     - `ScorecardCriterion`: `name`, `description?`, `category`, `priority`, `weight` 1–5, `expectedLevel` 1–5, `anchors` (JSON `{ weak, medium, strong }`), `source`, `order`, `archivedAt?`; cancellata con la scheda.
     - `InterviewGuide`: `positionId` (più guide per posizione), `title`, `round` (intero da 1), `durationMinutes`; cancellata con la posizione, cancella sezioni e domande.
     - `GuideSection`: `title`, `minutes`, `order`, `kind`; cancella le sue domande.
     - `GuideQuestion`: `text`, `followUps[]`, `criterionIds[]`, `anchors`, `required`, `order`.
     - Riga di `Position`, colonna "Deleting it removes": aggiungere scheda (con criteri) e guide (con sezioni e domande).
   - Codice: `prisma/schema.prisma:149–260`; migrazione `prisma/migrations/20261117000000_scorecard_guides/migration.sql`.
2. **Riga 19, `QuizQuestion`.**
   - Oggi dice: collegamento con `order`.
   - Deve dire: ha anche `criterionIds` (default `[]`), i criteri che la domanda verifica in quel quiz. La stessa domanda in un altro quiz ha il suo elenco. È scritto solo da `syncQuizQuestions`, insieme al collegamento. Non sta mai su `Question`. I quiz esistenti hanno `[]` e contano come punteggio globale.
   - Codice: `prisma/schema.prisma:412`; `lib/services/quiz-questions.ts:79`; `lib/utils/question-utils.ts:48` (lettura dal collegamento).
3. **Riga 23, `Evaluation`.**
   - Oggi dice: `assessmentId?`, `candidateId?`, `positionId?`, `fitScore`, `quizScore?`, campi hiring.
   - Deve dire: anche `answerEvaluations?` (valutazioni dei test) e `criteriaAssessment?` (valutazioni CV), entrambe JSON.
   - Codice: `prisma/schema.prisma:448–449`.
4. **Righe 43–59, "Quiz and questions: one write path": controllo dei criteri al salvataggio.**
   - Deve dire: prima della transazione `upsertQuizAction` toglie dalle domande gli id che non sono né criteri attivi né archiviati della scheda della posizione (criteri eliminati), poi richiede che ogni id rimasto sia un criterio attivo, a meno che non sia già salvato su un collegamento dello stesso quiz (l'ambito è il quiz intero: un criterio archiviato già presente nel quiz può passare a un'altra domanda). Altrimenti `UserError("Uno o più criteri selezionati non appartengono alla scheda della posizione")`. `duplicateQuizAction` conserva i `criterionIds` solo se la copia resta sulla stessa posizione. L'esempio di codice della riga 57 va aggiornato con `criterionIds: question.criterionIds ?? []`.
   - Codice: `lib/actions/quizzes.ts:134` (`checkQuestionCriteria`), `:330` (duplicazione).
5. **Riga 61–63, "AI generation never persists".**
   - Oggi dice: cita solo `generateNewQuizAction` e `generateNewQuestionAction`.
   - Deve dire: vale anche per `generateScorecardCriteriaAction` e `generateInterviewGuideAction`: restituiscono una proposta, la scheda o la guida si salvano solo con "Salva scheda" / "Salva guida". I criteri proposti per le domande di un quiz generato si salvano solo con il quiz.
   - Codice: `lib/actions/scorecards.ts:64`, `lib/actions/interview-guides.ts:118`.
6. **Riga 90, "Position lifecycle": setup incompleto.**
   - Oggi dice: "A `draft` or `open` position with no quiz is an incomplete setup: the action center lists it."
   - Deve dire: una posizione `draft` o `open` è incompleta quando le manca almeno una tra scheda (almeno un criterio attivo), quiz e guida. La regola è unica, `getPositionSetup({ activeCriteriaCount, quizCount, guideCount })`: i dettagli sono sempre fatti; `missing` elenca le parti mancanti nell'ordine scheda, quiz, guida. La usano la checklist della posizione e "Le mie azioni". Una scheda con tutti i criteri archiviati conta come mancante. Le posizioni chiuse non sono mai elencate.
   - Codice: `lib/utils/position-setup.ts:30`; `lib/data/positions.ts:97` (`getPositionSetupStatus`); `lib/data/applications.ts:667` e `:703`.
7. **Sezione nuova "Scorecard": regole della scheda.**
   - Si salva sempre la scheda intera con `saveScorecardAction({ positionId, criteria })`, in una transazione (`saveScorecard`). La scheda nasce al primo salvataggio. Un criterio con id attivo si aggiorna, gli altri si creano. `order` è la posizione nell'elenco. Un id che non è un criterio attivo di quella scheda → `UserError("Uno o più criteri non appartengono a questa scheda")`.
   - Un criterio attivo tolto dall'elenco si **archivia** (`archivedAt`) se ha prove, altrimenti si **elimina** e il suo id si toglie dalle domande delle guide della posizione nella stessa transazione. `criterionHasEvidence` è l'unico punto che decide. In Fase 2 la prova è una valutazione CV della posizione con una voce per quel criterio in `criteriaAssessment`. La Fase 3 aggiungerà voti e voci di kit.
   - Il salvataggio della scheda non scrive mai `QuizQuestion`.
   - I criteri archiviati non sono mai modificati né ripristinati. Restano nelle domande che li citano. Sono esclusi da proposta AI, generazione di quiz e guide, selettori e nuove valutazioni CV.
   - Nome, descrizione e ancore restano modificabili. Un cambio di peso aggiorna solo il criterio e non tocca mai `Application.decisionWeights`.
   - Peso: intero 1–5 relativo agli altri criteri, senza vincolo di somma.
   - Una scheda vuota si apre con i 5 criteri soft di default (`DEFAULT_SOFT_CRITERIA`: categoria `soft`, origine `custom`, peso 3, livello 3, `must` tranne Leadership `nice`) come righe non salvate. `BehavioralRubric` non cambia.
   - Codice: `lib/services/scorecards.ts:88` e `:151`; `lib/actions/scorecards.ts:23`; `lib/utils/scorecard-defaults.ts:10`.
8. **Sezione nuova "Interview guides".**
   - `upsertInterviewGuideAction` salva guida, sezioni e domande insieme. `syncInterviewGuide` è l'unico che scrive `GuideSection` e `GuideQuestion`. Le righe si abbinano per id: una sezione con id di quella guida e una domanda con id di quella sezione si aggiornano; le altre si creano; quelle assenti si eliminano. Gli id delle righe tenute non cambiano; `order` è la posizione nell'elenco.
   - I criteri delle domande devono essere attivi sulla scheda della posizione, tranne gli id già presenti sulla stessa guida (ambito: la guida intera).
   - Una guida si elimina liberamente (`deleteInterviewGuideAction`, redirect a `?tab=guide`): niente la referenzia fino ai kit.
   - La somma dei minuti delle sezioni si mostra accanto alla durata ma non blocca il salvataggio.
   - Codice: `lib/services/interview-guides.ts:16`; `lib/actions/interview-guides.ts:26`, `:94`.
9. **Righe 119–132, "Evaluations".**
   - Oggi dice (righe 128–129): `answerEvaluations` è scritto con la valutazione del test e il ricalcolo scrive solo quel campo. Questo è già corretto e ora è implementato.
   - Aggiungere:
     - "Ricalcola dettaglio risposte": il client rivaluta ogni risposta con `evaluateAssessmentAnswerAction`, scarta e conta quelle fallite (nessun punteggio 0 di ripiego), poi chiama `recalculateAnswerEvaluationsAction`. Errori: "Valutazione non trovata", "Nessuna risposta valutata", "Una o più domande non hanno una risposta".
     - `criteriaAssessment` (solo valutazioni CV): JSON per id del criterio `{ score: 1–5 | null, evidence }`; `null` = nessuna evidenza nel CV.
     - Il modello risponde con le chiavi C1, C2…; il salvataggio traduce le chiavi in id, scarta chiavi sconosciute e ripetute, arrotonda e limita il punteggio a 1–5. Se almeno una voce è valida, i criteri non restituiti diventano `{ score: null, evidence: "" }`.
     - Senza criteri attivi, o senza voci valide, si salva `null`. Le valutazioni CV precedenti restano `null`.
     - In lettura un JSON non valido vale `null`. Una voce di un criterio eliminato si salta; un criterio archiviato resta, marcato.
   - Codice: `lib/services/assessment-evaluation.ts:253`; `lib/actions/evaluations.ts:67`; `lib/services/resume-evaluation.ts:183`, `:223`; `lib/data/evaluations.ts` (`toEvaluationWithRelations`); `lib/data/applications.ts:226` (`resolveCriteriaAssessment`).
10. **Sezione "Common mistakes", righe 153–172.** Aggiungere:
    - scrivere `QuizQuestion` dal salvataggio della scheda;
    - eliminare un criterio con prove invece di archiviarlo;
    - scrivere `criterionIds` sulla riga `Question`;
    - contare come prova o come criterio valido un id di un criterio eliminato rimasto su un collegamento di quiz (vale anche per la Fase 4);
    - salvare la proposta AI di criteri o di una guida senza conferma.

## 3. knowledge/server_actions.md

1. **Riga 75, azioni autenticate.**
   - Oggi dice: cita le action del hub delle candidature.
   - Deve dire: aggiungere le nuove action autenticate, tutte con `requireUser()` e senza controlli di ruolo o proprietario:
     - `saveScorecardAction`: "Posizione non trovata", "Uno o più criteri non appartengono a questa scheda";
     - `generateScorecardCriteriaAction`: "Posizione non trovata";
     - `upsertInterviewGuideAction`: "Guida non trovata", "Posizione non trovata", "La posizione è obbligatoria per creare una guida", errore dei criteri;
     - `deleteInterviewGuideAction`: "Guida non trovata"; redirect a `/dashboard/positions/{id}?tab=guide`, da passare a `DeleteWithConfirm` senza `unwrap`;
     - `generateInterviewGuideAction`: "Posizione non trovata", "Crea prima la scheda di valutazione della posizione";
     - `recalculateAnswerEvaluationsAction`.

     Le due action di generazione non scrivono e non invalidano. Le sei action pubbliche restano invariate.
   - Codice: `lib/actions/scorecards.ts`, `lib/actions/interview-guides.ts`, `lib/actions/evaluations.ts:67`.
2. **Riga 86, form client: form con input e output diversi.** Gli editor di scheda e guida usano `useForm<z.input<typeof schema>, unknown, Output>` perché le ancore hanno valori di default (stesso schema di `components/presets/preset-form.tsx`). Usano `values` invece di `defaultValues` per ripartire dai dati del server dopo il salvataggio, e `keyName: "fieldKey"` in `useFieldArray` perché le righe hanno un proprio `id` del database.
   - Codice: `components/scorecard/scorecard-editor.tsx`, `components/interview-guides/interview-guide-editor.tsx`.

## 4. knowledge/ai_generation.md

1. **Riga 36, task di `getOptimalModel`.** Due nuovi `LLMTaskType`, `scorecard_generation` e `guide_generation`, entrambi sul modello grande. Codice: `lib/services/ai/models.ts:56–57`, `:142`.
2. **Righe 44–49, tabella Determinism.** Proposta dei criteri e generazione della guida: temperatura 0.7, nessun seed. Codice: `lib/services/ai/scorecard-generation.ts:25`, `lib/services/ai/guide-generation.ts:32`.
3. **Righe 51–55, Prompts.**
   - Oggi dice: `sanitizeInput()` limita la lunghezza; il CV è tagliato a `MAX_RESUME_CHARS`.
   - Deve dire:
     - `sanitizeInput(input, maxLength = 2000)` accetta un limite. Va chiamato con un solo argomento quando si passa un valore, mai come callback diretta di `.map` (l'indice diventerebbe il limite): `.map((value) => sanitizeInput(value))`.
     - Il testo del CV passa da `redactBirthDate` e poi da `sanitizeInput(text, MAX_RESUME_CHARS)`, mantenendo "... [troncato]".
     - Ogni risposta del candidato passa da `sanitizeInput(answer, MAX_ANSWER_CHARS)` (10000).
     - Nel prompt del CV anche nome del candidato e testi della posizione passano da `sanitizeInput`.
     - `redactBirthDate` sostituisce con "[rimosso]" una data che segue, sulla stessa riga, uno dei marcatori ("nato il", "nata il", "nato/a il", "nato a … il", "data di nascita", "date of birth", "born on", "born", "DOB"). Formati: gg/mm/aaaa, gg-mm-aaaa, gg.mm.aaaa, aaaa-mm-gg, giorno + mese in italiano o inglese + anno. Una data senza marcatore resta.
   - Codice: `lib/services/ai/sanitize.ts:12`, `:123`; `lib/services/ai/evaluation-prompts.ts:24`, `:32`, `:260`.
4. **Chiavi dei criteri.** Il modello non vede mai gli id dei criteri. I criteri sono elencati con le chiavi C1, C2… (`buildCriterionKeys`) e il modello risponde con `criterionKeys` o `criterionKey`. `resolveCriterionKeys` le traduce in id ignorando maiuscole e spazi e scartando chiavi sconosciute e duplicate. Codice: `lib/utils/criterion-keys.ts:14`, `:28`.
5. **Righe 59–62, flusso Quiz generation.** `generateNewQuizAction` passa al servizio i criteri attivi (`getActiveCriteria`). Con criteri, `buildQuizSystemPrompt(true)` documenta `criterionKeys` e `buildQuizPrompt(params, keyed)` aggiunge il blocco "Evaluation criteria of this position". Il servizio restituisce domande con `criterionIds` e senza `criterionKeys`. Senza criteri, prompt e risultato sono quelli di prima. La generazione di una singola domanda non propone criteri. Codice: `lib/actions/quizzes.ts:60`; `lib/services/ai/core.ts` (`generateQuiz`); `lib/services/ai/prompts.ts:474`, `:602`.
6. **Flussi nuovi.**
   - **Proposta dei criteri.** `generateScorecardCriteriaAction` → `generateScorecardCriteria` → `generateStructured("scorecard_generation", aiScorecardGenerationSchema)`. Il prompt (`buildScorecardSystemPrompt`, `buildScorecardPrompt`) elenca i nomi già presenti e i criteri soft di default da non riproporre; i duplicati dei nomi esistenti si scartano. L'editor aggiunge solo i nomi non presenti come righe non salvate.
   - **Generazione della guida.** `generateInterviewGuideAction` (rifiuta una posizione senza criteri attivi) → `generateInterviewGuide` → `generateStructured("guide_generation", aiInterviewGuideGenerationSchema)`. I minuti si arrotondano a interi ≥ 1; la somma non viene corretta. Il prompt vieta domande su età, famiglia, figli, religione e salute.
   - **Ricalcolo del dettaglio per risposta:** vedi domain_model, voce 9.
   - Codice: `lib/services/ai/prompts.ts:740`, `:781`, `:831`, `:862`.
7. **Righe 73–75, flusso Resume evaluation.**
   - Oggi dice: `saveResumeEvaluation` usa `overallEvaluationSchema`.
   - Deve dire: `prepareResumeEvaluation` carica i criteri attivi, li elenca per chiave nel prompt ("CRITERI DELLA SCHEDA DI VALUTAZIONE") e restituisce `criterionKeys`, che la route passa a `saveResumeEvaluation`. Il salvataggio usa `resumeEvaluationResultSchema` (`overallEvaluationSchema` più `criteriaAssessment` opzionale) e scrive `criteriaAssessment` nella stessa create, nella transazione che porta la candidatura a screening. Richiesta, stati HTTP e stream sono invariati.
   - Codice: `lib/services/resume-evaluation.ts:79`, `:223`; `app/api/evaluations/stream/route.ts`.
8. **Riga 18 e indice del barrel.** `lib/services/ai/index.ts` esporta anche `redactBirthDate` e i quattro builder `buildScorecardSystemPrompt`, `buildScorecardPrompt`, `buildGuideSystemPrompt`, `buildGuidePrompt`; `generateStructured` resta fuori dal barrel.

## 5. knowledge/cache_invalidation.md

1. **Righe 24–34, vocabolario dei tag.** Aggiungere:
   - `SCORECARDS` = `scorecards`, con `entityTag.scorecard(positionId)` → `scorecard-{positionId}`: chiave per posizione, perché la scheda è una sola;
   - `INTERVIEW_GUIDES` = `interview-guides`, con `entityTag.interviewGuide(id)` → `interview-guide-{id}`.
   - I criteri non hanno un tag proprio (li copre `scorecards`); sezioni e domande delle guide sono coperte da `interview-guides`; i collegamenti quiz-criteri da `quizzes` + `questions`.
   - Codice: `lib/utils/cache-utils.ts:41–43`, `:65–67`.
2. **Righe 60–73, tabella degli helper.** Aggiungere:
   - `invalidateScorecardCache({ positionId })`: scade `scorecards` e `scorecard-{positionId}`; rivalida `/dashboard/positions/{id}`, `/dashboard/positions/{id}/scorecard` e `/dashboard`.
   - `invalidateInterviewGuideCache({ guideId?, positionId })`: scade `interview-guides` e, con `guideId`, `interview-guide-{id}`; rivalida `/dashboard/positions/{id}`, `/dashboard/positions/{id}/guides/{guideId}` con `guideId`, e `/dashboard`.

   Entrambi solo per le server action. Un salvataggio della scheda che toglie un criterio eliminato dalle guide chiama anche `invalidateInterviewGuideCache({ positionId })`.
   - Codice: `lib/utils/cache-utils.ts:395`, `:411`; `lib/actions/scorecards.ts`.
3. **Righe 81–86, tabella `CASCADE_ON_DELETE`.**
   - Oggi dice: la riga della posizione ha quizzes, assessments, evaluations, candidates, behavioral-rubrics.
   - Deve dire: aggiungere `scorecards` e `interview-guides`.
   - Codice: `lib/utils/cache-utils.ts:76–84`.
4. **Letture che usano i tag nuovi.**
   - `scorecards`: `getScorecardByPositionId`, insieme a `positions` e all'entità; `getCriterionOptionsByPosition`; `getPositionSetupStatus`, insieme a `positions`, `quizzes`, `interview-guides` e all'entità della posizione; `getApplicationDetail`, aggiunto per i nomi dei criteri; `getActionCenterData`, con anche `interview-guides`.
   - `interview-guides`: `getInterviewGuidesByPosition`, insieme a `positions` e all'entità; `getInterviewGuideById`, insieme all'entità.
   - Codice: `lib/data/scorecards.ts`, `lib/data/interview-guides.ts`, `lib/data/positions.ts:97`, `lib/data/applications.ts`.
5. **Regola nuova: id di criteri eliminati sui quiz.** Il salvataggio della scheda non scrive mai `QuizQuestion`. Un id di un criterio eliminato può quindi restare su un collegamento di quiz finché il quiz non viene salvato di nuovo: la pagina di modifica del quiz lo toglie dal form, e il salvataggio successivo lo elimina. Ogni lettore deve risolvere gli id attraverso la scheda (attivi e archiviati) e ignorare quelli sconosciuti; questo vale anche per la matrice della Fase 4.
   - Codice: `app/dashboard/quizzes/[id]/edit/page.tsx`, `app/dashboard/quizzes/[id]/quiz-questions-content.tsx`.

## 6. knowledge/question_schemas.md

1. **Riga 16, campi di tutti i tipi.**
   - Oggi dice: `question`, `keywords?`, `explanation?`.
   - Deve dire: anche `criterionIds?` (array di id dei criteri), presente nello schema base, quindi in ogni schema stretto, e in `flexible`. `convertToStrictQuestion` lo conserva e continua a togliere `dbId` e `isFavorite`. È dato del collegamento quiz-domanda: `prepareQuestionForCreate`/`Update` non lo scrivono mai su `Question`, `mapQuizQuestionsToFlexible` lo legge dal collegamento (il suo input ha `criterionIds`).
   - Codice: `lib/schemas/question.ts:16`, `:80`; `lib/utils/question-utils.ts:10`, `:48`.
2. **Riga 35, AI output schema.** `aiQuizGenerationSchema.questions` è `questionSchemas.flexible.and(z.object({ criterionKeys }))`: un'intersezione, perché lo schema flessibile è raffinato e non si può estendere. `criterionKeys` esiste solo nell'output dell'AI e viene tradotto in `criterionIds` dal servizio. Codice: `lib/schemas/quiz.ts:25`.
3. **Righe 71–86, "Adding a question type", punto 4.** Ricordare che una select esplicita sui collegamenti deve includere anche `criterionIds` (esempio: `lib/services/assessment-evaluation.ts`, `select: { order, criterionIds, question }`).
4. **Schemi nuovi, nessuna regola diversa.** `lib/schemas/scorecard.ts` e `lib/schemas/interview-guide.ts`, esportati dal barrel; `interview-guide.ts` importa `criterionAnchorsSchema` da `./scorecard` e non dal barrel, per evitare un ciclo. In `lib/schemas/evaluation.ts`: `answerEvaluationsSchema`, `criteriaAssessmentSchema`, `recalculateAnswerEvaluationsSchema`, `resumeEvaluationResultSchema`.

## 7. knowledge/testing.md

1. **Righe 29–30, mock globale di Prisma.** I modelli `scorecard`, `scorecardCriterion`, `interviewGuide`, `guideSection`, `guideQuestion` non hanno un delegato nel mock globale. I test che li toccano dichiarano un `vi.mock("@/lib/prisma", …)` a livello di file, ricostruendo `$transaction`. Esempi: `tests/lib/actions/quizzes.test.ts`, `tests/lib/actions/scorecards.test.ts`, `tests/lib/data/applications.test.ts`. In alternativa si mocka il servizio che li legge (`@/lib/services/scorecards` in `tests/lib/services/resume-evaluation.test.ts`). I servizi che ricevono `tx` (`saveScorecard`, `syncInterviewGuide`, `syncQuizQuestions`) si testano passando un oggetto transazione costruito nel test.
2. **File di test nuovi** (layout invariato):
   - `tests/lib/schemas/scorecard.test.ts`, `interview-guide.test.ts`, `quiz.test.ts`;
   - `tests/lib/utils/criterion-keys.test.ts`, `position-setup.test.ts`;
   - `tests/lib/services/scorecards.test.ts`, `interview-guides.test.ts`, `quiz-questions.test.ts`;
   - `tests/lib/services/ai/scorecard-generation.test.ts`, `guide-generation.test.ts`, `evaluation-prompts.test.ts`, `models.test.ts`;
   - `tests/lib/actions/scorecards.test.ts`, `interview-guides.test.ts`, `evaluations.test.ts`;
   - `tests/lib/data/scorecards.test.ts`, `interview-guides.test.ts`.

## 8. knowledge/styling.md

1. **Sezione "Status and score colours": criteri.** `components/scorecard/criterion-presentation.ts` è la sola mappa per i criteri:
   - `CRITERION_CATEGORY_LABEL`: Tecnico, Soft skill, Cultura;
   - `CRITERION_PRIORITY_PRESENTATION`: `must` "Indispensabile" `bg-primary/10 text-primary`, `nice` "Preferibile" `bg-muted text-muted-foreground`;
   - `CRITERION_SOURCE_LABEL`: Competenza, Soft skill, Personalizzato;
   - le liste di opzioni per le select.

   Non scrivere mappe locali.
2. **Tipi di sezione delle guide.** `GUIDE_SECTION_KIND_LABEL` e `GUIDE_SECTION_KIND_OPTIONS` in `components/interview-guides/guide-section-kind.ts`.
3. **Colori del punteggio per criterio.** Nella valutazione CV per criterio (`components/applications/criteria-assessment-list.tsx`) il punteggio 1–5 si confronta con il livello atteso:
   - `success` se raggiunto;
   - `warning` se un punto sotto;
   - `destructive` se più basso;
   - `bg-muted text-muted-foreground` con "Nessuna evidenza nel CV" quando è null.

   Da aggiungere alle soglie della riga 56.
4. **Avvisi di modifiche non salvate.** Gli editor di scheda e guida mostrano "Modifiche non salvate", e l'avviso dei criteri soft di default, con `bg-warning/10 text-warning`, come già previsto per il token `warning`.

## 9. Nulla da cambiare

Verificati sul codice e ancora corretti:

- `knowledge/server_actions.md`: forma dell'action, contratto degli errori, action con redirect, sei action pubbliche, letture nel data layer, logging.
- `knowledge/domain_model.md`: accesso senza filtri per utente né ruoli; quiz e domande con un solo percorso di scrittura (completato dalla voce 2.4); avanzamenti delle candidature; test; scala e scrittura di `answerEvaluations` alle righe 128–129, ora implementata così com'è scritta; regole di migrazione (la Fase 2 è una migrazione solo additiva, senza backfill); lingua.
- `knowledge/ai_generation.md`: unico punto d'ingresso `generateStructured`, catena di fallback, `describeAIError`, temperatura 0 e seed 42 per ogni valutazione (anche la valutazione del CV per criterio, nello stream esistente), trascrizione.
- `knowledge/cache_invalidation.md`: dove vive la cache, regola dei tag di dipendenza, varianti per route handler, passaggio dei dati ai client component, route API (nessuna nuova).
- `knowledge/question_schemas.md`: flexible e strict, `dbId`, regole degli schemi, messaggi in italiano.
- `knowledge/testing.md`: layout, idiomi, factory solo per le domande, validazione `pnpm lint && pnpm test:run && pnpm build`.
- `knowledge/styling.md`: token, componenti da riusare (`PageHeader`, `DeleteWithConfirm`, wrapper `rhf-inputs`, skeleton condivisi), testi in italiano.

## Fuori da knowledge/ e CONTEXT.md (solo segnalazione)

- `prisma/migrations/README.md`: aggiornato con la migrazione `20261117000000_scorecard_guides` e con la frase sul rilascio. Non richiede interventi.
- `prisma/verify-application-hub.ts` (`pnpm db:verify`): ora esclude dal controllo dei vecchi nomi "interview" i nomi della tabella `interview_guides`. Se un documento descrive cosa verifica lo script, va aggiunta questa eccezione.
