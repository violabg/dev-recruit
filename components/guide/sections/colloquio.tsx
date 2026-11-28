import {
  GuideDiagram,
  GuideSection,
  GuideSteps,
  GuideText,
} from "@/components/guide/guide-blocks";
import { GUIDE_SECTION } from "@/components/guide/sections";

const meta = GUIDE_SECTION.colloquio;

const flow = `sequenceDiagram
    autonumber
    participant R as Recruiter
    participant App as Candidatura
    participant P as Preparazione
    participant I as Intervistatori
    participant D as Decisione
    R->>App: Pianifica colloquio
    App->>P: Preparazione in bozza
    R->>P: Briefing e domande
    R->>P: Segna come pronta
    I->>P: Note, voti, coperta
    I->>App: Invia il feedback
    App->>D: Feedback inviati`;

export function ColloquioSection() {
  return (
    <GuideSection meta={meta}>
      <GuideText>
        <strong>Dove:</strong> candidatura → fermata del colloquio →{" "}
        <strong>Pianifica colloquio</strong>. Le pagine del colloquio hanno in
        alto le quattro fasi (<strong>Preparazione → Live → Feedback →
        Decisione</strong>): la fase aperta è evidenziata, quelle superate hanno
        la spunta verde e ogni fase è un link. Il riquadro{" "}
        <strong>Prossima azione</strong> indica cosa fare dopo, con il pulsante
        per farlo.
      </GuideText>

      <GuideDiagram chart={flow} title="Il ciclo del colloquio" />

      <GuideSteps
        steps={[
          {
            title: "Pianificazione",
            body: (
              <>
                Round, traccia del colloquio (obbligatoria), data e ora, durata,
                link della call, partecipanti con ruolo (Conduttore /
                Osservatore). Si crea il colloquio e la{" "}
                <strong>preparazione in bozza</strong>; la fase passa a{" "}
                <strong>Colloquio</strong>.
              </>
            ),
          },
          {
            title: "Proposte da confermare",
            body: (
              <>
                Un colloquio preparato con l&apos;assistente (Claude con il
                plugin dev-recruit) arriva come <strong>proposta</strong>: nella
                fermata del colloquio, con badge <strong>Proposta</strong>,
                round, traccia, data, partecipanti e chi l&apos;ha proposta.
                Finché nessuno la conferma non è pianificato nulla.{" "}
                <strong>Pianifica</strong> crea il colloquio come la
                pianificazione (preparazione in bozza, fase Colloquio) e apre la
                preparazione; <strong>Scarta</strong> la chiude senza pianificare.
                Su una candidatura chiusa resta solo Scarta.
              </>
            ),
          },
          {
            title: "Riepilogo e .ics",
            body: (
              <>
                L&apos;app <strong>non invia email</strong>: mostra un riepilogo
                copiabile e un file .ics da condividere. Gli intervistatori
                vedono il colloquio in Agenda e in Le mie azioni.
              </>
            ),
          },
          {
            title: "Preparazione",
            body: (
              <>
                La pagina è in sola lettura. In alto la{" "}
                <strong>scaletta</strong>: minuti previsti, numero di domande e
                obbligatorie, avanzamento della checklist e l&apos;elenco delle
                sezioni (un clic porta alla sezione). Poi briefing e ipotesi da
                verificare; le domande, sezione per sezione, con badge di origine
                (CV, Test, Round precedente, Manuale), il <strong>perché</strong>,
                gli approfondimenti e le risposte attese su tre livelli (debole,
                media, forte); la checklist (cosa comunicare, logistica).{" "}
                <strong>Modifica la preparazione</strong> apre l&apos;editor, dove
                si modificano, riordinano, aggiungono o rimuovono domande,
                ipotesi e voci. Con la preparazione in bozza (anche quella
                preparata dall&apos;assistente) <strong>Segna come pronta</strong>{" "}
                è in alto nella pagina e nell&apos;editor, e chiude la
                preparazione. C&apos;è il promemoria legale fisso sulle domande
                vietate.
              </>
            ),
          },
          {
            title: "Modalità live",
            body: (
              <>
                In alto lo stato, le domande coperte con una barra di avanzamento
                e i pulsanti per avviare o concludere. A sinistra la{" "}
                <strong>scaletta</strong>: sezioni con il <strong>timer</strong> e
                domande numerate (spunta verde se coperte, pallino blu se
                obbligatorie). Al centro la domanda con approfondimenti e le tre
                risposte attese (debole, media, forte); sotto, nel riquadro{" "}
                <strong>Le tue note</strong>: nota rapida, voto 1–5, citazione e{" "}
                <strong>Coperta</strong> (condivisa). La{" "}
                <strong>copertura dei criteri</strong> sta a destra sugli schermi
                larghi, sotto la scaletta sugli altri, con &quot;Nessuna
                prova&quot; finché non arriva evidenza e &quot;Nessuna
                domanda&quot; se la preparazione non copre un criterio. Note e
                voti si salvano da soli e restano in locale se cade la
                connessione.
              </>
            ),
          },
          {
            title: "Feedback del colloquio",
            body: (
              <>
                In alto il riepilogo (criteri con voto, senza prove,
                raccomandazione, stato); poi una riga per criterio con voto 1–5
                o &quot;Senza prove&quot; ed evidenze; infine il giudizio
                complessivo. Salva bozza e <strong>Invia feedback</strong>{" "}
                restano in una barra fissa in basso. Precompilata con i propri
                voti e note; raccomandazione finale; invio{" "}
                <strong>bloccante</strong> (dopo non si modifica più, nemmeno
                dall&apos;autore). Note e voti non inviati degli altri non sono
                mai visibili; i <strong>feedback già inviati</strong> sono in una
                sezione chiusa, con l&apos;invito a leggerli dopo il proprio
                invio.
              </>
            ),
          },
        ]}
      />
    </GuideSection>
  );
}
