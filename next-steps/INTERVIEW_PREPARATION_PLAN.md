# Preparazione al colloquio e flusso di selezione — Piano

**Data:** 15 novembre 2026
**Stato:** Proposta — da riprendere (nessun codice scritto)
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

---

## 3. Struttura dati

### 3.1 Entità nuove o modificate

**Application (Candidatura)** — evoluzione di `CandidatePosition` (stessa tabella, nuovi campi)
- esistenti: `candidateId`, `positionId`, `isPrimary`
- nuovi: `stage` (enum sopra), `stageChangedAt`, `ownerId` (recruiter responsabile)
- esito: `decision`, `decisionRationale`, `decidedBy`, `decidedAt`
- `Candidate.status` diventa derivato dalle candidature (o deprecato — vedi decisioni aperte)

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

L'AI propone i criteri da skill, soft skill e livello della posizione; il recruiter li modifica. Le 5 dimensioni della rubrica attuale diventano i criteri soft di default.

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
  - durante il colloquio: `covered`, `note`, `score` (1–5), `evidenceQuote`

**LiveInterview (Colloquio)** — la conversazione vera
- `applicationId`, `kitId`, `round`, `scheduledAt`, `durationMinutes`, `meetingUrl`
- `status`: `scheduled` · `in_progress` · `completed` · `cancelled`
- `startedAt`, `endedAt`
- fase successiva: `recordingConsent`, `transcript`, `aiSummary`
- **LiveInterviewParticipant**: `userId`, `role` (`lead` · `observer`)

**InterviewerFeedback (Scheda intervistatore)** — una per intervistatore × colloquio
- `liveInterviewId`, `interviewerId`, `hireRecommendation` (enum esistente), `notes`, `redFlags[]`, `standoutMoments[]`, `submittedAt`
- **CriterionScore**: `criterionId`, `score` (1–5), `evidence`
- **Regola di indipendenza:** le schede degli altri restano nascoste finché non hai inviato la tua.

### 3.2 Modifiche all'esistente

- `Interview` (test): aggiungere `applicationId` (backfill da candidato + `quiz.positionId`) e `answerScores` (JSON, punteggi per risposta salvati alla generazione della valutazione).
- `Evaluation` di tipo CV: collegamento alla candidatura via candidato + posizione; aggiungere `criteriaAssessment` (JSON per criterio della scheda).
- `BehavioralRubric` e campi hiring di `Evaluation` (`interviewNotes`, `redFlags`, `standoutMoments`, `hireRecommendation`, `nextSteps`): storico in sola lettura; i nuovi dati vanno in `InterviewerFeedback` / `CriterionScore`.
- **Terminologia UI:** quiz inviato → **"Test"**; **"Colloquio"** solo per la conversazione. Il codice può mantenere `Interview` per evitare una migrazione di massa. Richiede l'aggiornamento di `CONTEXT.md` e dei documenti in `knowledge/` tramite il ruolo `knowledge-builder`.

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
```

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
- Punteggio complessivo con i pesi della scheda (non più fissi).
- Riquadro AI "Avvocato del diavolo": motivi per cui la decisione potrebbe essere sbagliata.
- Form decisione (esito + motivazione) → avanza la fase.

**`/dashboard/agenda`** — colloqui pianificati, filtro "i miei", link diretti a prepara/live.

---

## 5. Generazione AI del kit

**Input**
- criteri della scheda (pesi, livelli attesi)
- modello di guida
- testo del CV (estrazione PDF esistente) e punti deboli della valutazione CV
- risposte del test con punteggio basso (richiede `answerScores`)
- schede dei round precedenti: criteri senza prove o con voti discordanti

**Output** (oggetto strutturato con `generateStructured`)
- `briefing`: 5 punti sul candidato
- `hypotheses[]`: `{ criterionId, hypothesis, howToVerify }`
- `items[]`: `{ text, followUps, criterionIds, origin, rationale, sourceRef }`
- `suggestedChecklist`

**Regole**
- Le domande del modello restano sempre (nucleo comune → candidati confrontabili); l'AI *aggiunge*, non sostituisce.
- Domande personalizzate al massimo il 30–40% del tempo.
- Non passare al modello dati come data di nascita o foto.
- Il promemoria legale (domande vietate: età, famiglia, figli, religione, salute — art. 8 Statuto dei Lavoratori, D.Lgs. 198/2006) è testo fisso, non generato.

---

## 6. Fasi di realizzazione

| Fase | Contenuto | Gap chiusi |
|---|---|---|
| **1. Candidatura come perno** | Fasi su `CandidatePosition`, pagina `/applications/[id]` con "Prossima azione", `applicationId` sul test, kanban nella posizione, home "Le mie azioni", rinomina UI "Colloqui" → "Test" | 1, 3, 4, 7 |
| **2. Scheda di valutazione e guide** | Scorecard per posizione (proposta AI), modelli di guida, salvataggio punteggi per risposta | 5, 6 (in parte) |
| **3. Kit e live** | Pianificazione, kit personalizzato AI, pagina preparazione, modalità live, scheda intervistatore | cuore della richiesta |
| **4. Decisione** | Pagina decisione con matrice, pesi dalla scheda, indipendenza intervistatori, avvocato del diavolo; rubrica ed evaluation-dashboard in sola lettura | 2, 6 |
| **5. Extra** | Registrazione/trascrizione con consenso + sintesi per criterio, guida di preparazione per il candidato, feedback dopo il rifiuto | — |

La fase 1 non usa l'AI ma è il prerequisito: senza candidatura non c'è dove agganciare kit, colloqui e decisione.

---

## 7. Decisioni aperte

1. **Round multipli per posizione** (es. tecnico + culturale) o un solo colloquio? Determina il peso del campo `round` e il riuso dei risultati tra round.
2. **Intervistatori tutti utenti dell'app?** Oggi ogni utente vede tutto. Per intervistatori esterni servirebbe un link limitato a kit + scheda.
3. **Registrazione e trascrizione** dentro o fuori perimetro? Implica consenso, conservazione dati (GDPR) e gestione di audio lunghi con Whisper.
4. **`Candidate.status`**: eliminarlo e derivarlo dalle candidature, o mantenerlo come stato anagrafico (es. "non ricontattare")?

---

## 8. Prossimi passi quando si riprende

1. Rispondere alle decisioni aperte (§7).
2. Trasformare la Fase 1 in un design dettagliato: schema Prisma, rotte, contratti delle server action, regole di cache invalidation.
3. Far aggiornare a `knowledge-builder` glossario (`CONTEXT.md`) e `knowledge/domain_model.md` per i nuovi termini (Candidatura, Test, Colloquio, Scheda di valutazione, Kit).
