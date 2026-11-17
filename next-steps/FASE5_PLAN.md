# Fase 5 — Piano

**Data:** 17 novembre 2026
**Stato:** U realizzata e rilasciata in produzione. B, C e A da progettare.

## 0. Punto di partenza

L'applicazione si descrive com'è oggi, senza storia. Le fonti, in ordine di autorità:

1. **Codice** e `prisma/schema.prisma` (migrazioni versionate in `prisma/migrations`, baseline `0_init`).
2. **Knowledge** in `knowledge/` e vocabolario in `CONTEXT.md`.
3. **Guida operativa** in-app (`/guida`): come si usa l'app, pagina per pagina. Le aree di miglioramento (§11) sono nelle note interne `docs/guida-poc.md`.

Flusso attuale in una riga: Posizione (scheda di valutazione, quiz, guide colloquio) → Candidatura (fasi, prossima azione) → prove (CV, Test, Colloqui con kit, live e schede intervistatore) → Decisione (matrice criteri × fonti, pesi della scheda, avvocato del diavolo) → esito.

---

## 1. Perimetro della Fase 5

Quattro funzioni, realizzate una alla volta con un proprio design: U è rilasciata, restano B, C e A.

| # | Funzione | Valore | Dipende dalla verifica legale | Stato |
|---|---|---|---|---|
| U | **Gestione utenti e amministratori** | Controllo su chi accede all'app; prerequisito per uscire dal POC | No | Rilasciata |
| B | **Guida di preparazione per il candidato** | Esperienza del candidato, colloqui più confrontabili | Poco | Da progettare |
| C | **Feedback al candidato dopo il rifiuto** | Esperienza del candidato, reputazione | Sì (cosa si può comunicare) | Da progettare |
| A | **Registrazione e trascrizione del colloquio** con consenso, più **sintesi AI per criterio** | Prove più ricche e meno lavoro manuale per gli intervistatori | Sì, fortemente | Da progettare |

Ordine: **B → C → A**. U è già rilasciata e ha chiuso il rischio di accesso. B non tocca dati personali nuovi e chiarisce il canale verso il candidato, che serve anche a C. A è la più rischiosa (audio, dati personali, AI Act) e va fatta per ultima, dopo la verifica legale.

### 1.U Gestione utenti e amministratori (rilasciata)

**Com'è oggi.**

- Login e logout con email e password (sessioni di 7 giorni, massimo 30). La registrazione pubblica `/auth/sign-up` è aperta; l'app non invia email.
- Ruoli `user` e `admin`. Solo gli amministratori vedono e raggiungono **Impostazioni → Utenti** (`/dashboard/settings/users`); ogni utente autenticato, amministratore o no, legge e modifica tutti i dati di selezione.
- **Elenco**: ricerca per nome o email, ruolo, email verificata, stato, data di creazione, ultimo accesso e sessioni attive. **Nuovo utente** con nome, cognome, email, password iniziale, ruolo ed "Email verificata".
- **Dettaglio**: dati, ruolo, interruttore "Email verificata", reimposta password, blocca/sblocca con motivo (chiude le sessioni), elenco sessioni con chiusura singola o totale.
- **Regole**: resta sempre almeno un amministratore attivo; nessuno blocca sé stesso né cambia il proprio ruolo o la verifica della propria email; gli utenti non si eliminano, si bloccano; un bloccato non compare tra i partecipanti selezionabili.
- **Accesso**: `requireAdmin()` e `requireAdminPage()` accanto a `requireUser()`; le server action usano il plugin `admin` di better-auth dentro `runAction`, con messaggi in italiano. Menu e voci "Utenti" filtrati per ruolo solo come presentazione.
- **Cache**: tag `users`, invalidato da ogni modifica a un utente (creazione, nome, email, ruolo, verifica, blocco, sblocco).
- **Ultimo accesso**: `lastLoginAt` sulla tabella `user`, aggiornato al login; migrazione `20261117142129_user_last_login_at`.
- **Primo amministratore**: `pnpm user:make-admin <email>` promuove un account esistente (email verificata, account attivo), senza crearlo. Già eseguito in produzione; gli altri amministratori si nominano dall'app.

Limiti rimasti aperti: vedi §4.

Rilascio avvenuto il 17 novembre 2026: migrazione applicata al ramo Neon `production`, amministratori impostati, applicazione distribuita. Verifica manuale end-to-end superata in produzione, incluso il giro utenti (registrazione in attesa, verifica, nuovo utente, blocco e sessioni).

### 1.A Registrazione, trascrizione e sintesi per criterio

Requisito di massima:
- Il colloquio (`Interview`) può avere una registrazione audio, caricata dopo il colloquio o registrata nella modalità live, **solo con il consenso** del candidato registrato nell'app.
- La trascrizione si genera dall'audio; la sintesi AI propone, per ogni criterio della scheda coperto, un voto 1–5 e le evidenze (citazioni) dalla trascrizione.
- La sintesi è una **proposta**: si conferma, si modifica o si scarta. Nulla entra nella matrice della Decisione senza conferma umana.
- Campi previsti sul colloquio: `recordingConsent` (con data e chi l'ha raccolto), `transcript`, `aiSummary`.

Da decidere nel design:
1. Dove si conserva l'audio (R2? bucket separato?), per quanto tempo, come si cancella: con la candidatura, con il candidato, a richiesta, a scadenza.
2. Come si raccoglie, si mostra e si revoca il consenso; cosa succede a un colloquio senza consenso (nessuna registrazione, solo note).
3. Dove entra la sintesi: pre-compilazione della scheda intervistatore (come oggi fanno le note live) oppure fonte separata nella pagina Decisione.
4. Regola d'indipendenza: trascrizione e sintesi sono materiale "non inviato"? Chi le vede prima dell'invio delle schede?
5. Limiti del provider di trascrizione: oggi `transcribeAudio` accetta solo file sotto `MAX_AUDIO_BYTES` (pensato per le risposte brevi del test). Un colloquio di 45–60 minuti richiede suddivisione in parti o un altro percorso.
6. Prompt della sintesi: la trascrizione contiene nomi e dati del candidato e degli intervistatori. Serve una regola di anonimizzazione prima del modello (vedi §3).
7. Tag di cache delle nuove entità o dei nuovi campi.

### 1.B Guida di preparazione per il candidato

Requisito di massima:
- Per un colloquio pianificato, il recruiter genera (AI, poi conferma) o scrive una guida per il candidato: formato e durata, argomenti generali, cosa preparare, logistica, chi incontrerà.
- Non rivela domande, ancore o criteri di valutazione.
- Il candidato la legge senza account, come oggi fa con il test su `/recruiting/[token]`.

Da decidere nel design:
1. **Canale.** Oggi l'app **non invia email** (regola in knowledge: il riepilogo e il `.ics` si condividono a mano). Opzioni: pagina pubblica con token da condividere a mano (coerente con oggi) oppure invio email (cambia la regola, serve un provider).
2. Una guida per colloquio o per candidatura (più round).
3. Contenuto generato da cosa: guida colloquio della posizione, descrizione della posizione, checklist del kit. Mai dati di altri candidati.
4. Scadenza e revoca del link.

### 1.C Feedback dopo il rifiuto

Requisito di massima:
- Quando la candidatura passa a **Scartato**, il recruiter può preparare un feedback per il candidato: proposta AI dai criteri e dalle prove, poi revisione e conferma umana obbligatoria.
- Mai il testo libero degli intervistatori senza revisione; mai riferimenti a caratteristiche protette (età, famiglia, figli, religione, opinioni politiche, salute).

Da decidere nel design:
1. Canale (lo stesso di 1.B).
2. Da quali dati nasce la proposta: punteggi per criterio della Decisione, motivazione della decisione, punti di forza del CV e del test.
3. Se il feedback si salva sulla candidatura (testo inviato, data, autore) e se è modificabile dopo la condivisione.
4. Cosa succede se la candidatura viene riaperta dopo il feedback.

---

## 2. Prerequisito bloccante: verifica legale

Ancora aperta e mai fatta. Da chiudere **prima del design di A e C**, prima del rilascio per B.

Temi:
- **GDPR**: base giuridica e informativa per CV, note, schede, trascrizioni e audio; tempi di conservazione; diritto di accesso, rettifica e cancellazione (oggi la cancellazione è solo a cascata eliminando candidato o candidatura); esportazione dei dati del candidato.
- **AI Act**: i sistemi di IA usati nella selezione del personale sono ad alto rischio. Oggi l'AI propone criteri, quiz, guide, valutazioni CV e test, kit e avvocato del diavolo; la decisione è sempre umana. Servono: registro delle chiamate AI, trasparenza verso il candidato, supervisione umana documentata.
- **Registrazione dei colloqui**: consenso informato, revoca, conservazione e cancellazione dell'audio.
- **Feedback**: cosa si può e non si può comunicare al candidato scartato.
- **Domande vietate** (art. 8 Statuto dei Lavoratori, D.Lgs. 198/2006): oggi il divieto è solo nel prompt e in un promemoria fisso; nessun controllo automatico sul testo generato.

Misure già in essere, da far valutare:
- minimizzazione nei prompt: kit e avvocato del diavolo non ricevono nome, email, data di nascita, foto o URL del CV; dai colloqui arrivano solo statistiche per criterio;
- `redactBirthDate` + `sanitizeInput` sul testo del CV;
- conferma umana di ogni proposta AI;
- cancellazione a cascata con candidato o candidatura; nessuna conservazione automatica a scadenza.

---

## 3. Gap della knowledge

Da affidare a `knowledge-builder` **prima** del design della funzione che li tocca (regole che la funzione ribalta) o subito (lacune generali).

### 3.1 Regole che la Fase 5 può ribaltare

Le righe della funzione U sono chiuse: la knowledge descrive già ruolo `admin`, tag `users`, verifica manuale e assenza di email.

| Regola attuale (dove) | Funzione | Cosa decidere |
|---|---|---|
| "No email is sent: the summary and the `.ics` are shared by hand" (`knowledge/domain_model.md`, interviews) | B, C | Se resta: canale a link pubblico con token. Se cade: nuova regola su invio e provider |
| Prompt non identificativi e solo statistiche dai colloqui (`knowledge/ai_generation.md`, "Non-identifying and statistics-only prompts") | A | Regola di anonimizzazione della trascrizione prima della sintesi |
| Trascrizione solo per le risposte del test, sotto `MAX_AUDIO_BYTES`, azione pubblica con token (`knowledge/ai_generation.md`, `knowledge/server_actions.md`) | A | Nuovo percorso per audio lunghi e autenticato |
| "NEVER save an AI proposal without the user's confirmation" (`knowledge/domain_model.md`) | A, B, C | Invariata: va solo estesa alle nuove proposte |
| Indipendenza: materiale non inviato visibile solo all'autore, viste chiuse ma mai letture filtrate (`knowledge/domain_model.md`, access) | A | Se trascrizione e sintesi seguono la stessa regola |
| Accesso: ogni utente legge e modifica tutto, nessun filtro per utente (`knowledge/domain_model.md`) | A | Se audio e trascrizioni richiedono un'eccezione |

### 3.2 Lacune generali (da colmare comunque)

- **Ambienti e storage.** La knowledge non descrive gli ambienti: ramo Neon `production` (produzione) e `development` (sviluppo, `DATABASE_URL` in `.env.local`), e soprattutto che **i CV stanno in un unico bucket R2 condiviso tra sviluppo e produzione**. Con i due database che puntano agli stessi file, eliminare un candidato in uno dei due ambienti cancella il CV anche nell'altro. Da documentare e, meglio, da risolvere con un bucket o un prefisso per ambiente.
- **Conservazione e cancellazione dei dati** (GDPR): nessuna regola scritta, oltre alle cascate.
- **Registro delle chiamate AI**: non esiste, né come codice né come regola.
- **Guida operativa**: la knowledge non la nomina. La regola di manutenzione è in `AGENTS.md` (sezione Documentation); `knowledge-builder` può valutare se citarla.

---

## 4. Punti aperti già noti (backlog, fuori dal perimetro B, C, A)

Da valutare insieme alle aree di miglioramento delle note interne del POC (`docs/guida-poc.md` §2), senza duplicarle qui.

**Limiti noti del comportamento attuale:**
- Non resta traccia di chi crea o modifica un utente, né dei blocchi: nessun registro delle modifiche.
- Togliere la verifica email o reimpostare la password non chiude le sessioni aperte.
- Due soli ruoli (Utente / Amministratore), nessun permesso per area; ogni utente autenticato vede e modifica tutti i dati di selezione.
- Nessuna email: la verifica dell'email e il recupero password passano a mano da un amministratore.
- `redactBirthDate` toglie una data solo se preceduta sulla stessa riga da un marcatore ("nato il", "data di nascita", "DOB"…).
- Un criterio archiviato non si può ripristinare; l'id di un criterio eliminato resta sui collegamenti di un quiz finché il quiz non si salva di nuovo (ogni lettura lo ignora).
- Esiste una sola valutazione CV per candidato e posizione: non si rigenera (409).
- Del dettaglio per risposta si salvano punteggio, punti di forza e aree di miglioramento; il paragrafo "Valutazione AI" si vede solo nella sessione in cui è stato generato.
- Il segno "Coperta" arriva agli altri partecipanti con l'aggiornamento periodico (15 secondi, scheda del browser visibile, colloquio in corso); vale l'ultima scrittura.
- Una scheda intervistatore inviata non si riapre.
- Un partecipante con note o scheda non si toglie dal colloquio.
- La tab Decisione nasconde punteggio e avvisi a chi deve ancora inviare la scheda, ma non ha "Mostra" (la vista completa è nella pagina Decisione).
- L'avvocato del diavolo non scarta una risposta con meno di 3 motivi.
- Una nuova decisione sovrascrive la precedente: nessuno storico delle decisioni.
- Un criterio creato dopo la decisione compare senza peso ("—") ed è escluso dal punteggio salvato.
- Etichette dell'esito: "Offerta / Assunto / Scartato" nel form, "Offerta / Assunzione / Scarto" nel prompt dell'avvocato del diavolo.
- Una valutazione CV senza `fitScore` non mostra la riga globale del CV (i voti per criterio restano).

**Infrastruttura:**
- Nessun shadow database: `prisma migrate diff --from-migrations` non si può eseguire. Configurare `shadowDatabaseUrl` (per esempio un ramo Neon dedicato).
- Bucket R2 condiviso tra ambienti (vedi §3.2).

---

## 5. Metodo, per ogni funzione (B, C, A)

1. **Verifica legale** chiusa per la funzione (§2).
2. **Knowledge, prima:** `knowledge-builder` aggiorna solo le regole di §3.1 che la funzione ribalta. Nessuna descrizione di entità non ancora scritte.
3. **Design:** orchestrator, workflow `DESIGN`, sulla sola funzione: schema Prisma, rotte, contratti delle server action, cache invalidation, prompt AI.
4. **Implementazione** e validazione: `pnpm lint && pnpm test:run && pnpm build`. Ogni modifica dello schema è una migrazione versionata (`pnpm db:migrate` su `development`, mai `db push`).
5. **Knowledge, dopo:** `knowledge-builder` documenta dal codice reale le nuove entità, regole e termini (incluso `CONTEXT.md`).
6. **Guida operativa:** aggiornare la guida in-app `/guida` nello stesso commit (regola in `AGENTS.md`).
7. **Chiusura:** aggiornare questo piano (stato della funzione, punti aperti). I documenti di lavoro della funzione (criteri di accettazione, delta per la knowledge) si eliminano dopo il rilascio: la verità resta nel codice, nella knowledge e nella guida.
8. **Rilascio:** `pnpm db:migrate:deploy` sul database di produzione, poi `pnpm exec prisma migrate status`, quindi il deploy dell'applicazione e la verifica del percorso demo (`docs/guida-poc.md` §4).

Il prompt per avviare il lavoro è in `next-steps/FASE5_PROMPT.md`.
