import {
  GuideSection,
  GuideTable,
  GuideText,
} from "@/components/guide/guide-blocks";
import { GuideFlow } from "@/components/guide/guide-flow";
import { GUIDE_SECTION } from "@/components/guide/sections";

const meta = GUIDE_SECTION.concetto;

export function ConcettoSection() {
  return (
    <GuideSection meta={meta}>
      <GuideText>
        L&apos;applicazione trasforma una <strong>posizione aperta</strong> in
        una <strong>decisione di assunzione</strong>, raccogliendo prove su una{" "}
        <strong>candidatura</strong>: CV, test, colloqui e feedback degli
        intervistatori. Ogni schermata dice qual è il prossimo passo.
      </GuideText>

      <GuideFlow
        title="Dalla posizione all'esito"
        stages={[
          [{ title: "Posizione", detail: "cosa conta e quanto pesa", tone: "entity" }],
          [
            {
              title: "Candidatura",
              detail: "una per candidato × posizione",
              tone: "entity",
            },
          ],
          [
            { title: "CV", detail: "valutazione per criterio", tone: "step" },
            { title: "Test", detail: "punteggio per risposta", tone: "step" },
            { title: "Colloqui", detail: "preparazione, live, feedback", tone: "step" },
          ],
          [{ title: "Decisione", detail: "matrice criteri × fonti", tone: "entity" }],
          [
            {
              title: "Esito",
              detail: "Offerta · Assunto · Scartato",
              tone: "outcome",
            },
          ],
        ]}
      />

      <GuideTable
        head={["Entità", "In una frase", "Dove si gestisce"]}
        rows={[
          [
            <strong key="p">Posizione</strong>,
            "L'offerta di lavoro: dettagli, criteri, test, tracce del colloquio",
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
