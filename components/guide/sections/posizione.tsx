import {
  GuideDiagram,
  GuideSection,
  GuideSteps,
  GuideText,
} from "@/components/guide/guide-blocks";
import { GUIDE_SECTION } from "@/components/guide/sections";

const meta = GUIDE_SECTION.posizione;

const flow = `flowchart LR
    A["<b>1. Dettagli</b><br/>titolo, competenze, JD"]:::step --> B["<b>2. Criteri</b><br/>criteri, pesi, livelli attesi"]:::entity
    B --> C["<b>3. Test</b><br/>domande collegate ai criteri"]:::step
    B --> D["<b>4. Traccia</b><br/>traccia del colloquio del round"]:::step
    C --> E["<b>Criteri e domande ✓</b><br/>pronta per le candidature"]:::outcome
    D --> E`;

const criteria = (
  <ul className="mt-1 space-y-1 pl-4 list-disc marker:text-border">
    <li>
      Se un criterio ha già raccolto voti o compare in una preparazione,{" "}
      <strong>non si elimina: si archivia</strong> (resta nelle decisioni già
      avviate, sparisce dalle nuove valutazioni).
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
        (oppure apri una esistente). La pagina ha tre tab:{" "}
        <strong>Candidati</strong>, <strong>Criteri e domande</strong> e{" "}
        <strong>Dettagli</strong>.
      </GuideText>

      <GuideDiagram
        chart={flow}
        title="Come si prepara una posizione"
      />

      <GuideText>
        <strong>Criteri e domande</strong> raccoglie i criteri, i test, le tracce
        del colloquio e la tabella <strong>Copertura dei criteri</strong>. Se
        manca qualcosa, il tab mostra <strong>da completare</strong> e la
        posizione si apre lì; quando è tutto pronto si apre su{" "}
        <strong>Candidati</strong>. <strong>Candidati</strong> è il kanban della
        posizione: le card che aspettano un&apos;azione tua sono evidenziate e,
        sopra, un avviso segnala i criteri che nessuna domanda verifica, con il
        link <strong>Aggiungi una domanda</strong>.
      </GuideText>

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
            title: "Criteri",
            body: (
              <>
                È il cuore della valutazione: i <strong>criteri</strong> con
                categoria (tecnico / soft / cultura), priorità (indispensabile o
                preferibile), <strong>peso 1–5</strong>, livello atteso 1–5 e le{" "}
                <strong>ancore</strong> (&quot;come suona una risposta debole /
                media / forte&quot;). L&apos;AI propone i criteri a partire da
                competenze e livello; ogni criterio si conferma o si modifica.
                Nella sezione i criteri sono in sola lettura, con il riepilogo e
                un blocco per categoria; <strong>Modifica i criteri</strong> apre
                l&apos;editor.
                {criteria}
              </>
            ),
          },
          {
            title: "Test",
            body: (
              <>
                Il test della posizione. Si possono creare domande o generarle
                con AI; ogni domanda può essere{" "}
                <strong>collegata ai criteri</strong>: così il test produrrà
                prove per criterio. <strong>Nuovo test</strong> crea un test da
                zero; <strong>Aggiungi test esistenti</strong> apre un dropdown
                dei test già presenti in altre posizioni, con ricerca per titolo
                e filtri (posizione, livello, tipi di domanda): ogni test scelto
                viene aggiunto come <strong>copia indipendente</strong>, con le
                stesse domande e lo stesso limite di tempo. I collegamenti ai
                criteri non vengono copiati: si ricollegano ai criteri di questa
                posizione nell&apos;editor del test.
              </>
            ),
          },
          {
            title: "Traccia",
            body: (
              <>
                Una o più tracce del colloquio (round), con sezioni (intro,
                esperienza, tecnico, comportamentale, domande del candidato,
                chiusura), minuti e domande con approfondimenti e ancore. La
                traccia si apre in sola lettura; <strong>Modifica traccia</strong>{" "}
                apre l&apos;editor, dove <strong>Genera dai criteri</strong>{" "}
                propone sezioni e domande a partire dai criteri della posizione.
              </>
            ),
          },
        ]}
      />

      <GuideText>
        Una posizione può essere Bozza, Aperta o Chiusa: solo le aperte compaiono
        nel form pubblico. Una bozza (anche quella preparata dall&apos;assistente)
        si apre con <strong>Pubblica</strong> in alto; poi lo stesso pulsante
        diventa Chiudi o Riapri. Mentre è aperta,{" "}
        <strong>Copia link candidatura</strong> copia il link pubblico di quella
        sola posizione, da condividere in un annuncio. L&apos;eliminazione è
        permessa solo se non ci sono candidature.
      </GuideText>
    </GuideSection>
  );
}
