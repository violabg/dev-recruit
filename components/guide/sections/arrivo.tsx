import {
  GuideDiagram,
  GuideFigure,
  GuideList,
  GuideSection,
  GuideText,
} from "@/components/guide/guide-blocks";
import { GUIDE_SECTION } from "@/components/guide/sections";

const meta = GUIDE_SECTION.arrivo;

const flow = `flowchart LR
    subgraph Esterno["Lato candidato (senza account)"]
        F["<b>Form pubblico</b><br/>/recruiting"]:::step --> CV["<b>Carica il CV</b>"]:::step
    end
    subgraph Interno["Lato recruiter"]
        N["<b>Nuovo candidato</b><br/>/dashboard/candidates/new"]:::step
        AP["<b>Candidatura creata</b><br/>fase: Candidato"]:::entity
    end
    F --> AP
    N --> AP
    AP --> LIST["<b>Visibile ovunque</b><br/>Candidature, pipeline e kanban della posizione"]:::outcome`;

export function ArrivoSection() {
  return (
    <GuideSection meta={meta}>
      <GuideText>
        <strong>Due modi per creare una candidatura:</strong>
      </GuideText>

      <GuideDiagram chart={flow} title="Come arriva una candidatura" />

      <GuideList>
        <li>
          <strong>Form pubblico</strong> (/recruiting): il candidato sceglie una
          posizione aperta, inserisce i dati e carica il CV. Se l&apos;email
          esiste già, l&apos;applicazione <strong>aggancia la candidatura al
          candidato esistente</strong> e aggiorna il CV; se è già candidato a
          quella posizione, non crea duplicati. La risposta mostrata è identica
          in tutti i casi.
        </li>
        <li>
          <strong>Da dashboard</strong> (Candidati → Nuovo Candidato): il
          recruiter inserisce i dati, carica il CV e sceglie una o più posizioni.
          Si crea una candidatura per ogni posizione.
        </li>
      </GuideList>

      <GuideText>
        La candidatura nasce in fase <strong>Candidato</strong>. Da lì in poi la
        fase avanza con le azioni (valutare il CV, inviare un test, pianificare
        un colloquio) e può sempre essere spostata a mano dal menu{" "}
        <strong>Sposta fase</strong>.
      </GuideText>

      <GuideFigure
        src="/guida/13-form-pubblico.png"
        alt="Form pubblico di candidatura con scelta della posizione e caricamento del CV"
        caption="Il form che vede il candidato, senza account"
        width={1440}
        height={1000}
      />
    </GuideSection>
  );
}
