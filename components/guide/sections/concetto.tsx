import {
  GuideDiagram,
  GuideSection,
  GuideTable,
  GuideText,
} from "@/components/guide/guide-blocks";
import { GUIDE_SECTION } from "@/components/guide/sections";

const meta = GUIDE_SECTION.concetto;

const flow = `flowchart LR
    P["POSIZIONE<br/>cosa conta e quanto pesa"] --> C["CANDIDATURA<br/>una per candidato × posizione"]
    C --> E1["Prova: CV<br/>valutazione per criterio"]
    C --> E2["Prova: Test<br/>punteggio per risposta"]
    C --> E3["Prova: Colloqui<br/>kit, live, schede"]
    E1 --> D["DECISIONE<br/>matrice criteri × fonti"]
    E2 --> D
    E3 --> D
    D --> O["Esito<br/>Offerta · Assunto · Scartato"]`;

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
