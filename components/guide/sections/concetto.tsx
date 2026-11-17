import {
  GuideDiagram,
  GuideSection,
  GuideTable,
  GuideText,
} from "@/components/guide/guide-blocks";
import { GUIDE_SECTION } from "@/components/guide/sections";

const meta = GUIDE_SECTION.concetto;

const flow = `flowchart TD
    P["<b>Posizione</b><br/>cosa conta e quanto pesa"]:::entity --> C["<b>Candidatura</b><br/>una per candidato × posizione"]:::entity
    C --> E1["<b>CV</b><br/>valutazione per criterio"]:::step
    C --> E2["<b>Test</b><br/>punteggio per risposta"]:::step
    C --> E3["<b>Colloqui</b><br/>kit, live, schede"]:::step
    E1 --> D["<b>Decisione</b><br/>matrice criteri × fonti"]:::entity
    E2 --> D
    E3 --> D
    D --> O["<b>Esito</b><br/>Offerta · Assunto · Scartato"]:::outcome`;

export function ConcettoSection() {
  return (
    <GuideSection meta={meta}>
      <GuideText>
        L&apos;applicazione trasforma una <strong>posizione aperta</strong> in
        una <strong>decisione di assunzione</strong>, raccogliendo prove su una{" "}
        <strong>candidatura</strong>: CV, test, colloqui e schede degli
        intervistatori. Ogni schermata dice qual è il prossimo passo.
      </GuideText>

      <GuideDiagram chart={flow} title="Dalla posizione all'esito" />

      <GuideTable
        head={["Entità", "In una frase", "Dove si gestisce"]}
        rows={[
          [
            <strong key="p">Posizione</strong>,
            "L'offerta di lavoro: dettagli, scheda di valutazione, quiz, guide colloquio",
            <code key="ph">/dashboard/positions</code>,
          ],
          [
            <strong key="c">Candidatura</strong>,
            "Il percorso di una persona per una posizione: fase, prove, responsabile",
            <code key="ch">/dashboard/applications</code>,
          ],
        ]}
      />

      <GuideText>
        La stessa persona può avere <strong>più candidature</strong>, una per
        posizione, con fasi diverse.
      </GuideText>
    </GuideSection>
  );
}
