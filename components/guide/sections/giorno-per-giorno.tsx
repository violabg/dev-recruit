import {
  GuideDiagram,
  GuideFigure,
  GuideSection,
  GuideTable,
  GuideText,
} from "@/components/guide/guide-blocks";
import { GUIDE_SECTION } from "@/components/guide/sections";

const meta = GUIDE_SECTION["giorno-per-giorno"];

const flow = `flowchart LR
    A["Le mie azioni<br/>cosa aspetta me"] --> B{"Tipo di lavoro"}
    B -->|Test completato| C["Valuta il test<br/>Test inviati"]
    B -->|Colloquio oggi/domani| D["Prepara il kit<br/>o apri il Live"]
    B -->|Colloquio concluso| E["Compila la scheda"]
    B -->|Posizione da completare| F["Scheda / Quiz / Guida"]
    C --> G["Candidature<br/>pipeline e kanban"]
    D --> G
    E --> H["Decisione"]
    F --> G
    G --> H`;

export function GiornoPerGiornoSection() {
  return (
    <GuideSection meta={meta}>
      <GuideDiagram chart={flow} title="Le quattro diramazioni delle mie azioni" />

      <GuideText>
        <strong>Da dove partire, e per cosa:</strong>
      </GuideText>

      <GuideTable
        head={["Se devo…", "Parto da", "Poi"]}
        rows={[
          [
            "Sapere cosa fare adesso",
            <strong key="a">Le mie azioni</strong>,
            "Ogni riga porta all'azione",
          ],
          [
            "Vedere la situazione di tutte le candidature",
            <strong key="b">Candidature</strong>,
            'Filtri per fase e posizione, "Solo le mie"',
          ],
          [
            "Vedere una posizione nel dettaglio",
            <strong key="c">Posizioni → Selezione</strong>,
            'Kanban e "Sposta fase"',
          ],
          [
            "Gestire la giornata di colloqui",
            <strong key="d">Agenda colloqui</strong>,
            'Prepara / Live; filtro "Solo i miei"',
          ],
        ]}
      />

      <GuideFigure
        src="/guida/01-le-mie-azioni.png"
        alt="Homepage Le mie azioni con le righe di lavoro in attesa"
        caption="Le mie azioni: cosa aspetta il recruiter"
        width={1440}
        height={1000}
      />
    </GuideSection>
  );
}
