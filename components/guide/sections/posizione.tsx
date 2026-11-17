import {
  GuideDiagram,
  GuideFigure,
  GuideSection,
  GuideSteps,
  GuideText,
} from "@/components/guide/guide-blocks";
import { GUIDE_SECTION } from "@/components/guide/sections";

const meta = GUIDE_SECTION.posizione;

const flow = `flowchart LR
    A["<b>1. Dettagli</b><br/>titolo, competenze, JD"]:::step --> B["<b>2. Scheda di valutazione</b><br/>criteri, pesi, livelli attesi"]:::entity
    B --> C["<b>3. Quiz</b><br/>domande collegate ai criteri"]:::step
    B --> D["<b>4. Guida colloquio</b><br/>modello del round"]:::step
    C --> E["<b>Setup completo ✓</b><br/>pronta per le candidature"]:::outcome
    D --> E`;

const criteria = (
  <ul className="mt-1 space-y-1 pl-4 list-disc marker:text-border">
    <li>
      Se un criterio ha già raccolto voti o compare in un kit,{" "}
      <strong>non si elimina: si archivia</strong> (resta nelle decisioni già
      avviate, sparisce dalle nuove schede).
    </li>
    <li>
      Cambiare un peso vale per le candidature non ancora decise: quelle decise
      conservano i pesi del momento della decisione.
    </li>
  </ul>
);

export function PosizioneSection() {
  return (
    <GuideSection meta={meta}>
      <GuideText>
        <strong>Dove:</strong> Posizioni → <strong>Nuova posizione</strong>{" "}
        (oppure apri una esistente). Il setup si prepara una volta per
        posizione: le candidature che arrivano dopo usano lo stesso.
      </GuideText>

      <GuideDiagram chart={flow} title="I quattro passi del setup di una posizione" />

      <GuideSteps
        steps={[
          {
            title: "Dettagli",
            body: (
              <>
                Titolo, tipo di contratto, livello di esperienza, competenze
                tecniche e soft. La descrizione può essere generata con AI; si
                può modificare a mano.
              </>
            ),
          },
          {
            title: "Scheda di valutazione",
            body: (
              <>
                È il cuore della valutazione: i <strong>criteri</strong> con
                categoria (tecnico / soft / cultura), priorità (indispensabile o
                preferibile), <strong>peso 1–5</strong>, livello atteso 1–5 e le{" "}
                <strong>ancore</strong> (&quot;come suona una risposta debole /
                media / forte&quot;). L&apos;AI propone i criteri a partire da
                competenze e livello; ogni criterio si conferma o si modifica.
                Nel tab della posizione la scheda è in sola lettura: riepilogo
                (criteri, indispensabili, con risposte attese), poi un blocco
                per categoria con le risposte attese in rosso, ambra e verde;{" "}
                <strong>Modifica scheda</strong> apre l&apos;editor.
                {criteria}
              </>
            ),
          },
          {
            title: "Quiz",
            body: (
              <>
                Il test della posizione. Si possono creare domande o generarle
                con AI; ogni domanda può essere <strong>collegata ai criteri</strong>{" "}
                della scheda: così il test produrrà prove per criterio.
              </>
            ),
          },
          {
            title: "Guida colloquio",
            body: (
              <>
                Uno o più modelli (round), con sezioni (intro, esperienza,
                tecnico, comportamentale, domande del candidato, chiusura),
                minuti e domande con approfondimenti e ancore. La guida si apre
                in sola lettura: scaletta con minuti e domande, criteri della
                scheda con quante domande li verificano (in evidenza quelli senza
                domande), poi le domande sezione per sezione.{" "}
                <strong>Modifica guida</strong> apre l&apos;editor, dove
                &quot;Genera dalla scheda&quot; propone il modello a partire dai
                criteri.
              </>
            ),
          },
        ]}
      />

      <GuideText>
        <strong>In alto resta una checklist</strong>: Dettagli ✓ · Scheda ✓ ·
        Quiz ✓ · Guida ✓. Una posizione può essere Bozza, Aperta o Chiusa: solo
        le aperte compaiono nel form pubblico. L&apos;eliminazione è permessa
        solo se non ci sono candidature.
      </GuideText>

      <div className="flex flex-col gap-6 mt-1">
        <GuideFigure
          src="/guida/02-posizione-setup.png"
          alt="Pagina della posizione con la checklist di setup e i tab"
          caption="La posizione con la checklist del setup in alto"
          width={1440}
          height={1000}
        />
        <GuideFigure
          src="/guida/03-scheda-valutazione.png"
          alt="Scheda di valutazione con criteri, pesi, livelli attesi e ancore"
          caption="Scheda di valutazione: criteri, pesi e ancore"
          width={1440}
          height={1671}
        />
        <GuideFigure
          src="/guida/04-guide-colloquio.png"
          alt="Elenco delle guide colloquio della posizione"
          caption="Guide colloquio della posizione"
          width={1440}
          height={1000}
        />
        <GuideFigure
          src="/guida/15-guida-sola-lettura.png"
          alt="Guida colloquio in sola lettura con scaletta, criteri della scheda e domande"
          caption="Guida in sola lettura: scaletta, criteri coperti e domande"
          width={1440}
          height={1500}
        />
        <GuideFigure
          src="/guida/14-editor-guida.png"
          alt="Editor di una guida colloquio con sezioni, minuti e domande"
          caption="Editor di una guida colloquio: sezioni, minuti e domande"
          width={1440}
          height={3070}
        />
      </div>
    </GuideSection>
  );
}
