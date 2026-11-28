import { GuideSection, GuideTable } from "@/components/guide/guide-blocks";
import { GUIDE_SECTION } from "@/components/guide/sections";

const meta = GUIDE_SECTION.glossario;

export function GlossarioSection() {
  return (
    <GuideSection meta={meta}>
      <GuideTable
        head={["Termine", "Significato"]}
        rows={[
          [<strong key="1">Posizione</strong>, "L'offerta di lavoro"],
          [
            <strong key="2">Candidatura</strong>,
            "Il percorso di una persona per una posizione; è il perno dell'app",
          ],
          [
            <strong key="3">Fase</strong>,
            "Candidato · Screening · Test · Colloquio · Decisione · Offerta · Assunto · Scartato · Ritirato",
          ],
          [
            <strong key="4">Criteri</strong>,
            "I criteri della posizione con pesi e livelli attesi",
          ],
          [
            <strong key="5">Test</strong>,
            "Il test della posizione: domande collegate ai criteri",
          ],
          [
            <strong key="6">Test inviato</strong>,
            "Il test inviato al candidato (non è il colloquio)",
          ],
          [
            <strong key="7">Colloquio</strong>,
            "La conversazione, con round e partecipanti",
          ],
          [
            <strong key="8">Preparazione</strong>,
            "La preparazione del colloquio: briefing, domande, checklist",
          ],
          [
            <strong key="9">Traccia del colloquio</strong>,
            "La scaletta di domande di un round",
          ],
          [
            <strong key="10">Feedback</strong>,
            "Voti e note di un intervistatore per un colloquio",
          ],
          [
            <strong key="11">Profilo candidato</strong>,
            "La pagina della persona: dati, CV e candidature",
          ],
          [
            <strong key="12">Decisione</strong>,
            "Esito registrato con motivazione e pesi usati",
          ],
        ]}
      />
    </GuideSection>
  );
}
