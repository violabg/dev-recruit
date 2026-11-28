import type { McpWorkflow } from "./types";

export const quizForCandidateWorkflow: McpWorkflow = {
  name: "quiz-for-candidate",
  title: "Test per una posizione",
  description: "Prepara un test tecnico per una posizione di dev-recruit e lo mostra in anteprima prima del salvataggio",
  whenToUse: "L'utente vuole creare un test tecnico per una posizione.",
  steps: [
    "1. Individua la posizione: chiama `list_positions` o `get_position` e conferma con l'utente quale usare.",
    "2. Dove ci sono i riquadri, chiama `open_quiz_form` con `positionId` e i parametri che sai già: la persona li controlla e preme \"Genera con l'assistente\". Ti arriva la richiesta con i parametri scelti: prosegui dal punto 3. Senza riquadri, leggi competenze e livello della posizione con `get_position` e chiedi all'utente quante domande, di che tipo e con che tempo limite (minuti).",
    "3. Scrivi le domande con i campi richiesti per ogni tipo (descritti nello strumento `save_quiz_draft`).",
    "4. Chiama `save_quiz_draft` con `positionId`, `title`, `timeLimit` e `questions`. Lo strumento non salva: mostra l'anteprima.",
    "5. Spiega che il test si salva con il pulsante \"Salva il test\" nel riquadro e che salvarlo non invita nessun candidato: gli inviti si fanno dalla dashboard.",
    "6. Se l'utente chiede modifiche, richiama `save_quiz_draft` con il test aggiornato.",
    "",
    "Non dire che il test è salvato finché il riquadro non lo conferma.",
  ].join("\n"),
};
