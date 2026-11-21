# DevRecruit — Note interne del POC

Materiale di lavoro per chi presenta, verifica e sviluppa il POC. **Non è collegato dall'applicazione:** la guida per chi usa l'app è dentro il prodotto, alla pagina `/guida` (`app/guida` + `components/guide`).

---

## 1. Primo amministratore e deploy

`pnpm user:make-admin <email>` promuove ad amministratore un account già esistente: imposta ruolo `admin`, email verificata e account attivo (sbloccato se era bloccato); non crea mai account. Serve solo al primo amministratore: le altre registrazioni le verifica un amministratore dall'app, perché l'applicazione non invia email.

In produzione la procedura, nell'ordine, è:

1. `pnpm db:migrate:deploy` sul database di produzione;
2. `pnpm user:make-admin <email>` con il `DATABASE_URL` di produzione;
3. il deploy dell'applicazione.

Gli altri amministratori si nominano dall'app, in Impostazioni → Utenti.

---

## 2. Aree di miglioramento (osservate durante la verifica)

Questa sezione è deliberatamente schietta: serve a decidere cosa fare dopo il POC. Le voci sono emerse usando l'applicazione, non leggendo il codice.

### Attriti di flusso

| # | Osservazione | Impatto | Idee |
|---|---|---|---|
| 1 | **Nessuna email**: pianificazione e inviti passano da riepilogo copiabile e `.ics` | Alto in uso reale, accettabile in demo | Integrare invio email o calendario; conservare il riepilogo |
| 2 | **Le decisioni non hanno storico**: una nuova decisione sovrascrive esito, motivazione, utente, data e pesi | Alto per audit e GDPR | Tabella `ApplicationDecision` con storico e "decisione corrente" |
| 3 | **Indipendenza solo di vista**: le schede inviate sono leggibili da tutti e "Mostra" apre subito | Medio/alto per la correttezza del giudizio | Regola esplicita + traccia di chi ha aperto cosa; valutare blocco reale |
| 4 | **Nessun promemoria** per colloqui imminenti o kit non pronti: solo la dashboard | Medio | Notifiche in-app, digest, integrazione calendario |
| 5 | **Criterio archiviato non ripristinabile** dall'interfaccia | Basso/medio | Vista "Archiviati" con ripristino |
| 6 | **Stessa persona con due email**: l'email è unica, ma due indirizzi diversi creano due candidati e non esiste una fusione | Medio in import massivo | Procedura guidata di fusione in app |
| 7 | **Ruoli e accesso essenziali**: due soli ruoli (Utente / Amministratore) e ogni utente autenticato vede e modifica tutti i dati di selezione; senza email ogni nuova registrazione attende che un amministratore la verifichi e le password dimenticate si reimpostano a mano; non resta traccia di chi ha creato o modificato un utente | Medio se l'app esce dal POC | Ruoli per area; registro delle modifiche agli utenti; invio email per verifica e recupero password |
| 8 | **Il candidato non ha una guida di preparazione né feedback dopo il rifiuto** | Medio per l'esperienza | Fase 5 (`next-steps/FASE5_PLAN.md`) |

### Attriti di interfaccia

| # | Osservazione | Impatto | Idee |
|---|---|---|---|
| 9 | **Nessuna ricerca globale** tra candidati, posizioni e candidature | Medio con molti dati | Command palette (⌘K) |
| 10 | **Matrice della decisione larga**: su mobile richiede scroll orizzontale | Basso | Vista compatta o espansione per criterio |
| 11 | **La cronologia della candidatura non distingue i cambi di fase storici**: mostra solo la fase attuale | Basso/medio | Registrare gli eventi di fase |
| 12 | **Criteri senza domande non segnalati prima del colloquio**: l'avviso "N criteri senza domande" c'è nella guida di posizione, ma la preparazione del colloquio non lo mostra | Basso | Stesso avviso nella preparazione del colloquio ("3 criteri senza domande") |
| 13 | **Tabella della pipeline senza azioni multiple** (es. assegnare un responsabile a più candidature) | Basso/medio | Selezione multipla e azioni in blocco |
| 14 | **Stato della posizione "Chiusa" poco visibile** nelle liste: il filtro "Chiuse" c'è, ma l'etichetta nell'elenco è grigia e discreta | Basso | Etichetta più evidente |

### Attriti di contenuto e AI

| # | Osservazione | Impatto | Idee |
|---|---|---|---|
| 15 | **L'avvocato del diavolo non ha una soglia minima garantita** di motivi (il prompt ne chiede 3–5, il codice taglia a 5) | Basso | Validare il numero o mostrare un avviso |
| 16 | **I divieti legali sono solo nel prompt** (età, famiglia, religione, salute…) | Alto in uso reale | Controlli automatici sul testo delle domande + revisione |
| 17 | **Nessun registro delle chiamate AI** (modello, prompt, esito) per costi e audit | Medio/alto con l'AI Act | Log delle generazioni e delle conferme |
| 18 | **Il dettaglio per risposta può mancare** su una valutazione di test finché non si ricalcola a mano | Basso | Ricalcolo automatico in background |
| 19 | **Dati identificativi nei prompt**: sono già esclusi da kit e decisione, ma la trascrizione dei colloqui (Fase 5) riaprirà il tema | Da valutare con la Fase 5 | Anonimizzazione e consenso |

---

## 3. Cosa funziona già bene (da mostrare)

- La **"Prossima azione"** riduce la domanda "e adesso?" a un pulsante.
- La **matrice criteri × fonti** rende visibile il motivo di una decisione, non solo il voto.
- Le **proposte AI con conferma umana** sono coerenti in tutto il prodotto.
- La **scheda inviata blocca la modifica** e conserva l'indipendenza degli intervistatori.
- Il **kanban per posizione** e la pipeline globale coprono due modi di lavorare (per ruolo e per persona).

---

## 4. Percorso consigliato per la demo (10–12 minuti)

1. **Le mie azioni** — "ecco cosa aspetta il recruiter" (30 s).
2. **Posizione** — checklist di setup, scheda (criteri e pesi), guida (30–60 s).
3. **Candidatura di Giulia** — prossima azione, tab, cronologia delle prove (1 min).
4. **Test** — invio e valutazione AI con dettaglio per risposta (1 min).
5. **Colloqui** — pianificazione, kit, modalità live con copertura criteri (2 min).
6. **Scheda intervistatore** — invio bloccante e indipendenza (1 min).
7. **Decisione** — matrice, avvisi sui criteri indispensabili, avvocato del diavolo, registrazione (2–3 min).
8. **Kanban e agenda** — il colpo d'occhio operativo (1 min).
9. **Aree di miglioramento** — le 3 priorità che proponi (1–2 min).

---

**Manutenzione.** Questo documento raccoglie solo il materiale che non appartiene all'app. La guida operativa è la pagina `/guida`: quando cambia una pagina, una voce di menu, un'etichetta, una fase, una regola o un limite, si aggiorna lì, nello stesso commit; una schermata che non corrisponde più si rifà o si toglie.
