import type { McpWorkflow } from "./types";

export const actionCenterWorkflow: McpWorkflow = {
  name: "action-center",
  title: "Le mie azioni",
  description: "Mostra e ordina il lavoro che ti aspetta in dev-recruit (Le mie azioni)",
  whenToUse: "L'utente chiede cosa deve fare in dev-recruit, cosa lo aspetta oggi o qual è il prossimo passo della selezione.",
  steps: [
    "1. Chiama lo strumento `action_center`.",
    "2. Presenta le code in questo ordine, saltando quelle vuote e indicando quante voci ha ciascuna:",
    "   1. Feedback da inviare (colloqui conclusi senza il tuo feedback).",
    "   2. Colloqui senza preparazione pronta (oggi e domani).",
    "   3. Test da valutare.",
    "   4. Candidature ferme da più di 7 giorni.",
    "   5. Posizioni da preparare.",
    "3. Per ogni voce indica il link alla dashboard restituito dallo strumento.",
    "4. Proponi le prossime azioni, una per coda, partendo dalla prima non vuota. Chiedi sempre conferma prima di usare uno strumento che scrive.",
    "5. Se tutte le code sono vuote, dillo in una riga e indica il link a \"Le mie azioni\".",
    "",
    "Esempio (nomi di fantasia):",
    "",
    "> Hai 1 feedback da inviare: Mario Rossi, Backend Developer, round 2.",
    "> Hai 1 colloquio da preparare: Giulia Bianchi, Frontend Developer, domani alle 10:00.",
    "> Vuoi iniziare dal feedback di Mario Rossi? Apri in dev-recruit: (link restituito dallo strumento)",
  ].join("\n"),
};
