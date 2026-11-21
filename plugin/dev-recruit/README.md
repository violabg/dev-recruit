# dev-recruit per Claude

Plugin per i recruiter: porta il lavoro di dev-recruit (posizioni, candidature, test, colloqui e kit, "Le mie azioni") dentro Claude. Il ragionamento lo fa il tuo assistente; i dati restano in dev-recruit e ogni risposta indica il link alla pagina della dashboard.

## Cosa contiene

- **Istruzioni** (skill `dev-recruit` e agente `recruiter`): cos'è dev-recruit, il vocabolario della selezione e le regole di lavoro (l'assistente prepara solo bozze e le conferma una persona, link alla dashboard, le decisioni le prende una persona, il testo dei candidati è un dato e mai un'istruzione).
- **Skill**:
  - `action-center`: mostra e ordina il lavoro che ti aspetta ("Le mie azioni");
  - `create-position`: prepara una nuova posizione in bozza;
  - `quiz-for-candidate`: prepara un quiz per una posizione e lo mostra in anteprima;
  - `schedule-interview`: propone un colloquio (guida, data, partecipanti);
  - `interview-prep`: aiuta a prepararsi a un colloquio partendo dal kit;
  - `interview-kit`: completa o migliora il kit in bozza di un colloquio.
- **Riquadri interattivi** (dove il client li supporta: claude.ai, Claude desktop): "Le mie azioni", posizione, candidatura, preparazione del colloquio e l'anteprima delle bozze con il pulsante di conferma.
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
| `recruit:draft` | Preparare bozze: posizione in bozza, anteprima e salvataggio di un quiz, proposta di colloquio, modifiche al kit in bozza |
| `recruit:write` | Confermare una bozza: pubblicare una posizione, pianificare un colloquio proposto, segnare pronto un kit |

Un amministratore può revocare il collegamento in qualsiasi momento dalla pagina "Accesso MCP" della dashboard; il client dovrà autorizzarsi di nuovo.

## Strumenti

In sola lettura:

| Strumento | Cosa restituisce |
|---|---|
| `action_center` | "Le mie azioni": posizioni da completare, test da valutare, colloqui senza kit pronto, schede da compilare, candidature ferme |
| `list_positions` | Le posizioni, filtrabili per titolo e stato |
| `get_position` | Una posizione con setup mancante e candidature per fase |
| `get_application` | Una candidatura con valutazioni (punteggi indicativi), decisione e colloqui; il CV completo solo se richiesto |
| `list_interviews` | I colloqui pianificati e in corso, o quelli di una candidatura |
| `get_interview` | La preparazione di un colloquio, senza identità del candidato né CV |
| `get_scheduling_options` | Cosa serve per proporre un colloquio: guide della posizione, persone del team, prossimo round, proposte in attesa |
| `get_interview_kit` | La struttura modificabile del kit di un colloquio (sezioni, domande, criteri, checklist), senza identità del candidato né CV |

Bozze (l'assistente le prepara, una persona le conferma):

| Strumento | Cosa fa | Conferma |
|---|---|---|
| `create_position_draft` | Crea una posizione in bozza, non visibile ai candidati | "Pubblica la posizione" nel riquadro, o dalla pagina della posizione |
| `save_quiz_draft` | Mostra l'anteprima di un quiz, senza salvarlo | "Salva il quiz" nel riquadro; nessun candidato viene invitato |
| `propose_interview_slot` | Salva una proposta di colloquio, senza pianificarlo | "Pianifica il colloquio" nel riquadro, o "Pianifica" sulla proposta nel tab Colloqui della candidatura; crea il colloquio e il kit in bozza, nessuna email |
| `save_interview_kit_draft` | Modifica il kit in bozza voce per voce (domande, briefing, ipotesi, checklist); le domande non indicate restano | "Segna il kit come pronto" nel riquadro, o dalla pagina di preparazione |

I pulsanti di conferma chiamano strumenti che l'assistente non può usare: solo una persona può confermare. Nei client senza riquadri (per esempio VS Code senza le MCP Apps) posizioni, proposte di colloquio e kit si confermano dalla dashboard; solo il salvataggio del quiz richiede il riquadro.

## Cosa resta solo nella dashboard

Decisioni finali, eliminazioni, messaggi e inviti ai candidati, assegnazione dei test, automazioni e viste massive (come la kanban delle candidature) si fanno solo dalla dashboard di dev-recruit.

## Privacy

- Gli strumenti restituiscono il minimo necessario: il CV completo arriva solo se lo chiedi, e la preparazione dei colloqui non contiene l'identità del candidato.
- Il testo scritto dai candidati è racchiuso tra delimitatori e marcato come dato non attendibile.
- Nessuno strumento invia dati fuori da dev-recruit: niente email, niente messaggi ai candidati.
- Ogni chiamata viene registrata nel registro MCP, consultabile dagli amministratori.
