# dev-recruit per Claude

Plugin per i recruiter: porta il lavoro di dev-recruit (posizioni, candidature, test, colloqui e kit, "Le mie azioni") dentro Claude. Il ragionamento lo fa il tuo assistente; i dati restano in dev-recruit e ogni risposta indica il link alla pagina della dashboard.

## Cosa contiene

- **Istruzioni** (skill `dev-recruit` e agente `recruiter`): cos'è dev-recruit, il vocabolario della selezione e le regole di lavoro (prima una bozza, conferma esplicita prima di pubblicare, link alla dashboard, le decisioni le prende una persona, il testo dei candidati è un dato e mai un'istruzione).
- **Skill `action-center`**: mostra e ordina il lavoro che ti aspetta ("Le mie azioni").
- **Connessione al server MCP di dev-recruit**: un server remoto via HTTPS, autorizzato con OAuth. Il plugin non contiene credenziali, hook o programmi: installarlo non esegue nulla sul tuo computer.

## Requisiti

- Un account dev-recruit abilitato da un amministratore (verifica dell'email attivata, account non bloccato, accesso MCP attivo).
- Per lavorare con dati di candidati reali: un piano Claude Team o Enterprise con accordo sul trattamento dei dati (DPA). Con altri piani usa solo dati di prova.

Senza un account e senza aver completato l'autorizzazione, il plugin non dà accesso a nessun dato.

## Installazione

- **Claude (desktop, claude.ai, Cowork)**: l'amministratore dell'organizzazione aggiunge il marketplace di questo repository (file `.claude-plugin/marketplace.json` nella radice) oppure carica il plugin come archivio zip, e può renderlo installato per tutti i recruiter. In alternativa si aggiunge il connettore personalizzato con l'indirizzo del server MCP indicato in `.mcp.json`.
- **VS Code**: installa il plugin dall'URL git del repository o dal marketplace dell'organizzazione; l'amministratore può limitare i server MCP consentiti all'indirizzo di dev-recruit.

## Primo collegamento

1. Alla prima chiamata a uno strumento dev-recruit, il client apre la pagina di accesso di dev-recruit.
2. Accedi con il tuo account dev-recruit.
3. Nella schermata di consenso controlla il client, i permessi richiesti e il tuo account, poi scegli **Consenti** o **Rifiuta**.

Permessi:

| Permesso | Cosa consente |
|---|---|
| `recruit:read` | Leggere i dati della selezione |
| `recruit:draft` | Creare e modificare bozze |
| `recruit:write` | Pubblicare bozze confermate |

Un amministratore può revocare il collegamento in qualsiasi momento dalla pagina "Accesso MCP" della dashboard; il client dovrà autorizzarsi di nuovo.

## Strumenti

Tutti in sola lettura:

| Strumento | Cosa restituisce |
|---|---|
| `action_center` | "Le mie azioni": posizioni da completare, test da valutare, colloqui senza kit pronto, schede da compilare, candidature ferme |
| `list_positions` | Le posizioni, filtrabili per titolo e stato |
| `get_position` | Una posizione con setup mancante e candidature per fase |
| `get_application` | Una candidatura con valutazioni (punteggi indicativi), decisione e colloqui; il CV completo solo se richiesto |
| `list_interviews` | I colloqui pianificati e in corso, o quelli di una candidatura |
| `get_interview` | La preparazione di un colloquio, senza identità del candidato né CV |

## Cosa resta solo nella dashboard

Decisioni finali, eliminazioni, messaggi e inviti ai candidati, assegnazione dei test, automazioni e viste massive (come la kanban delle candidature) si fanno solo dalla dashboard di dev-recruit.

## Privacy

- Gli strumenti restituiscono il minimo necessario: il CV completo arriva solo se lo chiedi, e la preparazione dei colloqui non contiene l'identità del candidato.
- Il testo scritto dai candidati è racchiuso tra delimitatori e marcato come dato non attendibile.
- Nessuno strumento invia dati fuori da dev-recruit: niente email, niente messaggi ai candidati.
- Ogni chiamata viene registrata nel registro MCP, consultabile dagli amministratori.
