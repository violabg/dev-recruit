# Fase 5 — Prompt di avvio

Prompt pronti da incollare, uno per sessione. Ogni sessione lavora su **una sola funzione** della Fase 5 (`next-steps/FASE5_PLAN.md` §1). Ordine consigliato: B → C → A.

Prima di ogni sessione di design:
- la verifica legale della funzione è chiusa (piano §2), o lo sviluppatore ha deciso esplicitamente di procedere con le misure in essere;
- `knowledge-builder` ha aggiornato le regole che la funzione ribalta (piano §3.1);
- il branch è creato da `main` aggiornato, e `DATABASE_URL` punta al ramo Neon `development`.

---

## 1. Knowledge, prima (ruolo `knowledge-builder`)

> Aggiorna la knowledge per la funzione **<A | B | C>** della Fase 5 descritta in `next-steps/FASE5_PLAN.md`. Applica solo le regole della tabella §3.1 che riguardano questa funzione, con le decisioni seguenti: <decisioni dello sviluppatore, una per riga>. Colma anche le lacune generali di §3.2 che conosci dal codice (ambienti, bucket R2 condiviso). Non descrivere entità, pagine o azioni che non esistono ancora. Aggiorna `CONTEXT.md` solo per i termini che cambiano significato.

## 2. Design e implementazione (ruolo `orchestrator`, workflow `DESIGN`)

### Funzione B — Guida di preparazione per il candidato

> Progetta e realizza la funzione **B** della Fase 5 (`next-steps/FASE5_PLAN.md` §1.B): una guida di preparazione per il candidato, per ogni colloquio pianificato, proposta dall'AI e confermata dal recruiter, leggibile dal candidato senza account. Parti dall'applicazione com'è oggi: codice, knowledge, `CONTEXT.md` e la guida operativa `docs/guida-operativa.md` (colloqui, kit, pagine pubbliche `/recruiting`). Chiudi nel design i punti "Da decidere" di §1.B, a partire dal canale verso il candidato, rispettando la regola attuale "nessuna email" salvo decisione contraria dello sviluppatore. La guida non rivela domande, ancore o criteri. Vincoli: proposta AI salvata solo dopo conferma; testi in italiano; nessun dato di altri candidati nel prompt; ogni modifica dello schema è una migrazione versionata (`pnpm db:migrate`, mai `db push`); tag di cache per le nuove entità. Valida con `pnpm lint && pnpm test:run && pnpm build`. Alla fine aggiorna `docs/guida-operativa.md` e `docs/guida-operativa.html` e riporta i punti della knowledge diventati stantii per `knowledge-builder`.

### Funzione C — Feedback dopo il rifiuto

> Progetta e realizza la funzione **C** della Fase 5 (`next-steps/FASE5_PLAN.md` §1.C): quando una candidatura è Scartata, il recruiter prepara un feedback per il candidato a partire da una proposta AI basata sulle prove per criterio e sulla motivazione della decisione, lo rivede e lo conferma. Parti dall'applicazione com'è oggi (pagina Decisione, matrice criteri × fonti, `Application.decision`) e dal canale verso il candidato scelto per la funzione B. Chiudi nel design i punti "Da decidere" di §1.C. Vincoli: mai testo libero degli intervistatori senza revisione; nessun riferimento a età, famiglia, figli, religione, opinioni politiche o salute, con un controllo e non solo il prompt; proposta AI salvata solo dopo conferma; prompt senza dati identificativi; migrazioni versionate; tag di cache. Valida con `pnpm lint && pnpm test:run && pnpm build`. Alla fine aggiorna la guida operativa (`.md` e `.html`) e riporta i punti della knowledge diventati stantii.

### Funzione A — Registrazione, trascrizione e sintesi per criterio

> Progetta e realizza la funzione **A** della Fase 5 (`next-steps/FASE5_PLAN.md` §1.A): registrazione audio del colloquio con consenso del candidato, trascrizione e sintesi AI per criterio della scheda di valutazione. Parti dall'applicazione com'è oggi (colloqui, modalità live, schede intervistatore, pagina Decisione, `transcribeAudio`). Chiudi nel design i punti "Da decidere" di §1.A con l'esito della verifica legale (§2): conservazione e cancellazione dell'audio, raccolta e revoca del consenso, audio lunghi oltre `MAX_AUDIO_BYTES`, anonimizzazione della trascrizione prima del modello, posto della sintesi (pre-compilazione della scheda o fonte nella Decisione), regola d'indipendenza. Vincoli: senza consenso nessuna registrazione; la sintesi è una proposta e non entra nella Decisione senza conferma umana; migrazioni versionate; tag di cache; audio mai in un percorso pubblico. Valida con `pnpm lint && pnpm test:run && pnpm build`. Alla fine aggiorna la guida operativa (`.md` e `.html`) e riporta i punti della knowledge diventati stantii.

## 3. Knowledge, dopo (ruolo `knowledge-builder`)

> Documenta dal codice reale la funzione **<A | B | C>** della Fase 5 appena realizzata: nuove entità, azioni, regole, cache e prompt, e i termini nuovi in `CONTEXT.md`. Sostituisci ogni affermazione superata; non lasciare riferimenti a fasi o a com'era prima.

## 4. Chiusura

- Aggiorna `next-steps/FASE5_PLAN.md`: stato della funzione, punti aperti nuovi o chiusi.
- Elimina i documenti di lavoro della funzione (accettazione, delta) dopo il rilascio.
- Al rilascio: `pnpm db:migrate:deploy` sul database di produzione, poi `pnpm exec prisma migrate status`.
