import type { McpWorkflow } from "./types";

export const scheduleInterviewWorkflow: McpWorkflow = {
  name: "schedule-interview",
  title: "Proposta di colloquio",
  description: "Propone un colloquio per una candidatura di dev-recruit (traccia, data, partecipanti), da confermare nel riquadro",
  whenToUse: "L'utente vuole fissare o organizzare un colloquio con un candidato.",
  steps: [
    "1. Individua la candidatura: chiama `action_center` o `get_application` e conferma con l'utente quale usare.",
    "2. Dove ci sono i riquadri, chiama `open_schedule_form` con `applicationId` e quello che sai già: la persona completa i campi e preme \"Pianifica colloquio\" nel riquadro, che pianifica senza inviare email. Non servono i passi seguenti. Senza riquadri, prosegui così.",
    "3. Chiama `get_scheduling_options` con `applicationId`: restituisce le tracce della posizione, le persone del team, il prossimo round e le proposte già in attesa.",
    "4. Se non ci sono tracce, spiega che va creata una traccia del colloquio dalla dashboard e fermati.",
    "5. Concorda con l'utente: traccia, round (di solito quello proposto), data e ora, durata in minuti, link della call (facoltativo), partecipanti. Ripeti data e ora in italiano prima di procedere.",
    "6. Chiama `propose_interview_slot`. Lo strumento salva solo una proposta: non pianifica nulla e non invia email.",
    "7. Spiega che il colloquio si pianifica con il pulsante \"Pianifica il colloquio\" nel riquadro, oppure con \"Pianifica\" sulla proposta nella fermata del colloquio della candidatura; la pianificazione crea anche la preparazione in bozza.",
    "",
    "Non dire che il colloquio è pianificato finché il riquadro non lo conferma. Non promettere inviti o email: dev-recruit non ne invia.",
  ].join("\n"),
};
