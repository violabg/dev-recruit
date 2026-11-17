import { GuideSection, GuideTable } from "@/components/guide/guide-blocks";
import { GUIDE_SECTION } from "@/components/guide/sections";

const meta = GUIDE_SECTION.faq;

export function FaqSection() {
  return (
    <GuideSection meta={meta}>
      <GuideTable
        head={["Mi serve…", "Vai a"]}
        rows={[
          [
            "Il punteggio complessivo di una candidatura",
            "Candidatura → tab Decisione → Apri la decisione",
          ],
          ["Cambiare i pesi dei criteri", "Posizione → Scheda di valutazione"],
          ["Creare o modificare il quiz di una posizione", "Posizione → tab Quiz"],
          [
            "Preparare le domande di un colloquio",
            "Candidatura → Colloqui → Prepara",
          ],
          [
            "Sapere quali criteri non hanno ancora prove",
            'Live → Copertura criteri, oppure Decisione (celle "Nessuna prova")',
          ],
          [
            "Spostare una candidatura di fase",
            "Candidatura → Sposta fase, oppure kanban della posizione",
          ],
          ["Vedere tutti i colloqui di domani", "Agenda colloqui"],
          [
            "Trovare il form che vede il candidato",
            "/recruiting (posizioni aperte) e /recruiting/[token] (test)",
          ],
          ["Capire cosa ha fatto un candidato", "Candidatura → Panoramica (cronologia)"],
        ]}
      />
    </GuideSection>
  );
}
