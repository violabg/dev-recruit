# Fase 3 — Aggiornamenti per knowledge-builder

Questo file elenca le affermazioni di `knowledge/` e di `CONTEXT.md` che la Fase 3 (Kit e live) ha reso superate o incomplete, e le regole nuove da documentare. Serve al ruolo knowledge-builder, l'unico autorizzato a modificare questi file: nessuna operazione della Fase 3 li ha toccati.

**Anche `CONTEXT.md` va aggiornato, sebbene non sia nel catalogo della knowledge**: va nominato esplicitamente tra i file da aggiornare quando si avvia knowledge-builder.

Ogni voce è stata verificata sul codice reale e riporta cosa dice oggi il documento, cosa deve dire e dove si trova nel codice. I numeri di riga dei documenti sono quelli della versione letta il 16/11/2026.

**Due punti vanno decisi dallo sviluppatore prima di scrivere** (sezione 9): D1 (indipendenza delle schede inviate) e D2 (blocco della scheda dopo l'invio), dove il piano e la knowledge dicono cose diverse.

## 1. CONTEXT.md

### 1.1 Termini nuovi del glossario

| Termine | Simbolo nel codice | Etichetta UI | Significato |
|---|---|---|---|
| Colloquio | `Interview` (`prisma/schema.prisma:360`) | Colloquio / Colloqui | La conversazione con il candidato, su una candidatura; più colloqui per candidatura (round). Mai un `Assessment`, mai un `Quiz` |
| Round | `Interview.round` | Round N | Numero del colloquio della candidatura; proposto come colloqui non annullati + 1, non unico |
| Stato del colloquio | `InterviewStatus` | Pianificato · In corso · Concluso · Annullato · Non presentato | `scheduled` · `in_progress` · `completed` · `cancelled` · `no_show` |
| Partecipante | `InterviewParticipant` (`prisma/schema.prisma:388`) | Partecipanti | Utente dell'app che partecipa a un colloquio; uno per utente e colloquio |
| Conduttore / Osservatore | `InterviewParticipantRole` | Conduttore · Osservatore | `lead` (esattamente uno per colloquio) · `observer` |
| Kit colloquio | `InterviewKit` (`prisma/schema.prisma:404`) | Kit colloquio; Kit in bozza · Kit pronto | Uno per colloquio: copia della guida (sezioni e domande) con briefing, ipotesi da verificare, checklist e fonti mancanti; stato `draft` · `ready` |
| Sezione del kit | `KitSection` (`prisma/schema.prisma:422`) | — | Copia di una sezione della guida (titolo, minuti, ordine, tipo) |
| Domanda del kit | `KitItem` (`prisma/schema.prisma:437`) | Domanda | Domanda di una sezione del kit con approfondimenti, criteri, ancore, obbligatorietà, ordine, origine, motivazione ("Perché"), fonte, `edited` ("ritoccata"), `covered` ("Coperta") |
| Origine della domanda | `KitItemOrigin` | Modello · CV · Lacuna CV · Test · Round precedente · Manuale | `template` (domanda del modello, copiata dalla guida) · `cv` · `resume_gap` · `quiz_answer` · `previous_round` (domande personalizzate, proposte dall'AI) · `manual` |
| Domanda del modello / personalizzata | `origin = template` / origine AI | Modello / CV, Lacuna CV, Test, Round precedente | Le domande del modello vengono dalla guida e non si sostituiscono mai; le personalizzate sono proposte dall'AI e si aggiungono |
| Nota live | `KitItemNote` (`prisma/schema.prisma:463`) | Nota rapida, Voto, Citazione a supporto | Nota, voto 1–5 e citazione di un partecipante su una domanda; una per partecipante e domanda; visibile solo all'autore finché non invia la sua scheda |
| Scheda intervistatore | `InterviewerFeedback` (`prisma/schema.prisma:481`) | Scheda intervistatore; Salva bozza · Invia scheda | La valutazione di un partecipante su un colloquio: raccomandazione finale, note, segnali d'allarme, momenti di rilievo, voti per criterio; una per partecipante e colloquio |
| Voto per criterio | `CriterionScore` (`prisma/schema.prisma:502`) | Valutazione per criterio | Voto 1–5 ed evidenze di una scheda su un criterio; un criterio non votato ("Senza prove") non ha riga |
| Modalità live | `/dashboard/applications/[id]/interviews/[interviewId]/live` | Colloquio live | Pagina usata durante il colloquio; sempre dati correnti (nessuna cache) |
| Agenda colloqui | `/dashboard/agenda`, `SECTIONS.agenda` | Agenda colloqui; Solo i miei | Colloqui pianificati e in corso, per giorno; voce del gruppo Selezione |

### 1.2 Correzioni

1. **Riga 30, "Interview (conversation)".**
   - Oggi dice: "— (not built yet)".
   - Deve dire: simbolo `Interview`, con le righe nuove della tabella 1.1.
2. **Riga 45 e riga 95, "Hiring notes" / "Notes".**
   - `interviewNotes` ("Note del colloquio") resta un campo della valutazione di un test, non del colloquio.
   - Aggiungere che le note del colloquio vero sono le note live (`KitItemNote`) e la scheda intervistatore, da non confondere con `interviewNotes`.
   - Le etichette della raccomandazione nella scheda intervistatore sono "Assolutamente sì · Sì · Forse · No · Assolutamente no" (`HIRE_RECOMMENDATION_LABEL`). Il form delle note di hiring del test usa ancora "Sì, decisamente" / "No, decisamente".
3. **Riga 54, "Le mie azioni".**
   - Oggi dice: "… and interviews without a kit".
   - Deve dire: "Colloqui senza kit pronto" elenca i colloqui pianificati di oggi e domani (ora di Roma) con kit non pronto, verso la preparazione. "Schede da compilare" ha una riga per partecipante di un colloquio concluso senza scheda inviata, verso la scheda. Con "Solo le mie" restano i colloqui di cui l'utente è partecipante o responsabile e le schede di cui è l'intervistatore.
4. **Riga 55, "Prossima azione".**
   - Aggiungere: "Pianifica colloquio" porta a `/dashboard/applications/{id}/interviews/new`; "Prepara colloquio" e "Compila scheda" portano alla preparazione e alla scheda del colloquio indicato; "Vai alla decisione" apre ancora la tab Decisione.
5. **Riga 89, "Quiz vs Assessment vs Colloquio".** Invariata nel senso; aggiungere che il Colloquio ha un Kit, una modalità live e una Scheda intervistatore per partecipante.
6. **Sezione nuova di ambiguità: "Guida colloquio vs Kit colloquio".**
   - La guida è il modello della posizione; il kit è la sua copia per un colloquio, modificabile solo finché il colloquio è pianificato.
   - Modificare o eliminare la guida non tocca i kit.
7. **Code-area map.**
   - Riga 110 (`app/dashboard/`):
     - la tab Colloqui della candidatura elenca i colloqui;
     - nuove sottopagine `applications/[id]/interviews/new` e `applications/[id]/interviews/[interviewId]/prepare|live|feedback`;
     - nuova pagina `agenda/`.
   - Righe 115–117 (`lib/data/`, `lib/actions/`, `lib/services/`):
     - `lib/data/interviews.ts`, `lib/data/users.ts`;
     - `lib/actions/interviews.ts`, `interview-kits.ts`, `interviewer-feedback.ts`;
     - `lib/services/interviews.ts`, `interview-kits.ts`.
   - `lib/services/ai/`: `kit-generation.ts`.
   - `lib/utils/`: `interview-status.ts`, `interview-calendar.ts`, `interview-feedback.ts`, `kit-proposal.ts`.
   - `lib/schemas/`: `interview.ts`.
   - `hooks/`: `use-live-notes-autosave.ts`.
   - `components/interviews/`: presentazione, card, pianificazione, kit, live, scheda, agenda, promemoria legale.
   - `prisma/migrations/`: `20261118000000_interviews_kits`.

## 2. knowledge/domain_model.md

1. **Righe 14–26, tabella delle entità: entità nuove.**
   - `Interview`:
     - campi: `applicationId`, `guideId?`, `round`, `scheduledAt`, `durationMinutes`, `meetingUrl?`, `status` (`InterviewStatus`), `startedAt?`, `endedAt?`, `sequence` (SEQUENCE del `.ics`, +1 a ogni ripianificazione), `createdBy?`;
     - relazioni: candidatura `Cascade`, guida `SetNull`, creatore `SetNull`;
     - eliminandolo si eliminano partecipanti, kit (con sezioni, domande, note) e schede (con voti). Non esiste un'azione di eliminazione del colloquio.
   - `InterviewParticipant`: `interviewId`, `userId`, `role`; unico (`interviewId`, `userId`); utente `Cascade`.
   - `InterviewKit`: `interviewId` unico (1:1), `status` (`draft`, `ready`), `briefing?` (JSON, al massimo 5 punti), `hypotheses?` (JSON `{ criterionId, hypothesis, howToVerify }[]`), `checklist` (JSON `{ id, category: communicate | logistics, text, done }[]`), `missingSources[]`.
   - `KitSection`: `kitId`, `title`, `minutes`, `order`, `kind` (`GuideSectionKind`).
   - `KitItem`:
     - campi: `kitId`, `sectionId`, `text`, `followUps[]`, `criterionIds[]`, `anchors?`, `required`, `order` (posizione nella sezione), `origin` (`KitItemOrigin`), `rationale?`, `sourceRef?` (`quiz:{questionId}`, `feedback:{feedbackId}` o `cv:{citazione}`), `edited`, `covered`, `coveredAt?`;
     - sezione `Cascade`.
   - `KitItemNote`: `kitItemId`, `participantId`, `note?`, `score?` 1–5, `evidenceQuote?`; unico (`kitItemId`, `participantId`); domanda e partecipante `Cascade`.
   - `InterviewerFeedback`:
     - campi: `interviewId`, `interviewerId`, `hireRecommendation?` (stessi valori di `Evaluation.hireRecommendation`, validati dallo schema), `notes?`, `redFlags[]`, `standoutMoments[]`, `submittedAt?`;
     - unico (`interviewId`, `interviewerId`); utente `Cascade`.
   - `CriterionScore`: `feedbackId`, `criterionId`, `score` 1–5, `evidence?`; unico (`feedbackId`, `criterionId`); scheda e criterio `Cascade`.
   - Riga di `Application`, colonna "Deleting it removes": aggiungere i colloqui (con tutto il loro contenuto).
   - Codice: `prisma/schema.prisma:332–513`; migrazione `prisma/migrations/20261118000000_interviews_kits/migration.sql`.
2. **Riga 26, `Application`: prove.**
   - Oggi dice: "An application is deleted only when it holds no evidence: no assessment, evaluation or conversation".
   - Deve dire: la conversazione è ora il colloquio. `applicationHasEvidence` conta i test, i colloqui di qualsiasi stato e la valutazione del CV.
   - Codice: `lib/services/applications.ts:177`.
3. **Riga 85, candidatura ritirata.**
   - Oggi dice: i test non completati di una candidatura ritirata diventano `cancelled`.
   - Deve aggiungere: anche i colloqui `scheduled` diventano `cancelled`. Quelli in corso o conclusi non si toccano. Il passaggio a `rejected` non annulla colloqui. `setApplicationStage` restituisce `cancelledInterviewIds`; `syncCandidateApplications` le accumula.
   - Codice: `lib/services/applications.ts:72`, `:209`.
4. **Righe 86–92, avanzamenti automatici.**
   - Aggiungere:
     - pianificare un colloquio porta la candidatura a `interview` (evento `interview_scheduled`) nella stessa transazione che crea colloquio e kit;
     - quando tutte le schede sono inviate la candidatura passa a `decision` (evento `all_feedback_submitted`).
   - Entrambi solo da una fase precedente e mai su una candidatura chiusa (regola esistente `advanceStage`).
   - "Tutte le schede inviate" (`allFeedbackSubmitted`) vale quando:
     - c'è almeno un colloquio concluso;
     - nessun colloquio è pianificato o in corso;
     - ogni partecipante (conduttore e osservatori) di ogni colloquio concluso ha inviato la scheda.
   - I colloqui annullati e non presentati si ignorano. Il controllo si esegue dopo l'invio di una scheda, l'annullamento e il "non presentato".
   - Codice: `lib/utils/interview-status.ts:50`; `lib/services/interviews.ts:248`.
5. **Sezione nuova "Interviews": stati e passaggi.**
   - Stati: `scheduled`, `in_progress`, `completed`, `cancelled`, `no_show`. Unica fonte: `INTERVIEW_TRANSITIONS`. Nessun passaggio automatico per orario.
   - Passaggi:
     - avvio: `scheduled` → `in_progress`, registra `startedAt`;
     - conclusione: `in_progress` → `completed`, registra `endedAt`;
     - annulla e non presentato: solo da `scheduled`;
     - ripianificazione: solo da `scheduled`. Cambia data, durata, link e partecipanti dello stesso colloquio e tiene il kit; guida e round non cambiano.
   - Ogni altro passaggio: `UserError("Operazione non consentita nello stato attuale del colloquio")`.
   - Pianificazione:
     - è vietata sulle candidature `rejected`, `withdrawn`, `hired` ("Candidatura non trovata o chiusa");
     - la guida è obbligatoria e della stessa posizione;
     - partecipanti da 1 a 10, tutti utenti dell'app, esattamente un conduttore;
     - date passate ammesse.
   - Un partecipante con note o scheda non si toglie ("Il partecipante ha già note o una scheda").
   - L'app non invia email: riepilogo e `.ics` si condividono a mano.
   - Codice: `lib/utils/interview-status.ts:12`; `lib/actions/interviews.ts`; `lib/services/interviews.ts`.
6. **Sezione nuova "Interview kits".**
   - **Copia della guida.** Alla pianificazione il kit nasce `draft` come copia della guida: una `KitSection` per sezione e una `KitItem` con origine `template` per domanda, nello stesso ordine, e la checklist di default (cinque voci). Nei criteri delle domande copiate restano solo i criteri **attivi**: gli id archiviati e sconosciuti si tolgono, così un criterio archiviato non compare mai su un kit nuovo. La guida non si legge più dopo la copia.
   - **Guida eliminata.** Si eliminano solo i riferimenti: `Interview.guideId` diventa null, colloqui e kit restano interi.
   - **Modifica del kit.**
     - Si modifica solo con il colloquio `scheduled` ("Il kit si modifica solo prima del colloquio"), con un unico salvataggio (`saveInterviewKitAction`).
     - `syncKitItems` è l'unico che scrive `KitItem` e non scrive mai `covered`. Le righe si abbinano per id dentro il kit: una riga senza id si crea con l'origine AI della proposta, altrimenti `manual` (mai `template`); le righe assenti si eliminano con le loro note. `order` è la posizione tra le righe della stessa sezione.
     - Una riga di origine AI il cui testo, approfondimenti o criteri cambiano diventa `edited` ("ritoccata"); righe `template` e `manual` non diventano mai `edited`.
     - I criteri di domande e ipotesi seguono la regola delle guide: gli id che non sono criteri della scheda si tolgono; gli archiviati sono ammessi solo se già presenti sullo stesso kit.
     - Il salvataggio non cambia lo stato; "Segna come pronto" / "Riporta in bozza" lo cambiano solo con il colloquio pianificato.
   - **Rigenerazione.** Sostituisce solo le righe AI con `edited = false`. Restano domande del modello, manuali e ritoccate. Briefing e ipotesi si sostituiscono; i suggerimenti di checklist si aggiungono se il testo (senza spazi ai bordi, minuscolo) è nuovo; le fonti mancanti si sostituiscono.
   - **Promemoria legale.** È un testo fisso (`LEGAL_REMINDER_TEXT`), mai generato né salvato.
   - Codice: `lib/services/interviews.ts:115`; `lib/services/interview-kits.ts:146`, `:264`; `lib/utils/kit-proposal.ts:31`.
7. **Sezione nuova "Live notes and interviewer scorecards".**
   - **Note live.** Solo i partecipanti scrivono note. Si scrivono con il colloquio `scheduled` o `in_progress` ("Il colloquio non accetta più note") e mai dopo l'invio della propria scheda ("La scheda è già stata inviata"). Una nota per partecipante e domanda; si salvano solo i campi inviati.
   - **Segno "Coperta".** È condiviso: lo può cambiare ogni utente autenticato, con il colloquio pianificato o in corso.
   - **Scheda intervistatore.** Solo per i partecipanti; l'intervistatore è sempre l'utente autenticato.
     - Si salva come bozza in ogni stato tranne annullato e non presentato.
     - Si invia solo a colloquio concluso ("Puoi inviare la scheda solo a colloquio concluso") e con la raccomandazione ("Indica la raccomandazione finale").
     - L'invio registra `submittedAt`.
     - I voti si salvano solo per i criteri votati, attivi oppure archiviati ma citati dal kit.
     - La pagina della scheda si pre-compila dalle proprie note solo se non c'è una bozza: voto = media arrotondata dei propri voti sulle domande che citano il criterio; evidenze = note e citazioni unite.
   - **Blocco dopo l'invio.** La scheda inviata, i suoi voti e le note live del suo autore su quel colloquio diventano in sola lettura per tutti, autore compreso. Non c'è un'azione per riaprirla. Vedi D2 in sezione 9.
   - Codice: `lib/actions/interview-kits.ts:161`, `:220`; `lib/actions/interviewer-feedback.ts`; `lib/utils/interview-feedback.ts:78`.
8. **Righe 35–47, "Access".**
   - Deve dire come è implementata l'eccezione, cioè che gli unici dati filtrati per utente sono:
     - le note live dell'utente (`getInterviewLiveSession`, `getInterviewFeedbackPage`);
     - la sua scheda non inviata.
   - Le schede inviate e le note live del loro autore si restituiscono a ogni utente autenticato.
   - Nessuna lettura in cache contiene note o schede non inviate.
   - I filtri "Solo i miei" (Agenda) e "Solo le mie" (home) sono di vista: partecipante o responsabile per i colloqui, intervistatore per le schede da compilare.
   - Vedi D1 in sezione 9.
   - Codice: `lib/data/interviews.ts:515`, `:572`.
9. **Righe 114–116, `criterionHasEvidence`.**
   - Oggi dice: "Today the evidence is a CV evaluation … Phase 3 will extend it with interviewer scores and kit items."
   - Deve dire: la prova è, in quest'ordine:
     - una voce della valutazione CV;
     - un `CriterionScore` del criterio (scheda inviata o no);
     - una `KitItem` di un colloquio della posizione che cita il criterio;
     - un'ipotesi di un kit della posizione che lo cita (forme JSON non valide ignorate).
   - Ogni stato del colloquio conta.
   - Codice: `lib/services/scorecards.ts:90`.
10. **Righe 123–129, guide.**
    - Oggi dice (riga 128): "A guide can be deleted freely … nothing references a guide yet."
    - Deve dire: una guida si elimina ancora liberamente, ma ora i colloqui la referenziano con `guideId` (`onDelete: SetNull`). Colloqui e kit restano interi e la card del colloquio non mostra più il titolo della guida.
11. **Righe 183–187, "Language".**
    - Aggiungere che anche i valori della proposta del kit (briefing, ipotesi, domande, approfondimenti, motivazioni, checklist) sono in italiano.
    - Il termine "Colloquio" è usato per `Interview`.
12. **Righe 202–213, "Common mistakes".**
    - Aggiungere:
      - scrivere `KitItem` fuori da `syncKitItems`, o scrivere `covered` dal salvataggio del kit;
      - salvare la proposta AI del kit senza "Salva kit";
      - leggere note o schede non inviate in una lettura in cache;
      - prendere l'intervistatore dall'input invece che dalla sessione;
      - modificare una scheda inviata;
      - usare il nome `LiveInterview` (il colloquio è `Interview`; la modalità live usa `InterviewLiveSession`, `getInterviewLiveSession`, `InterviewLiveMode`).

## 3. knowledge/server_actions.md

1. **Riga 77, azioni autenticate.** Tutte chiamano `requireUser()` e nessuna fa controlli di ruolo o proprietario. Aggiungere:
   - `scheduleInterviewAction` (redirect a `/dashboard/applications/{id}/interviews/{interviewId}/prepare?scheduled=1`, da chiamare senza `unwrap`): "Candidatura non trovata o chiusa", "Guida non trovata per questa posizione", "Uno o più partecipanti non sono utenti dell'app", messaggi dello schema ("Indica un solo conduttore", "Un partecipante è indicato più volte", "Data e ora non valide", "Durata minima 10 minuti", "Durata massima 480 minuti", "Link della call non valido");
   - `rescheduleInterviewAction`: "Colloquio non trovato", "Operazione non consentita nello stato attuale del colloquio", "Il partecipante ha già note o una scheda", "Uno o più partecipanti non sono utenti dell'app";
   - `cancelInterviewAction`, `markInterviewNoShowAction`, `startInterviewAction`, `completeInterviewAction`: "Colloquio non trovato", "Operazione non consentita nello stato attuale del colloquio";
   - `generateInterviewKitAction`: "Il kit si modifica solo prima del colloquio", "Crea prima la scheda di valutazione della posizione";
   - `saveInterviewKitAction`: "Il kit si modifica solo prima del colloquio", "Una o più domande non appartengono a questo kit", "Sezione del kit non valida", "Uno o più criteri selezionati non appartengono alla scheda della posizione";
   - `setInterviewKitStatusAction`: "Il kit si modifica solo prima del colloquio";
   - `saveKitItemNoteAction`: "Domanda non trovata", "Non partecipi a questo colloquio", "Il colloquio non accetta più note", "La scheda è già stata inviata";
   - `setKitItemCoveredAction`: "Domanda non trovata", "Il colloquio non accetta più note";
   - `saveInterviewerFeedbackAction`: "Non partecipi a questo colloquio", "La scheda è già stata inviata", "Operazione non consentita nello stato attuale del colloquio", errore dei criteri;
   - `submitInterviewerFeedbackAction`: come la bozza più "Puoi inviare la scheda solo a colloquio concluso" e "Indica la raccomandazione finale".
   - Codice: `lib/actions/interviews.ts`, `lib/actions/interview-kits.ts`, `lib/actions/interviewer-feedback.ts`.
2. **Riga 85, action di generazione in sola lettura.** Aggiungere `generateInterviewKitAction`: restituisce `{ proposal }`, non scrive e non invalida.
3. **Righe 87–92, ogni action che scrive invalida.** Vale anche per l'autosave delle note live (`saveKitItemNoteAction` chiama `invalidateInterviewCache`; il client lo raggruppa con un debounce di 800 ms).
4. **Riga 55–59, redirect.** Aggiungere `scheduleInterviewAction` agli esempi di action con redirect.
5. **Righe 94–122, form client.**
   - Aggiungere il modello del form di pianificazione: il campo `datetime-local` resta stringa locale nel form e un resolver la converte in ISO con l'offset del browser prima della validazione (`withLocalScheduledAt`, `components/interviews/schedule-interview-form.tsx`).
   - L'editor del kit usa `useForm<z.input<…>, unknown, Output>` con `values` e `keyName: "fieldKey"`, come scheda e guida.

## 4. knowledge/cache_invalidation.md

1. **Righe 20–44, vocabolario dei tag.**
   - Aggiungere `INTERVIEWS` = `interviews`, con `entityTag.interview(id)` → `interview-{id}`.
   - `interviews` copre colloqui, partecipanti, kit, sezioni, domande e schede inviate. Note live e schede non inviate non sono mai in cache.
   - Resta senza tag `User`: `getUserOptions` (`lib/data/users.ts`) ha `cacheLife("minutes")` e nessun tag, così un collega nuovo compare entro pochi minuti.
   - Codice: `lib/utils/cache-utils.ts:47`, `:73`; `lib/data/users.ts:11`.
2. **Righe 72–93, tabella degli helper.** Aggiungere `invalidateInterviewCache({ interviewId?, applicationId })`, solo per server action:
   - scade `interviews` e, con `interviewId`, `interview-{id}`;
   - rivalida `/dashboard/applications/{applicationId}`, `/dashboard/agenda` e `/dashboard`;
   - con `interviewId` rivalida anche `…/interviews/{interviewId}/prepare`, `/live`, `/feedback`.

   Quando la fase della candidatura cambia (pianificazione, invio dell'ultima scheda, annulla, non presentato) le action chiamano anche `invalidateCandidateCache`. `moveApplicationStageAction` e `updateCandidateAction` chiamano `invalidateInterviewCache` quando il ritiro annulla colloqui.
   - Codice: `lib/utils/cache-utils.ts:449`; `lib/actions/applications.ts`; `lib/actions/candidates.ts`.
3. **Righe 102–122, `CASCADE_ON_DELETE`.**
   - Oggi dice: posizione con quizzes, assessments, evaluations, candidates, behavioral-rubrics, scorecards, interview-guides; candidato con assessments, evaluations, behavioral-rubrics.
   - Deve dire: aggiungere `interviews` a posizione e candidato.
   - Codice: `lib/utils/cache-utils.ts:82`.
4. **Righe 12–18, letture non in cache.**
   - Aggiungere `getInterviewLiveSession` e `getInterviewFeedbackPage`: dipendono dalla sessione e dai dati live, nessun `"use cache"`. Le pagine live e scheda chiamano `await connection()` prima di leggere la sessione.
   - La modalità live chiama `router.refresh()` ogni 15 secondi mentre il colloquio è in corso e la scheda del browser è visibile.
5. **Letture che usano il tag nuovo.**
   - `getInterviewsByApplication`: `interviews`, `candidates`, `positions`, `interview-guides`.
   - `getInterviewForPreparation`: in più `scorecards` e `interview-{id}`.
   - `getAgendaInterviews` (`cacheLife("minutes")`): `interviews`, `candidates`, `positions`.
   - `getApplicationDetail` e `getActionCenterData`: aggiungono `interviews`.
   - Codice: `lib/data/interviews.ts:404`, `:426`, `:447`; `lib/data/applications.ts`.

## 5. knowledge/ai_generation.md

1. **Righe 32–41, task di `getOptimalModel`.** Nuovo `LLMTaskType` `kit_generation` sul modello grande. Codice: `lib/services/ai/models.ts:58`, `:145`.
2. **Righe 43–50, Determinism.** La generazione del kit usa temperatura 0.7 e nessun seed. Codice: `lib/services/ai/kit-generation.ts:36`.
3. **Righe 52–61, Prompts: minimizzazione dei dati del kit.**
   - **Nessun dato identificativo.** Il prompt del kit chiama il candidato "il candidato"; non riceve mai nome, email, data di nascita, foto o URL del CV. La lettura del contesto seleziona del candidato solo `resumeUrl`, per estrarre il testo.
   - **Testi ripuliti.** Il testo del CV passa da `redactBirthDate`, poi da `sanitizeInput(text, MAX_RESUME_CHARS)`. Debolezze, testi delle domande e testi della posizione passano da `sanitizeInput`; le risposte da `sanitizeInput(answer, MAX_ANSWER_CHARS)` (scelta multipla: il testo dell'opzione scelta). Nomi e descrizioni dei criteri passano da `sanitizeInput`.
   - **Round precedenti.** Arrivano solo statistiche per criterio ("senza prove", "voti discordanti" con scarto ≥ 2) con le chiavi F<n> delle schede, mai testo libero o nomi degli intervistatori.
   - Codice: `lib/services/interview-kits.ts:394`; `lib/services/ai/prompts.ts:929`, `:966`.
4. **Righe 63–67, chiavi.** Oltre a C<n> per i criteri, il kit usa Q<n> per le risposte deboli del test e F<n> per le schede dei round precedenti. Il servizio le traduce in `sourceRef`: `quiz:{questionId}`, `feedback:{feedbackId}`, e `cv:{citazione}` (massimo 300 caratteri) per le domande CV e lacuna CV. Chiavi sconosciute: criterio scartato, ipotesi scartata, domanda tenuta senza fonte.
5. **Flusso nuovo "Interview kit generation".**
   1. `generateInterviewKitAction` (solo colloquio pianificato) chiama `buildKitGenerationContext`. Questo raccoglie:
      - posizione, criteri attivi (nessuno → "Crea prima la scheda di valutazione della posizione") e sezioni del kit;
      - testo del CV; un PDF illeggibile lascia il testo a null e segna la fonte mancante `cv`;
      - debolezze e criteri sotto il livello atteso della valutazione CV;
      - risposte deboli dell'ultimo test concluso e valutato: punteggio < 7, dal più basso, massimo 6;
      - round precedenti conclusi della stessa candidatura;
      - fonti mancanti `cv`, `cv_evaluation`, `assessment`, `answer_detail`.
   2. `generateInterviewKit` calcola il limite. Con T domande del modello è `floor(2T/3)`, cioè personalizzate ≤ 40% del totale; senza domande del modello è `floor(0.4 · durata / 5)`. Al limite sottrae le domande AI ritoccate già nel kit. Poi chiama `generateStructured("kit_generation", aiInterviewKitGenerationSchema)`.
   3. Il risultato:
      - le chiavi diventano id;
      - le domande vanno nella prima sezione del tipo indicato, altrimenti nell'ultima sezione che non è di chiusura, altrimenti nell'ultima;
      - si tengono le prime N domande entro il limite;
      - il briefing si taglia a 5 punti.
   4. L'action restituisce la proposta: nessuna scrittura, nessuna invalidazione. L'editor la fonde come modifiche non salvate (`mergeKitProposal`).

   Il divieto di domande su età, stato civile, famiglia, figli, religione, opinioni politiche e salute è solo nel prompt.
6. **Barrel.** `lib/services/ai/index.ts` esporta anche `buildKitSystemPrompt` e `buildKitPrompt`; `generateInterviewKit` e `generateStructured` restano fuori dal barrel.

## 6. knowledge/styling.md

1. **Righe 32–60, "Status and score colours": modulo di presentazione dei colloqui.** `components/interviews/interview-presentation.ts` è la sola mappa:
   - `INTERVIEW_STATUS_PRESENTATION` e `getInterviewStatusPresentation(status)`, con i token `stage-*`: Pianificato `stage-pending`, In corso `stage-progress`, Concluso `stage-done`, Annullato `stage-cancelled`, Non presentato `stage-expired`; stato sconosciuto `bg-muted text-muted-foreground`;
   - `KIT_STATUS_PRESENTATION`: "Kit in bozza" `bg-warning/10 text-warning`, "Kit pronto" `bg-success/10 text-success`;
   - `KIT_ITEM_ORIGIN_LABEL` e `getKitItemOriginLabel(origin, sourceRound)` ("Round N" per una domanda del round precedente con scheda nota), `PARTICIPANT_ROLE_LABEL`, `HIRE_RECOMMENDATION_LABEL`, `MISSING_SOURCE_LABEL`, `LEGAL_REMINDER_TEXT`.

   Il badge di origine della domanda è neutro (`variant="outline"`), senza colori per origine. La copertura dei criteri usa "Nessuna prova" `bg-warning/10 text-warning` e "Con prove" `bg-success/10 text-success`. Il timer di sezione è `text-warning` sotto i 2 minuti e `text-destructive` oltre il tempo.
2. **Righe 12–30, token di sezione.**
   - La sezione `agenda` ("Agenda colloqui", icona `CalendarDays`) riusa il colore dei candidati (`text-section-candidates`, `bg-section-candidates`), come la sezione Candidature. Nessun token nuovo.
   - È nel gruppo Selezione dopo Candidati. `MineToggle` accetta un'etichetta (`label`, default "Solo le mie"): l'Agenda usa "Solo i miei".
3. **Promemoria legale.** Non esiste un componente Alert in `components/ui`. `LegalReminder` è un blocco `role="note"` con `bg-warning/10 text-warning` sulle pagine di preparazione e live.

## 7. knowledge/testing.md

1. **Righe 19–31, mock globale di Prisma.**
   - I modelli nuovi non hanno un delegato nel mock globale: `interview`, `interviewParticipant`, `interviewKit`, `kitSection`, `kitItem`, `kitItemNote`, `interviewerFeedback`, `criterionScore`.
   - I test che li toccano dichiarano un `vi.mock("@/lib/prisma", …)` a livello di file, ricostruendo `$transaction`.
   - Anche i test esistenti che passano da `setApplicationStage` o da `applicationHasEvidence` devono dare un delegato `interview` con `count`, `findMany` e `updateMany`. Per esempio `tests/lib/actions/applications.test.ts`, `tests/lib/actions/candidates.test.ts`, `tests/lib/services/applications.test.ts`.
   - Il `tx` costruito a mano per `criterionHasEvidence` deve avere `criterionScore.count`, `kitItem.count` e `interviewKit.findMany`.
2. **Riga 33–41, strategie.**
   - I servizi che ricevono `tx` (`createInterviewWithKit`, `syncInterviewParticipants`, `applyAllFeedbackCheck`, `syncKitItems`) si testano con un oggetto transazione costruito nel test.
   - Le action mockano parzialmente `@/lib/services/interviews` con `importOriginal`, tenendo vere `loadInterview` e `assertInterviewStatus`.
   - Il test del contesto del kit spia `redactBirthDate` e `sanitizeInput` per controllarne l'ordine.
   - L'hook dell'autosave si testa con `renderHook`, un debounce breve e `waitFor`, senza fake timer.
3. **File di test nuovi** (layout invariato):
   - `tests/lib/schemas/interview.test.ts`;
   - `tests/lib/utils/interview-status.test.ts`, `interview-calendar.test.ts`, `interview-feedback.test.ts`, `kit-proposal.test.ts`;
   - `tests/lib/services/interviews.test.ts`, `interview-kits.test.ts`, `ai/kit-generation.test.ts`;
   - `tests/lib/actions/interviews.test.ts`, `interview-kits.test.ts`, `interviewer-feedback.test.ts`;
   - `tests/lib/data/interviews.test.ts`, `users.test.ts`;
   - `tests/hooks/use-live-notes-autosave.test.ts`;
   - `tests/components/interviews/interview-presentation.test.ts`.

## 8. Nulla da cambiare

Verificati sul codice e ancora corretti:

- `knowledge/server_actions.md`: forma dell'action, contratto degli errori, autenticazione, letture nel data layer, logging.
- `knowledge/domain_model.md`: avanzamenti mai all'indietro e mai su candidature chiuse (la Fase 3 li usa senza logica nuova); regole di migrazione (la Fase 3 è una migrazione solo additiva, senza backfill); nessun ruolo.
- `knowledge/ai_generation.md`: unico punto d'ingresso `generateStructured`, fallback, `describeAIError`, temperatura 0 e seed 42 per le valutazioni.
- `knowledge/cache_invalidation.md`: regola dei tag di dipendenza, passaggio dei dati ai client component (utenti e guide letti nel server e passati ai form).
- `knowledge/question_schemas.md`: nessuna modifica agli schemi delle domande; `lib/schemas/interview.ts` segue le regole esistenti e importa ancore e tipi di sezione dai moduli, non dal barrel.
- `knowledge/styling.md`: componenti da riusare, testi in italiano.

## 9. Punti in cui il piano e la knowledge non coincidono (da decidere)

1. **D1 — Indipendenza delle schede inviate.**
   - **Il piano** (§3.1 "Regola di indipendenza", §4.2) chiede che un intervistatore non veda le schede degli altri finché non ha inviato la sua.
   - **La knowledge** (`domain_model.md`, righe 35–47) ammette solo il filtro sul materiale **non inviato** e vieta di nascondere una scheda inviata.
   - **Applicata la knowledge:** le schede inviate sono restituite a ogni utente autenticato. Come attenuazione, chi non ha ancora inviato le vede in una sezione chiusa "Schede già inviate (n)" con l'avviso "Per un giudizio indipendente, leggile dopo aver inviato la tua".
   - **Da decidere:** se la regola d'accesso va estesa (nascondere anche le schede inviate a chi non ha inviato), oppure se la soluzione attuale diventa la regola documentata.
2. **D2 — Blocco della scheda dopo l'invio.**
   - **Il piano** (§4.2) dice che l'invio blocca la scheda.
   - **La knowledge** (stesse righe) dice che dopo l'invio ogni utente la vede e la modifica "come ogni altra entità".
   - **Applicato il blocco** come regola di stato uguale per tutti, autore compreso, senza controlli per utente; vale anche per le note live dell'autore.
   - **Da decidere:** se la frase "edits it like any other entity" va corretta in "la vede, in sola lettura", o se serve un'azione per riaprire una scheda (oggi assente).

## Fuori da knowledge/ e CONTEXT.md (solo segnalazione)

- `prisma/migrations/README.md`: aggiornato con `20261118000000_interviews_kits` e con la frase sul rilascio (`pnpm db:migrate:deploy` la applica dopo le migrazioni delle Fasi 1 e 2). Non richiede interventi.
- `prisma/verify-application-hub.ts` (`pnpm db:verify`): esclude dal controllo dei vecchi nomi "interview" le tabelle della Fase 3 e i tipi `InterviewStatus`, `InterviewParticipantRole`, e verifica che `interviews` abbia `scheduledAt` e non `token`. Se un documento descrive cosa verifica lo script, va aggiunta questa eccezione.
- `components/dashboard/breadcrumbs.tsx`: aggiunte le etichette `agenda`, `interviews`, `prepare`, `live`, `feedback`, `guides`. I segmenti senza pagina propria portano alla tab che li elenca: `guides` dopo l'id della posizione a `/dashboard/positions/{id}?tab=guide`, `interviews` dopo l'id della candidatura a `/dashboard/applications/{id}?tab=colloqui`.
