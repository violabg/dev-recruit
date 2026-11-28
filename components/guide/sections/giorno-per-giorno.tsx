import {
  GuideDiagram,
  GuideSection,
  GuideTable,
  GuideText,
} from "@/components/guide/guide-blocks";
import { GUIDE_SECTION } from "@/components/guide/sections";

const meta = GUIDE_SECTION["giorno-per-giorno"];

const flow = `flowchart TD
    A["<b>Le mie azioni</b><br/>cosa aspetta me"]:::entity --> B{"Tipo di lavoro"}:::step
    B -->|Test completato| C["<b>Valuta il test</b><br/>Test inviati"]:::step
    B -->|Colloquio oggi/domani| D["<b>Prepara il colloquio</b><br/>o apri il Live"]:::step
    B -->|Colloquio concluso| E["<b>Scrivi il feedback</b>"]:::step
    B -->|Posizione da preparare| F["<b>Criteri · Test · Traccia</b>"]:::step
    C --> G["<b>Candidature</b><br/>pipeline e kanban"]:::entity
    D --> G
    E --> H["<b>Decisione</b>"]:::outcome
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
            "Vedere una posizione",
            <strong key="c">Posizioni → Candidati</strong>,
            'Kanban, card in evidenza e "Sposta fase"',
          ],
          [
            "Gestire la giornata di colloqui",
            <strong key="d">Agenda colloqui</strong>,
            'Prepara / Live; filtro "Solo i miei"',
          ],
        ]}
      />

      <GuideText>
        In <strong>Le mie azioni</strong> le code seguono l&apos;ordine
        dell&apos;applicazione: posizioni da preparare, test da valutare,
        colloqui senza
        preparazione pronta, feedback da inviare. In alto i numeri di ogni coda
        (un clic porta alla coda); sotto, una fermata per coda con le righe e
        il pulsante dell&apos;azione, il primo dei quali è l&apos;unico pulsante
        blu della pagina. Una coda vuota è una riga verde; le candidature ferme
        stanno a parte, in fondo, in ambra. &quot;Solo le mie&quot;,
        nell&apos;intestazione, lascia le candidature e i test di cui sei
        responsabile, i colloqui a cui partecipi e i tuoi feedback; le posizioni
        da preparare restano sempre visibili.
      </GuideText>
    </GuideSection>
  );
}
