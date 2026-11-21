---
name: quiz-for-candidate
description: Prepara un quiz tecnico per una posizione di dev-recruit e lo mostra in anteprima prima del salvataggio
---

Usa questa skill quando l'utente vuole creare un quiz o un test tecnico per una posizione.

1. Individua la posizione: chiama `list_positions` o `get_position` e conferma con l'utente quale usare.
2. Leggi competenze e livello della posizione con `get_position` e chiedi all'utente quante domande, di che tipo e con che tempo limite (minuti).
3. Scrivi le domande. Tipi e campi obbligatori:
   - `multiple_choice`: `question`, `options` (almeno 4, ognuna di almeno 3 caratteri), `correctAnswer` (indice da 0 a 3), `explanation` facoltativa;
   - `open_question`: `question`, `sampleAnswer`, `keywords` facoltative;
   - `code_snippet`: `question`, `codeSnippet`, `sampleSolution`, `language`;
   - `behavioral_scenario`: `question`, `sampleAnswer`.
   Le domande verificano le competenze della posizione, al livello richiesto, senza riferimenti a candidati reali.
4. Chiama `save_quiz_draft` con `positionId`, `title`, `timeLimit` e `questions`. Lo strumento non salva: mostra l'anteprima.
5. Spiega che il quiz si salva con il pulsante "Salva il quiz" nel riquadro e che salvarlo non invita nessun candidato: gli inviti si fanno dalla dashboard.
6. Se l'utente chiede modifiche, richiama `save_quiz_draft` con il quiz aggiornato.

Non dire che il quiz è salvato finché il riquadro non lo conferma.
