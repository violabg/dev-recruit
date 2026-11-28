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
          ["Cambiare i pesi dei criteri", "Posizione → Criteri e domande"],
          [
            "Creare o modificare il test di una posizione",
            "Posizione → Criteri e domande",
          ],
          [
            "Riusare un test di un'altra posizione",
            "Posizione → Criteri e domande → Aggiungi test esistenti",
          ],
          [
            "Preparare le domande di un colloquio",
            "Candidatura → fermata del colloquio → Prepara",
          ],
          [
            "Sapere quali criteri non hanno ancora prove",
            'Live → Copertura criteri, oppure Decisione (celle "Nessuna prova")',
          ],
          [
            "Spostare una candidatura di fase",
            "Candidatura → Sposta fase, oppure kanban della posizione",
          ],
          ["Vedere tutti i colloqui di domani", "Agenda"],
          [
            "Trovare il form che vede il candidato",
            "/recruiting (posizioni aperte), /recruiting/positions/… (una posizione, dal pulsante Copia link candidatura) e /recruiting/[token] (test)",
          ],
          ["Capire cosa ha fatto un candidato", "Candidatura → storia della candidatura"],
        ]}
      />
    </GuideSection>
  );
}
