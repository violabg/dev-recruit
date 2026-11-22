# Assistente esterno (MCP)

dev-recruit espone un server MCP su `/api/mcp`: un assistente (Claude su claude.ai, Claude desktop o Cowork, e VS Code Copilot) legge i dati della selezione e prepara bozze, mentre il ragionamento lo fa il modello del client. dev-recruit resta il sistema di record: ogni scrittura passa dai servizi della dashboard e ogni bozza la conferma una persona.

Questo documento descrive cosa si può fare oggi, come si collega un client e come si amministra l'accesso. Il plugin pronto per l'installazione è in `plugin/dev-recruit`; la sua presentazione per chi lo usa è in `plugin/dev-recruit/README.md`.

## 1. Cosa si può fare

### Lettura

L'assistente vede gli stessi dati della dashboard, con gli stessi limiti: le valutazioni sono indicative, la decisione nascosta resta nascosta finché un intervistatore non invia la propria scheda, e un record inesistente dà un messaggio di errore senza esporre altri dati.

- **Le mie azioni**: posizioni con setup incompleto, test da valutare, colloqui senza kit pronto, schede da compilare, candidature ferme da più di 7 giorni. Per impostazione predefinita solo il lavoro dell'utente.
- **Posizioni**: elenco filtrabile per titolo e stato (20 per pagina), dettaglio con setup mancante e candidature per fase.
- **Candidature**: dettaglio con fase, valutazioni, decisione e colloqui. Il testo del CV arriva solo se lo si chiede esplicitamente.
- **Colloqui**: elenco per agenda o per candidatura, filtrabile per data e per partecipazione; preparazione del colloquio con briefing, sezioni, domande, criteri, ipotesi e checklist.
- **Pianificazione**: guide della posizione, persone del team, prossimo round e proposte in attesa.
- **Kit modificabile**: sezioni, domande, criteri e checklist con i loro id, per preparare una modifica.

### Bozze, proposte e conferma

L'assistente non pubblica, non pianifica e non salva da solo: prepara una bozza, che una persona conferma con il pulsante del riquadro. Nei client senza riquadri, posizione, proposta di colloquio e kit si confermano dalla dashboard.

- **Posizione**: modulo precompilato nel riquadro (`open_position_form`), oppure bozza creata in chat (`create_position_draft`); si pubblica dal riquadro o dalla pagina della posizione.
- **Quiz**: parametri di generazione nel riquadro (`open_quiz_form`), domande scritte dall'assistente e mostrate in anteprima (`save_quiz_draft`); il salvataggio (`save_quiz`) avviene solo dal riquadro e non invita nessun candidato.
- **Colloquio**: modulo di pianificazione precompilato (`open_schedule_form`), oppure proposta in attesa (`propose_interview_slot`); la conferma crea colloquio e kit in bozza e non invia email. La proposta resta anche nel tab Colloqui della candidatura, con **Pianifica** e **Scarta**.
- **Kit**: modifica voce per voce (`save_interview_kit_draft`); le domande non indicate restano, il kit resta in bozza e si segna pronto con `publish_draft` dal riquadro o dalla pagina di preparazione.

### Cosa resta solo nella dashboard

Decisioni finali, eliminazioni, messaggi e inviti ai candidati, assegnazione dei test, gestione utenti, preset, dati di riferimento, automazioni, kanban e azioni massive, generazione AI dell'app, cambi di fase e di responsabile. Nessuno strumento invia email, inviti o messaggi.

## 2. Come si collega un client

### Requisiti

- Un account dev-recruit **abilitato da un amministratore**: email verificata, account non bloccato, accesso MCP attivo per l'utente e a livello globale.
- Un client che supporti un server MCP remoto via HTTPS e OAuth: claude.ai, Claude desktop, Cowork o VS Code Copilot.
- Per i dati dei candidati reali, un piano aziendale con accordo sul trattamento dei dati: vedi §7.

Senza account e senza autorizzazione il plugin non dà accesso a nessun dato: installarlo non esegue nulla sul computer e non contiene credenziali.

### Claude (claude.ai, desktop, Cowork)

- L'amministratore dell'organizzazione aggiunge il marketplace del repository (`.claude-plugin/marketplace.json`) oppure carica il plugin come archivio di `plugin/dev-recruit`; può renderlo installato per tutti i recruiter.
- In alternativa si aggiunge un connettore personalizzato con l'indirizzo del server MCP: è il valore `url` di `plugin/dev-recruit/.mcp.json` (oggi `https://dev-recruit-rho.vercel.app/api/mcp`).

### VS Code Copilot

- Si installa il plugin dall'URL git del repository o dal marketplace dell'organizzazione.
- L'amministratore può limitare i server MCP consentiti all'indirizzo di dev-recruit.
- Se VS Code non usa la registrazione dinamica, si usa il client pubblico pre-registrato `dev-recruit-vscode`, creato da `pnpm mcp:register-clients`; nell'editor il server si configura con `oauthClientId` uguale a quell'id.
- I riquadri richiedono l'opzione `chat.mcp.apps.enabled`; senza riquadri restano il testo e la conferma dalla dashboard (tranne il salvataggio del quiz).

### Primo collegamento

1. Alla prima chiamata a uno strumento, il client apre la pagina di accesso di dev-recruit.
2. Si accede con il proprio account dev-recruit.
3. Nella schermata di consenso si controllano client, permessi e account, poi si sceglie **Consenti** o **Rifiuta**.
4. Se l'account non è abilitato, la pagina dice "Account non abilitato: chiedi a un amministratore di attivarlo." e non mostra i pulsanti.

Permessi richiesti:

| Permesso | Cosa consente |
|---|---|
| `recruit:read` | Leggere i dati della selezione |
| `recruit:draft` | Preparare bozze: posizione in bozza, anteprima e salvataggio di un quiz, proposta di colloquio, modifiche al kit in bozza |
| `recruit:write` | Confermare una bozza: pubblicare una posizione, pianificare un colloquio proposto, segnare pronto un kit |

Un amministratore può revocare il collegamento dalla pagina "Accesso MCP": il client dovrà autorizzarsi di nuovo. Un account bloccato o disattivato perde l'accesso alla chiamata successiva.

## 3. Strumenti

### Sola lettura (`recruit:read`)

| Strumento | Cosa restituisce |
|---|---|
| `action_center` | "Le mie azioni", con solo il lavoro dell'utente per impostazione predefinita |
| `list_positions` | Posizioni filtrabili per titolo e stato, 20 per pagina |
| `get_position` | Una posizione: descrizione, competenze, setup mancante, candidature per fase |
| `get_application` | Una candidatura: fase, valutazioni indicative, decisione, colloqui; CV solo con `includeCv: true` |
| `list_interviews` | Colloqui pianificati e in corso, per agenda o per candidatura |
| `get_interview` | Preparazione di un colloquio, senza identità del candidato né CV |
| `get_scheduling_options` | Guide, persone del team, prossimo round e proposte in attesa |
| `get_interview_kit` | Struttura modificabile del kit, con gli id da usare nella modifica |
| `get_workflow` | I passi di una procedura; non legge dati della selezione |

### Bozze (`recruit:draft`)

| Strumento | Cosa fa |
|---|---|
| `open_position_form` | Apre il modulo della nuova posizione nel riquadro; non crea nulla |
| `create_position_draft` | Crea una posizione in bozza |
| `open_quiz_form` | Apre i parametri del quiz nel riquadro; non crea nulla |
| `save_quiz_draft` | Mostra l'anteprima del quiz; non salva e non invita nessuno |
| `save_quiz` | Salva il quiz dell'anteprima; solo dal pulsante del riquadro |
| `open_schedule_form` | Apre il modulo di pianificazione nel riquadro; non crea nulla |
| `propose_interview_slot` | Salva una proposta di colloquio in attesa; non pianifica e non invia email |
| `save_interview_kit_draft` | Modifica il kit in bozza; il kit resta in bozza |

### Conferma (`recruit:write`)

| Strumento | Cosa fa |
|---|---|
| `publish_draft` | Conferma una bozza: pubblica una posizione, pianifica una proposta di colloquio o segna pronto un kit. Solo dal pulsante del riquadro |

I due strumenti di conferma (`save_quiz`, `publish_draft`) sono nascosti al modello: li può chiamare solo il riquadro. Permessi e regole sono comunque ricontrollati sul server a ogni chiamata.

## 4. Procedure guidate

Le procedure vivono sul server, in `lib/mcp/workflows/`: nome, titolo, quando usarle e passi in italiano. Il client le offre in due modi:

- come **prompt MCP**, scelti dal menu del connettore o dai comandi del client, con un argomento facoltativo `richiesta`;
- tramite `get_workflow`, che il modello chiama prima di un'attività.

Il plugin contiene una skill per procedura (`plugin/dev-recruit/skills/<nome>/SKILL.md`): riconosce la richiesta e chiede i passi al server. Le skill si rigenerano con `pnpm build:plugin-skills` quando cambiano nome, descrizione o riga "quando".

| Procedura | Quando si usa |
|---|---|
| `action-center` | Cosa aspetta oggi, qual è il prossimo passo |
| `create-position` | Preparare una nuova posizione |
| `quiz-for-candidate` | Creare un quiz tecnico per una posizione |
| `schedule-interview` | Fissare o organizzare un colloquio |
| `interview-kit` | Preparare, completare o migliorare il kit |
| `interview-prep` | Prepararsi a condurre o seguire un colloquio |

## 5. Riquadri

Otto riquadri (MCP Apps) mostrano i dati in forma interattiva dove il client li supporta. Ogni strumento restituisce comunque il testo completo, quindi un client senza riquadri non perde nulla.

| Strumento | Riquadro |
|---|---|
| `action_center` | Le mie azioni: totale, riepilogo per coda, righe con "Apri" e "Dettagli" |
| `get_position` | Posizione: stato, candidature per fase, setup con "Completa", competenze |
| `get_application` | Candidatura: fasi, valutazioni, decisione, colloqui |
| `get_interview` | Preparazione: scaletta, briefing, ipotesi, domande con approfondimenti, checklist |
| `open_position_form` | Nuova posizione: gli stessi campi della dashboard, precompilati |
| `open_quiz_form` | Nuovo quiz: i parametri di generazione della dashboard, senza scelta del modello |
| `open_schedule_form` | Nuovo colloquio: gli stessi campi della pianificazione, precompilati |
| `create_position_draft`, `save_quiz_draft`, `save_quiz`, `propose_interview_slot`, `save_interview_kit_draft`, `publish_draft` | Anteprima bozza: contenuto, cosa fa la conferma, pulsante di conferma |

I riquadri non hanno origini esterne (CSP vuota), inseriscono il testo solo come testo e non ricevono mai il CV. "Apri" apre la dashboard tramite il client; "Dettagli" manda una richiesta di follow-up all'assistente. I moduli raccontano all'assistente cosa è stato salvato.

I bundle sono generati da `mcp-apps/` con `pnpm build:mcp-apps` e scritti in `lib/mcp/widgets/*.generated.ts`; `pnpm build` li rigenera prima della build di Next.js. Dopo una modifica a `mcp-apps/`, a un componente condiviso che usano o a `app/theme.css`, si rigenerano e si committano.

## 6. Amministrazione

Solo amministratori: **Impostazioni → Utenti → Accesso MCP**, pagina `/dashboard/settings/mcp` (chi non è amministratore riceve la pagina non trovata). Tre tab:

- **Token attivi**: le concessioni attive, con utente, client, permessi, data di rilascio e scadenza; **Revoca** elimina l'intera concessione (access e refresh token, consenso) e il client deve autorizzarsi di nuovo.
- **Interruttori**: l'interruttore globale "MCP attivo per tutti" (acceso per impostazione predefinita) e quello per utente "MCP disattivato". Spegnere un utente revoca anche i suoi token. Con MCP spento, ogni chiamata riceve `access_disabled` (403). Un account bloccato perde l'accesso e i token vengono revocati.
- **Registro**: una riga per ogni chiamata, riuscita, fallita o negata, dalla più recente, 50 per pagina. Data, utente, client, strumento, esito e riepilogo. L'indirizzo accetta i parametri `user`, `tool` e `page` per filtrare e sfogliare. Il testo libero dei candidati non finisce nel registro e gli argomenti sono limitati a 4 KB.

Limiti del server:

| Limite | Valore |
|---|---|
| Chiamate per utente | 60 al minuto |
| Chiamate per IP | 120 al minuto |
| Endpoint OAuth per IP e per utente | 20 al minuto |
| Corpo di una richiesta MCP | 256 KB |
| Corpo di una richiesta OAuth | 16 KB |
| Durata massima di una richiesta | 60 secondi |
| Access token | 15 minuti, JWT legato a `/api/mcp` |
| Refresh token | 30 giorni, con rotazione |

L'endpoint è Streamable HTTP senza stato: solo `POST`; `GET` e `DELETE` rispondono `405`. Non usa cookie di sessione: ogni richiesta porta il token OAuth.

## 7. Dati e privacy

- **Minimo necessario**: nessun CV completo se non lo si chiede; preparazione e kit del colloquio senza identità del candidato né CV; i riquadri non ricevono mai il CV.
- **Testo dei candidati**: CV, risposte e note arrivano delimitati (`<cv>`, `<candidate_answer>`, `<candidate_note>`) e marcati come dati non attendibili, mai come istruzioni.
- **Nessun invio**: nessuno strumento manda email, inviti o messaggi ai candidati. Non chiama nemmeno la generazione AI dell'app: il modello è quello del client.
- **Decisione nascosta**: finché un intervistatore non invia la scheda, punteggio e matrice della decisione restano nascosti anche all'assistente.
- **Chi può collegarsi**: solo il personale con un account dev-recruit abilitato. I candidati non sono utenti e non si collegano. I permessi OAuth limitano il token, non l'utente o il ruolo.
- **Dati finti nel POC**: oggi il prodotto contiene solo candidati inventati, quindi va bene qualsiasi piano Claude. Prima dei dati reali servono un piano Claude Team o Enterprise con accordo sul trattamento dei dati (DPA) e, per VS Code, Copilot Business o Enterprise con i termini dell'organizzazione. La generazione AI dentro l'app usa modelli Groq del piano gratuito ed è un canale separato: la scelta del fornitore per i dati reali è del committente.
- **Registro**: gli argomenti delle chiamate sono ripuliti dal testo libero dei candidati (`cv`, `answer`, `notes`, `text`, `briefing`, `hypotheses`, …) prima di essere salvati; un errore di scrittura del registro non cambia la risposta dello strumento.

## 8. Ambiente e pubblicazione

- **URL**: `NEXT_PUBLIC_APP_URL` determina endpoint MCP, issuer OAuth e link nelle risposte. Dopo averlo cambiato si riavvia l'app; lato applicazione non serve altro, mentre il plugin ha il proprio indirizzo nel file qui sotto.
- **Database**: le migrazioni creano le tabelle OAuth e il registro; in produzione si applicano con `pnpm db:migrate:deploy`.
- **Client VS Code**: `pnpm mcp:register-clients` crea o aggiorna il client pubblico `dev-recruit-vscode` e la risorsa MCP. È idempotente e va eseguito una volta per ambiente; `DATABASE_URL` decide il database.
- **Plugin**: l'indirizzo del server sta in `plugin/dev-recruit/.mcp.json`. Se cambia l'host, si aggiorna quel file; il plugin non contiene segreti.
- **Metadata**: il server pubblica `/.well-known/oauth-protected-resource` (e la variante `/api/mcp`), `/.well-known/oauth-authorization-server` (e la variante `/api/auth`) e le chiavi su `/api/auth/jwks`. Sono documenti pubblici, leggibili senza sessione.
- **Redirect ammessi**: callback di Claude (`https://claude.ai/api/mcp/auth_callback`), loopback `http://127.0.0.1` su qualsiasi porta e `https://vscode.dev/redirect`. La registrazione dinamica è attiva ma rifiuta ogni altro indirizzo e i client riservati.
- **Verifica prima di pubblicare**: migrazioni applicate, client registrato, metadata raggiungibili, plugin installato e prima connessione completata; una chiamata di prova compare nel registro.
- **Build**: `pnpm build:mcp-apps` dopo una modifica ai riquadri, `pnpm build:plugin-skills` dopo una modifica a nome, descrizione o "quando" di una procedura; `pnpm lint && pnpm test:run && pnpm build` valida il resto.

## 9. Problemi comuni

| Sintomo | Causa e rimedio |
|---|---|
| La pagina di consenso dice "Account non abilitato" | Email non verificata o account bloccato: un amministratore lo abilita da Utenti |
| `401 invalid_token` | Token scaduto o revocato: il client deve autorizzarsi di nuovo |
| `403 access_disabled` | MCP spento per tutti o per l'utente, oppure account bloccato: controllare **Interruttori** |
| `403 insufficient_scope` | Il token non ha il permesso richiesto: rifare l'autorizzazione completa |
| `429 rate_limited` | Troppe richieste: attendere e riprovare |
| `413 request_too_large` | Richiesta oltre il limite di corpo |
| Manca il riquadro | Il client non supporta MCP Apps: usare il testo e confermare dalla dashboard; il quiz si salva solo dal riquadro |
| La proposta non compare | È in attesa nel tab Colloqui della candidatura, finché qualcuno non la conferma o la scarta |
