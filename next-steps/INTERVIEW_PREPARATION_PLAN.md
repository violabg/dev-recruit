# Preparazione al colloquio e flusso di selezione — Piano

**Data:** 15 novembre 2026
**Stato:** Proposta — decisioni di prodotto chiuse il 15 novembre 2026 (§7), nessun codice scritto
**Ambito:** Kit di preparazione al colloquio, colloquio live, decisione; revisione del flusso dashboard da step 1 a step finale

---

## 1. Gap attuali

1. **Non esiste una "candidatura".** `CandidatePosition` è un semplice collegamento; lo stato `Candidate.status` è unico per persona, quindi un candidato su due posizioni non può essere "in colloquio" per A e "scartato" per B.
2. **La Dashboard valutazione** (`/dashboard/candidates/[id]/evaluation-dashboard`) considera solo la posizione primaria e usa pesi fissi nel codice (quiz 0.5, rubrica 0.3, decisione hiring 0.2).
3. **Il quiz inviato (`Interview`) non è legato alla candidatura**: punta a candidato + quiz; la posizione si ricava dal quiz.
4. **"Colloquio" significa quiz asincrono.** Il colloquio vero (la conversazione) non ha un'entità.
5. **I punteggi per risposta del quiz non sono salvati** (0–10 calcolati e scartati): non si possono riusare per suggerire domande di approfondimento.
6. **Rubrica comportamentale fissa** (5 dimensioni uguali per ogni ruolo), una sola per coppia candidato-posizione, nessuna distinzione tra intervistatori.
7. **Navigazione per entità** (Posizioni, Candidati, Quiz, Colloqui), non per percorso: l'utente deve sapere dove andare per passare allo step successivo.
8. **Modificare le posizioni di un candidato ricrea tutti i collegamenti** (`updateCandidateAction` fa `deleteMany: {}` + `create`): con fase e prove agganciate alla candidatura, ogni salvataggio le cancellerebbe.
9. **L'email del candidato non è unica** e il form pubblico crea sempre un nuovo candidato: la stessa persona può avere storie separate.
10. **La posizione non ha uno stato** (aperta/chiusa) e cancellarla elimina a cascata candidature, test e valutazioni, anche degli assunti.

**Principio guida:** la **Candidatura** diventa il perno. CV, test, colloqui e decisione sono *prove* raccolte su una candidatura, e la pagina della candidatura indica sempre la **prossima azione**.

---

## 2. Flusso end-to-end

```
POSIZIONE (setup, una volta per ruolo)
  1. Dettagli ──► 2. Scheda di valutazione ──► 3. Quiz ──► 4. Guida colloquio (modello)
                  (cosa conta e quanto pesa)      (entrambi generati dalla scheda)

CANDIDATURA (una per candidato × posizione)
  Candidato ──► Screening CV ──► Test (quiz) ──► Colloquio/i ──► Decisione ──► Esito
                │                │               │
                │ valutazione CV │ risposte +    │ Kit personalizzato = modello
                │ sulla scheda   │ punteggi      │   + domande da CV, quiz, round precedenti
                └────────────────┴───────────────┤ Modalità live (note, voti, copertura criteri)
                                                 └ Schede degli intervistatori
                                                          │
                                         Pagina Decisione ◄┘ (prove per criterio, lacune, pesi)
```

**Fasi della candidatura (`ApplicationStage`):**
`applied` Candidato · `screening` Screening · `assessment` Test · `interview` Colloquio · `decision` Decisione · `offer` Offerta · `hired` Assunto · `rejected` Scartato · `withdrawn` Ritirato.

**Regole di transizione**
- Le azioni fanno avanzare la fase e non la fanno mai arretrare: valutare il CV → `screening`; inviare un test → `assessment`; pianificare un colloquio → `interview`; tutte le schede inviate → `decision`; registrare la decisione → `offer` / `hired` / `rejected`.
- Il recruiter può sempre spostare la fase a mano: saltare fasi (es. nessun test), tornare indietro, scartare o ritirare da qualunque fase, riaprire una candidatura scartata o ritirata.
- Ogni cambio aggiorna `stageChangedAt`.

---

## 3. Struttura dati

### 3.1 Entità nuove o modificate

**Application (Candidatura)** — evoluzione di `CandidatePosition` (stessa tabella, nuovi campi)
- esistenti: `candidateId`, `positionId` (coppia unica)
- nuovi: `stage` (enum sopra), `stageChangedAt`, `ownerId` (recruiter responsabile)
- esito: `decision`, `decisionRationale`, `decidedBy`, `decidedAt`, `decisionWeights` (JSON: pesi dei criteri usati al momento della decisione)
- `isPrimary` serve solo al backfill (§3.4), poi viene rimosso: le candidature si ordinano per attività recente.
- **Le candidature non si sostituiscono più in blocco.** Modificare le posizioni di un candidato è un diff: le nuove si creano in `applied`, quelle invariate non si toccano. Una posizione tolta porta la candidatura a `withdrawn` con tutto lo storico; si elimina davvero solo se non ha alcuna prova (nessun test, valutazione o colloquio). I test non completati della candidatura ritirata vengono annullati, non cancellati.

**Candidate (Candidato)** — modifiche
- `status` viene eliminato: liste e badge mostrano la fase della candidatura più avanzata.
- nuovi: `doNotContact` (flag anagrafico "Non ricontattare") e `doNotContactNote`.
- `email` diventa unica, normalizzata (minuscole, senza spazi). Il form pubblico con un'email già presente aggiunge la candidatura al candidato esistente e aggiorna il CV; se è già candidato a quella posizione conferma senza creare nulla. La risposta al candidato è identica in tutti i casi, per non rivelare se l'email esiste.

**Position (Posizione)** — modifiche
- nuovo `status`: `draft` Bozza · `open` Aperta · `closed` Chiusa. Solo le posizioni aperte compaiono nel form pubblico e nelle liste attive; una posizione chiusa conserva tutto.
- L'eliminazione è permessa solo se la posizione non ha candidature.

**Scorecard (Scheda di valutazione)** — 1:1 con `Position`, composta da **ScorecardCriterion**:

| Campo | Significato |
|---|---|
| `name`, `description` | es. "Progettazione API REST" |
| `category` | `technical` · `soft` · `culture` |
| `priority` | `must` · `nice` |
| `weight` | peso nella decisione |
| `expectedLevel` | 1–5 |
| `anchors` | JSON `{ weak, medium, strong }`: come suona una risposta debole / media / forte |
| `source` | `skill` · `softSkill` · `custom` |
| `order` | ordinamento |
| `archivedAt` | criterio archiviato (vedi sotto) |

L'AI propone i criteri da skill, soft skill e livello della posizione; il recruiter li modifica. Le 5 dimensioni della rubrica attuale diventano i criteri soft di default.

**Modifiche alla scheda dopo i primi voti**
- Un criterio con voti o citato in un kit non si elimina: si archivia. Resta visibile nelle decisioni già avviate, sparisce dai nuovi kit e dalle nuove schede.
- Nome, descrizione e ancore restano modificabili.
- Un cambio di peso vale solo per le candidature non ancora decise: la decisione salva i pesi usati in `decisionWeights`.

**Collegamento quiz ↔ criteri:** `QuizQuestion.criterionIds[]` indica i criteri che la domanda verifica in quel quiz (sul legame, così una domanda riusata può valere per criteri diversi). L'AI li propone quando genera il quiz dalla scheda. I quiz esistenti restano senza collegamento e contano come punteggio globale.

**InterviewGuide (Guida colloquio)** — modello per posizione; una o più (es. round "Tecnico", "Culturale")
- `positionId`, `title`, `round`, `durationMinutes`
- **GuideSection**: `title`, `minutes`, `order`, `kind` (`intro` · `experience` · `technical` · `behavioral` · `candidate_questions` · `closing`)
- **GuideQuestion**: `text`, `followUps[]`, `criterionIds[]`, `anchors`, `required`, `order`

**InterviewKit (Kit colloquio)** — istanza per candidatura + colloquio; *snapshot* del modello (modificare il modello non altera i colloqui passati)
- `applicationId`, `guideId`, `status` (`draft` · `ready`)
- `briefing`: sintesi AI del candidato + **ipotesi da verificare**
- `checklist`: JSON — cosa comunicare (RAL, modalità di lavoro, prossimi passi), logistica, promemoria legali
- **KitItem**:
  - `text`, `followUps[]`, `criterionIds[]`, `anchors`, `order`, `sectionKind`
  - `origin`: `template` · `cv` · `resume_gap` · `quiz_answer` · `previous_round` · `manual`
  - `rationale`: perché chiederlo (es. "nel quiz ha sbagliato la domanda 4 sulla concorrenza")
  - `sourceRef`: riferimento alla prova (id domanda quiz, frase CV, id feedback)
  - `edited`: true quando una domanda di origine AI è stata ritoccata a mano (la rigenerazione non la tocca)
  - durante il colloquio: `covered` (condiviso tra i partecipanti)
- **KitItemNote** — una per partecipante × domanda: `kitItemId`, `participantId`, `note`, `score` (1–5), `evidenceQuote`. Note e voti sono di chi li scrive e restano invisibili agli altri finché non invia la propria scheda.

**LiveInterview (Colloquio)** — la conversazione vera; più round per candidatura
- `applicationId`, `kitId`, `round`, `scheduledAt`, `durationMinutes`, `meetingUrl`
- `status`: `scheduled` · `in_progress` · `completed` · `cancelled` · `no_show`
- `startedAt`, `endedAt`
- Ripianificare modifica `scheduledAt` dello stesso colloquio; il kit resta.
- **Avvisi:** l'app non invia email. Dopo la pianificazione mostra un riepilogo copiabile e un file `.ics` scaricabile; gli intervistatori vedono il colloquio in Agenda e in Le mie azioni.
- **LiveInterviewParticipant**: `userId`, `role` (`lead` · `observer`). Solo utenti dell'app.
- Registrazione, trascrizione e sintesi AI (`recordingConsent`, `transcript`, `aiSummary`) non fanno parte dello schema iniziale: Fase 5.

**InterviewerFeedback (Scheda intervistatore)** — una per intervistatore × colloquio
- `liveInterviewId`, `interviewerId`, `hireRecommendation` (enum esistente), `notes`, `redFlags[]`, `standoutMoments[]`, `submittedAt`
- **CriterionScore**: `criterionId`, `score` (1–5), `evidence`
- **Regola di indipendenza:** le schede degli altri restano nascoste finché non hai inviato la tua.

### 3.2 Modifiche all'esistente

- `Interview` (test): aggiungere `applicationId`, obbligatorio (backfill da candidato + `quiz.positionId`, §3.4).
- `Evaluation` di tipo test: aggiungere `answerEvaluations` (JSON per id domanda: `score` 0–10, `strengths`, `weaknesses`), salvato alla generazione della valutazione. Le valutazioni esistenti non lo hanno: il kit usa la sola valutazione complessiva e offre "Ricalcola dettaglio risposte", che riesegue l'AI sulle risposte senza modificare `quizScore` e `fitScore` già salvati.
- `Evaluation` di tipo CV: collegamento alla candidatura via candidato + posizione; aggiungere `criteriaAssessment` (JSON per criterio della scheda).
- `BehavioralRubric` e campi hiring di `Evaluation` (`interviewNotes`, `redFlags`, `standoutMoments`, `hireRecommendation`, `nextSteps`): storico in sola lettura; i nuovi dati vanno in `InterviewerFeedback` / `CriterionScore`.
- **Terminologia UI:** quiz inviato → **"Test"**; **"Colloquio"** solo per la conversazione. Richiede l'aggiornamento di `CONTEXT.md` e dei documenti in `knowledge/` tramite il ruolo `knowledge-builder`.
- **Nomi puliti in codice e database (Fase 1), nessun vecchio nome residuo:**

| Oggi | Diventa | Tabella |
|---|---|---|
| `CandidatePosition` | `Application` | `candidate_positions` → `applications` |
| `Interview`, `InterviewStatus` | `Assessment`, `AssessmentStatus` | `interviews` → `assessments` |
| `Evaluation.interviewId` | `Evaluation.assessmentId` | colonna rinominata |
| `/dashboard/interviews` | `/dashboard/assessments` | — |

  La rinomina copre anche action, data layer, schemi, componenti, tag di cache, test e messaggi. `Interview` resta libero e nella Fase 3 indica il colloquio vero: `LiveInterview`, `LiveInterviewParticipant` di questo documento si chiameranno `Interview`, `InterviewParticipant`.
- **Codice obsoleto da rimuovere nella Fase 1:** `Candidate.status` e il suo badge, `isPrimary` e il badge "Primaria". La Dashboard valutazione, che oggi usa la posizione primaria, passa a ricevere la candidatura.

### 3.3 Relazioni (sintesi)

```
Position 1─1 Scorecard 1─n ScorecardCriterion
Position 1─n InterviewGuide 1─n GuideSection 1─n GuideQuestion ─n─ ScorecardCriterion
Position 1─n Application n─1 Candidate
Application 1─n Interview (test) 1─1 Evaluation (quiz)
Application 1─n Evaluation (CV)
Application 1─n LiveInterview 1─1 InterviewKit 1─n KitItem
LiveInterview 1─n LiveInterviewParticipant (User)
LiveInterview 1─n InterviewerFeedback 1─n CriterionScore ─n─1 ScorecardCriterion
KitItem 1─n KitItemNote n─1 LiveInterviewParticipant
QuizQuestion ─n─ ScorecardCriterion
```

### 3.4 Backfill dei dati esistenti

**Ambienti e ritorno indietro**
- Tutto il lavoro avviene sul ramo Neon `development`, riallineato alla produzione il 15 novembre 2026; `DATABASE_URL` in `.env.local` punta lì. La produzione non si tocca fino al rilascio.
- Copia congelata della produzione: ramo Neon `backup/pre-application-hub-2026-11-15`. Codice: tag git `backup/pre-application-hub` su `main`.
- Per abbandonare lo sviluppo: tornare su `main` e rimettere `DATABASE_URL_PRODUCTION` come `DATABASE_URL`.
- I CV stanno in un bucket R2 condiviso con la produzione: in sviluppo non cancellare candidati che esistono anche in produzione.

**Migrazione versionata**
- Il progetto usa `prisma db push`, che per rinominare una tabella la elimina e la ricrea. La Fase 1 torna a Prisma Migrate: una migrazione di base che fotografa lo schema attuale, poi una migrazione della Fase 1 con rinomine (`ALTER TABLE … RENAME`), nuovi campi, backfill e rimozione dei campi vecchi. Il database ha già una tabella `_prisma_migrations` con 3 righe ma la cartella delle migrazioni non esiste più: la base va riallineata.
- La stessa migrazione, provata su `development`, si applica poi alla produzione: non si copia mai il database di sviluppo su quello di produzione.
- I dati esistenti sono di prova e si possono perdere, ma la migrazione li conserva per avere casi reali su cui verificare.

1. **Duplicati:** elencare i candidati con la stessa email normalizzata; si uniscono a mano prima di rendere l'email unica.
2. **Fase della candidatura primaria** da `Candidate.status`: `pending` → `applied` · `contacted` → `screening` · `interviewing` → `assessment` se ha quiz inviati per quella posizione, altrimenti `interview` · `hired` → `hired` · `rejected` → `rejected`.
3. **Altre candidature:** `assessment` se hanno un quiz inviato, altrimenti `applied`.
4. **Test:** `applicationId` da candidato + `quiz.positionId`. Se la candidatura non esiste più (posizione rimossa dal candidato) si ricrea con fase `withdrawn`.
5. **Posizioni esistenti:** `status` = `open`.
6. Dopo la verifica: rimozione di `Candidate.status` e `isPrimary`.

---

## 4. Pagine dashboard e collegamenti

### 4.1 Sidebar

| Gruppo | Voci |
|---|---|
| Panoramica | **Le mie azioni** (nuova home) |
| Selezione | Posizioni · **Candidature** (pipeline globale) · Candidati · **Agenda colloqui** |
| Libreria | Quiz · Test inviati (attuale "Colloqui") · Preset |
| Impostazioni | invariate |

### 4.2 Pagine

**`/dashboard` — Le mie azioni**
Colloqui di oggi/domani senza kit pronto · schede da compilare · test completati da valutare · candidature ferme da più di N giorni · posizioni con setup incompleto. Ogni riga porta all'azione.

**`/dashboard/positions/[id]`** — tab: Dettagli · **Scheda di valutazione** · **Selezione** (kanban candidature per fase) · Quiz · **Guide colloquio**
- In alto una checklist di setup (dettagli ✓, scheda ✓, quiz ✓, guida ✓).
- `…/scorecard`: editor con proposta AI.
- `…/guides/[guideId]`: editor modello, con "genera dalla scheda".

**`/dashboard/applications/[id]` — Candidatura (nuova pagina principale)**
- Header: candidato, posizione, stepper fasi, responsabile.
- **Card "Prossima azione"** calcolata dallo stato:

| Stato | Prossima azione |
|---|---|
| CV non valutato | Valuta CV |
| fase Test, nessun quiz inviato | Invia test (quiz della posizione preselezionato) |
| test completato senza valutazione | Genera valutazione |
| nessun colloquio pianificato in fase Colloquio | Pianifica colloquio |
| colloquio pianificato, kit non pronto | Prepara colloquio |
| colloquio concluso, scheda mancante | Compila scheda |
| tutte le schede inviate | Vai alla decisione |

- Tab: Panoramica (timeline prove) · CV · Test · Colloqui · Decisione.
- La pagina candidato attuale diventa anagrafica + elenco candidature.

**`/dashboard/applications/[id]/interviews/new` — Pianifica colloquio**
Round, guida, data, partecipanti, link call → crea `LiveInterview` + `InterviewKit` in bozza.

**`…/interviews/[liveId]/prepare` — Preparazione**
Briefing e ipotesi · domande del modello + personalizzate con badge di origine (CV, Quiz, Round 1…) e "perché" · modifica/riordino/aggiunta/rimozione · checklist cose da comunicare · promemoria domande vietate · "Segna come pronto".

**`…/interviews/[liveId]/live` — Modalità live**
- Sinistra: sezioni con timer.
- Centro: domanda corrente, approfondimenti, descrizione risposta debole/media/forte; nota rapida, voto 1–5, "coperta".
- Destra: copertura criteri (quali non hanno ancora prove).
- Autosave + bozza locale per resistere a cadute di connessione.

**`…/interviews/[liveId]/feedback` — Scheda intervistatore**
Precompilata con voti e note del live raggruppati per criterio · raccomandazione finale · invio (blocca la scheda) · dopo l'invio si vedono le schede altrui.

**`/dashboard/applications/[id]/decision` — Decisione** (sostituisce la Dashboard valutazione)
- Matrice criteri × fonti (CV, Test, Colloquio 1, Colloquio 2, singoli intervistatori) con prove.
- Celle senza prove evidenziate; disaccordi tra intervistatori segnalati.
- Punteggio complessivo con i pesi della scheda (non più fissi):
  - tutte le fonti riportate su scala 1–5 (test e CV per criterio quando il collegamento esiste, altrimenti come riga globale);
  - per criterio, media tra intervistatori; poi media pesata sui soli criteri con prove;
  - un criterio `must` sotto il livello atteso, o senza prove, non azzera il punteggio: mostra un avviso che la motivazione della decisione deve affrontare esplicitamente.
- Riquadro AI "Avvocato del diavolo": motivi per cui la decisione potrebbe essere sbagliata.
- Form decisione (esito + motivazione) → avanza la fase.

**`/dashboard/agenda`** — colloqui pianificati, filtro "i miei", link diretti a prepara/live.

---

## 5. Generazione AI del kit

**Input**
- criteri della scheda (pesi, livelli attesi)
- modello di guida
- testo del CV (estrazione PDF esistente) e punti deboli della valutazione CV
- risposte del test con punteggio basso (richiede `answerEvaluations`)
- schede dei round precedenti: criteri senza prove o con voti discordanti

**Output** (oggetto strutturato con `generateStructured`)
- `briefing`: 5 punti sul candidato
- `hypotheses[]`: `{ criterionId, hypothesis, howToVerify }`
- `items[]`: `{ text, followUps, criterionIds, origin, rationale, sourceRef }`
- `suggestedChecklist`

**Regole**
- Le domande del modello restano sempre (nucleo comune → candidati confrontabili); l'AI *aggiunge*, non sostituisce.
- Domande personalizzate al massimo il 30–40% del tempo.
- **Proposta, poi conferma:** la generazione restituisce una proposta e nulla si salva finché il recruiter non conferma, come per i quiz.
- **Rigenerazione:** sostituisce solo le domande di origine AI non ritoccate (`edited` = false); quelle del modello, manuali o ritoccate restano.
- **Fonti mancanti:** senza CV, senza test o senza dettaglio risposte il kit si genera con le fonti disponibili e indica cosa manca.
- CV e risposte del test sono testo scritto dal candidato: passano da `sanitizeInput()` prima di entrare nel prompt.
- Non passare al modello dati come data di nascita o foto; la data di nascita va rimossa anche dal testo estratto dal CV.
- Il promemoria legale (domande vietate: età, famiglia, figli, religione, salute — art. 8 Statuto dei Lavoratori, D.Lgs. 198/2006) è testo fisso, non generato.

---

## 6. Fasi di realizzazione

| Fase | Contenuto | Gap chiusi |
|---|---|---|
| **1. Candidatura come perno** | Fasi su `CandidatePosition` e regole di transizione, modifica posizioni come diff, email unica e aggancio dal form pubblico, stato della posizione e blocco eliminazione, rimozione di `Candidate.status` e `isPrimary`, backfill (§3.4), pagina `/applications/[id]` con "Prossima azione", `applicationId` sul test, kanban nella posizione, home "Le mie azioni", rinomina UI "Colloqui" → "Test" | 1, 3, 4, 7, 8, 9, 10 |
| **2. Scheda di valutazione e guide** | Scorecard per posizione (proposta AI, archiviazione criteri), collegamento domande ↔ criteri, modelli di guida, salvataggio dettaglio per risposta | 5, 6 (in parte) |
| **3. Kit e live** | Pianificazione, kit personalizzato AI, pagina preparazione, modalità live, scheda intervistatore | cuore della richiesta |
| **4. Decisione** | Pagina decisione con matrice, pesi dalla scheda, indipendenza intervistatori, avvocato del diavolo; rubrica ed evaluation-dashboard in sola lettura | 2, 6 |
| **5. Extra** | Registrazione/trascrizione con consenso + sintesi per criterio, guida di preparazione per il candidato, feedback dopo il rifiuto | — |

La fase 1 non usa l'AI ma è il prerequisito: senza candidatura non c'è dove agganciare kit, colloqui e decisione.

---

## 7. Decisioni

### 7.1 Decisioni prese (15 novembre 2026)

| Tema | Decisione | Dove |
|---|---|---|
| Posizione tolta da un candidato | Candidatura `withdrawn` con lo storico; eliminata solo se senza prove | §3.1 |
| Email già presente | Email unica; il form pubblico aggancia la candidatura al candidato esistente | §3.1 |
| Backfill dello stato | `Candidate.status` va solo sulla candidatura primaria | §3.4 |
| Avanzamento di fase | Automatico dalle azioni (mai all'indietro) più spostamento manuale libero | §2 |
| Ciclo di vita della posizione | Bozza / Aperta / Chiusa; eliminazione solo senza candidature | §3.1 |
| `Candidate.status` | Eliminato; resta il flag "Non ricontattare" con nota | §3.1 |
| Test senza candidatura | Il backfill ricrea la candidatura come `withdrawn`; `applicationId` obbligatorio | §3.4 |
| `isPrimary` | Rimosso dopo il backfill | §3.1 |
| Modifiche alla scheda | Criteri archiviati, non eliminati; i pesi usati si salvano con la decisione | §3.1 |
| Prove del test per criterio | `QuizQuestion.criterionIds[]`, proposto dall'AI | §3.1 |
| Punteggio complessivo | Media pesata su scala 1–5; `must` scoperto = avviso da motivare | §4.2 |
| Note durante il colloquio | Per intervistatore, nascoste fino all'invio della scheda; "coperta" condiviso | §3.1 |
| Generazione del kit | Proposta poi conferma; la rigenerazione non tocca modello, manuali e ritoccate | §5 |
| Valutazioni di test esistenti | Dettaglio per risposta ricalcolato a richiesta | §3.2 |
| Avvisi di pianificazione | Nessuna email: riepilogo copiabile e file `.ics` | §3.1 |
| Round | Più round per candidatura | §3.1 |
| Intervistatori | Solo utenti dell'app | §3.1 |
| Registrazione e trascrizione | Fuori perimetro, Fase 5 | §6 |
| Nomi in codice e database | `Application` e `Assessment`; nessun vecchio nome residuo | §3.2 |
| Database di lavoro | Ramo Neon `development`; produzione intatta fino al rilascio | §3.4 |
| Migrazione | Prisma Migrate, dati conservati; stessa migrazione poi in produzione | §3.4 |

### 7.2 Regole della knowledge che il piano ribalta

Il design applica la knowledge come vincolo superiore al requisito: queste regole vanno aggiornate da `knowledge-builder` **prima** del design della fase indicata.

| Fase | Regola attuale | Diventa |
|---|---|---|
| 1 | Un update con `positionIds` sostituisce tutti i collegamenti | Diff; la rimozione porta a `withdrawn` |
| 1 | Stati del candidato; "nessun flusso li cambia automaticamente" | Fase sulla candidatura, avanzata anche dalle azioni |
| 1 | La prima posizione è la primaria (`isPrimary`) | Nessuna primaria |
| 1 | Il form pubblico crea sempre un candidato | Aggancia per email |
| 1 | Glossario: Interview = "Colloquio" | `Assessment` = "Test"; "Colloquio" è la conversazione |
| 1 | Simboli `Interview`, `CandidatePosition`, tag di cache `interviews` in tutti i documenti | `Assessment`, `Application` e relativi tag |
| 1 | Schema applicato con `db push` | Migrazioni versionate |
| 2 | Punteggio per risposta non salvato | Salvato in `answerEvaluations` |
| 3 | MAI filtri per utente | Eccezione limitata a note e schede degli intervistatori, e al filtro "i miei" |
| 3 | La generazione AI non salva mai | Invariata: vale anche per scheda, guida e kit |
| 4 | Formula della Dashboard valutazione con pesi fissi | Formula della pagina Decisione |

### 7.3 Ancora da definire nel design di fase

1. Testi rivolti al candidato: "Colloquio" compare in 31 file, inclusi messaggi `UserError` e pagine pubbliche. Decidere se il candidato legge "test" o "quiz". Il percorso pubblico `/recruiting/[token]` resta invariato.
2. Tag di cache, cascade e letture non in cache (pagina live, "Le mie azioni") per le nuove entità.
3. Collegamento della valutazione CV alla candidatura: `applicationId` diretto, come per il test, oppure via candidato + posizione.
4. Come `knowledge-builder` aggiorna `CONTEXT.md`, che non è nel catalogo della knowledge.
5. Piano di test e criteri di accettazione per fase.
6. Verifica legale: conservazione di note e schede (GDPR, diritto di accesso e cancellazione) e obblighi dell'AI Act per i sistemi di selezione del personale.

---

## 8. Prossimi passi quando si riprende

Si procede una fase alla volta, sempre nello stesso ordine:

1. **Knowledge, prima:** `knowledge-builder` aggiorna solo le regole che la fase ribalta (§7.2). Nessuna descrizione di entità non ancora scritte.
2. **Design:** workflow `DESIGN` dell'orchestrator sulla sola fase: schema Prisma, rotte, contratti delle server action, regole di cache invalidation, script di backfill.
3. **Implementazione** e validazione (`pnpm lint && pnpm test:run && pnpm build`).
4. **Knowledge, dopo:** `knowledge-builder` documenta dal codice reale le nuove entità e i nuovi termini (Candidatura, Test, Colloquio, Scheda di valutazione, Kit).

Tra il passo 1 e il passo 3 la knowledge è avanti rispetto al codice: i due passi vanno fatti sullo stesso branch e senza altri lavori in mezzo.

Prima di iniziare la Fase 1: unire a mano i candidati duplicati (§3.4, punto 1).
