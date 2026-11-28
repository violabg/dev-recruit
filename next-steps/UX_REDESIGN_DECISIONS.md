# Redesign UX — Decisioni

**Data:** 28 novembre 2026
**Stato:** decisioni approvate, piano di esecuzione da scrivere.
**Mockup di riferimento:** versione A "Binario" (https://claude.ai/artifact/HvwKd1TSqQME92xtEFgQ4K, riga A).

`CONTEXT.md` e la knowledge usano già il vocabolario qui sotto: finché il piano non è eseguito, le etichette dell'app sono quelle vecchie.

## 1. Perimetro

- Si cambiano etichette, navigazione e layout di Home, Posizione, Candidatura, più etichette e breadcrumbs delle pagine colloquio.
- Non cambiano: simboli di codice, modelli Prisma, route (eccetto i valori di `?tab=`), id delle sezioni di `/guida`, nomi dei tool MCP, colori di brand, font, sidebar navy.
- "Le mie azioni" resta com'è (code, ordine, regole); cambia solo lo stile verso A e le etichette.

## 2. Vocabolario UI

| Concetto (simbolo) | Prima | Dopo |
|---|---|---|
| `Scorecard` | Scheda di valutazione | **Criteri** ("Criteri della posizione") |
| `InterviewerFeedback` | Scheda intervistatore, "Compila scheda", "Invia scheda" | **Feedback** ("Feedback del colloquio", "Scrivi il feedback", "Invia feedback") |
| `InterviewGuide` | Guida colloquio / Guide colloquio | **Traccia del colloquio** / Tracce |
| `InterviewKit` | Kit colloquio, Kit in bozza, Kit pronto | **Preparazione**, Preparazione in bozza, Preparazione pronta |
| `Quiz` | Quiz | **Test** |
| `Assessment` | Test (inviato) | **Test inviato** (al candidato resta "test") |
| Pagina `/dashboard/candidates/[id]` | Scheda candidato | **Profilo candidato** |
| `getPositionSetup` | Setup della posizione | **Criteri e domande** (tab della posizione) |

Invariati: Posizione, Candidatura, Candidato, Colloquio, Criterio, Criteri verificati, Decisione, Prossima azione, Le mie azioni, Valutazione (solo AI su CV e test), Fase, Agenda, Preset.

## 3. Navigazione

- Sidebar, gruppo principale senza titolo: Le mie azioni, Posizioni, Candidati, Agenda.
- Gruppo "Libreria": Test (`/dashboard/quizzes`), Test inviati (`/dashboard/assessments`), Preset.
- Footer invariato: Impostazioni, Utenti, utente.
- "Candidature" esce dal menu; la route `/dashboard/applications` resta raggiungibile da link.
- Breadcrumbs con i nomi reali (`Posizioni / Senior Frontend Developer / Luca Bianchi`), mai "Dettaglio". Spariscono i pulsanti "Torna a…" e la freccia indietro: si torna dai breadcrumbs.

## 4. Pagina Posizione

- Tab: **Candidati** (kanban, ex "Selezione"), **Criteri e domande** (criteri, test, tracce e tabella di copertura), **Dettagli**.
- `?tab=`: `candidati`, `criteri`, `dettagli`. I vecchi valori portano al nuovo tab: `selezione` → `candidati`; `scheda`, `quiz`, `guide` → `criteri`.
- Tab iniziale: `criteri` finché la posizione è incompleta per `getPositionSetup`, poi `candidati`. Il tab mostra "da completare" quando manca qualcosa.
- La card "Setup della posizione" sparisce.
- Copertura: per ogni criterio attivo, numero di domande che lo verificano nei test e nelle tracce. Criterio senza domande → riga in `warning` con "Aggiungi una domanda". Sul tab Candidati un avviso `warning` per i criteri scoperti, con lo stesso link.
- Kanban invariato (colonne per fase, ultima "Chiuse"); le card che aspettano l'utente sono evidenziate.

## 5. Pagina Candidatura

- Sostituisce stepper, tab (Panoramica, CV, Test, Colloqui, Decisione) e cronologia con una **storia verticale** a fermate: CV, un Test per ogni test inviato, un Colloquio per ogni colloquio, Decisione.
- Fermata conclusa: una riga con l'esito e "Apri", che espande il contenuto dell'ex tab. Fermata corrente: aperta, con l'unico pulsante blu della pagina (l'azione di `getNextAction`). Fermata futura: tratteggiata, con la condizione che la sblocca.
- Colonna laterale: contatti e altre candidature.
- Header: nome, una riga di contesto (posizione, data, fase, responsabile), azioni "Profilo candidato", "Sposta di fase", "Prendi in carico".

## 6. Pagine colloquio

- `InterviewSteps`: Preparazione → Live → Feedback → Decisione.
- Solo etichette e breadcrumbs (`… / Luca Bianchi / Colloquio 2 / Preparazione`); layout invariato.

## 7. Regole di stile per ogni pagina

- Un solo pulsante blu (`primary`) per pagina; gli altri outline.
- Sezioni vuote nascoste o ridotte a una riga.
- Al massimo un badge per elemento.
- Ogni avviso ha un link che lo risolve.

## 8. Fuori dal codice dell'app

- `/guida`: sezioni e screenshot aggiornati nello stesso passo che cambia la schermata.
- MCP (`lib/mcp/instructions.ts`, widget): stesso vocabolario nei testi, nomi dei tool invariati.

## 9. Testi derivati

- Le mie azioni: "Posizioni da preparare", "Colloqui senza preparazione pronta", "Feedback da inviare" (le altre code invariate).
- Prossima azione: "Scrivi il feedback" al posto di "Compila scheda".
- Decisione: "Feedback già inviati (n)", "Per un giudizio indipendente, invia prima il tuo feedback", "Pesi dei criteri".
- Errori: "La preparazione si modifica solo prima del colloquio", "Uno o più criteri non appartengono a questa posizione", "La posizione è obbligatoria per creare una traccia".
- Traccia: dialog "Genera dai criteri"; preparazione: "Segna come pronta".

## 10. Knowledge

Bozze in `next-steps/ux-redesign-knowledge/` (`domain_model`, `server_actions`, `cache_invalidation`, `styling`): contenuto completo, da salvare con il ruolo knowledge-builder (`knowledge-update`). `ai_generation`, `question_schemas`, `testing`: nessun impatto.
