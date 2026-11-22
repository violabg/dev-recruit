import type { McpWorkflow } from "./types";

export const interviewPrepWorkflow: McpWorkflow = {
  name: "interview-prep",
  title: "Preparazione al colloquio",
  description: "Aiuta a prepararsi a un colloquio di dev-recruit partendo dal kit (briefing, domande, ipotesi, checklist)",
  whenToUse: "L'utente deve condurre o seguire un colloquio e vuole prepararsi.",
  steps: [
    "1. Trova il colloquio: chiama `list_interviews` con `mineOnly: true` (o con l'`applicationId` se l'utente indica una candidatura) e conferma con l'utente quale.",
    "2. Chiama `get_interview` con `interviewId`. Il risultato non contiene identità né CV del candidato: lavora solo su posizione, ruolo dei partecipanti, briefing, domande, criteri, ipotesi e checklist.",
    "3. Prepara un riepilogo breve:",
    "   - cosa verificare (ipotesi e criteri);",
    "   - le domande obbligatorie e quelle da approfondire, con le domande di follow-up;",
    "   - le voci della checklist ancora aperte.",
    "4. Se l'utente chiede, proponi altre domande di approfondimento coerenti con i criteri. Restano suggerimenti in chat: il kit si modifica dalla dashboard.",
    "5. Se il kit non è pronto, dillo e indica il link alla pagina di preparazione.",
    "",
    "Non valutare il candidato e non suggerire un esito: la valutazione si fa con la scheda dopo il colloquio.",
  ].join("\n"),
};
