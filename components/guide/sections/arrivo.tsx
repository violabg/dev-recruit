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
        L["<b>Link di una posizione</b><br/>/recruiting/positions/…"]:::step --> CV
    end
    subgraph Interno["Lato recruiter"]
        N["<b>Nuovo candidato</b><br/>/dashboard/candidates/new"]:::step
        P["<b>Dalla posizione</b><br/>tab Candidati"]:::step
        AP["<b>Candidatura creata</b><br/>fase: Candidato"]:::entity
    end
    CV --> AP
    N --> AP
    P --> AP
    AP --> LIST["<b>Visibile ovunque</b><br/>elenco candidature e kanban della posizione"]:::outcome`;

export function ArrivoSection() {
  return (
    <GuideSection meta={meta}>
      <GuideText>
        <strong>Quattro modi per creare una candidatura:</strong>
      </GuideText>

      <GuideDiagram chart={flow} title="Come arriva una candidatura" />

      <GuideList>
        <li>
          <strong>Form pubblico</strong> (/recruiting): il candidato apre le
          posizioni aperte per leggerne i dettagli, aggiunge con{" "}
          <strong>Candidati per questa posizione</strong> una o più posizioni,
          poi con <strong>Continua</strong> inserisce i dati e carica il CV. Si
          crea una candidatura per ogni posizione. Se l&apos;email esiste già,
          l&apos;applicazione <strong>aggancia le candidature al candidato
          esistente</strong> e aggiorna il CV; se è già candidato a una
          posizione, non crea duplicati. La risposta mostrata è identica in
          tutti i casi.
        </li>
        <li>
          <strong>Link di una posizione</strong> (/recruiting/positions/…): dalla
          pagina di una posizione aperta, <strong>Copia link candidatura</strong>{" "}
          copia un link da condividere, per esempio in un annuncio. La pagina
          mostra i dettagli di quella sola posizione e il form, senza poterne
          scegliere altre. Se la posizione è chiusa, la pagina dice che non
          accetta più candidature; se è in bozza o non esiste, risponde{" "}
          <strong>Posizione non trovata</strong>.
        </li>
        <li>
          <strong>Da dashboard</strong> (Candidati → Nuovo Candidato): il
          recruiter inserisce i dati, carica il CV e sceglie una o più posizioni.
          Si crea una candidatura per ogni posizione.
        </li>
        <li>
          <strong>Dalla posizione</strong> (Posizioni → la posizione → tab
          Candidati, solo se la posizione è aperta):{" "}
          <strong>Aggiungi Candidato</strong> apre il form del nuovo candidato
          con la posizione già scelta; <strong>Associa candidati</strong> apre
          un dropdown dei candidati già presenti, con ricerca e filtri (altra
          posizione, fase, nascondi non contattabili) per trovare i più adatti.
          Se il candidato si era ritirato da quella posizione, la candidatura si
          riapre; chi è già candidato per quella posizione non si può aggiungere
          di nuovo; ogni
          candidato può avere al massimo 10 posizioni.
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
