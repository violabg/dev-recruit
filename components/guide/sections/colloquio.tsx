import {
  GuideDiagram,
  GuideFigure,
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
    participant K as Kit
    participant I as Intervistatori
    participant D as Decisione
    R->>App: Pianifica colloquio
    App->>K: Kit in bozza
    R->>K: Briefing e domande
    R->>K: Segna come pronto
    I->>K: Note, voti, coperta
    I->>App: Invia la scheda
    App->>D: Schede inviate`;

export function ColloquioSection() {
  return (
    <GuideSection meta={meta}>
      <GuideText>
        <strong>Dove:</strong> candidatura → tab Colloqui →{" "}
        <strong>Pianifica colloquio</strong>.
      </GuideText>

      <GuideDiagram chart={flow} title="Il ciclo del colloquio" />

      <GuideSteps
        steps={[
          {
            title: "Pianificazione",
            body: (
              <>
                Round, guida colloquio (obbligatoria), data e ora, durata, link
                della call, partecipanti con ruolo (Conduttore / Osservatore). Si
                crea il colloquio e il <strong>kit in bozza</strong>; la fase
                passa a <strong>Colloquio</strong>.
              </>
            ),
          },
          {
            title: "Riepilogo e .ics",
            body: (
              <>
                L&apos;app <strong>non invia email</strong>: mostra un riepilogo
                copiabile e un file .ics da condividere. Gli intervistatori
                vedono il colloquio in Agenda colloqui e in Le mie azioni.
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
                verificare; le domande, sezione per sezione, con badge di
                origine (CV, Test, Round precedente, Manuale), il{" "}
                <strong>perché</strong>, gli approfondimenti e le risposte
                attese su tre livelli (debole, media, forte); la checklist
                (cosa comunicare, logistica).{" "}
                <strong>Modifica kit</strong> apre l&apos;editor, dove si
                modificano, riordinano, aggiungono o rimuovono domande,
                ipotesi e voci. &quot;Segna come pronto&quot; chiude la
                preparazione. C&apos;è il promemoria legale fisso sulle domande
                vietate.
              </>
            ),
          },
          {
            title: "Modalità live",
            body: (
              <>
                A sinistra le sezioni con il <strong>timer</strong>. Al centro la
                domanda con approfondimenti e le tre ancore (debole/media/forte);
                nota rapida, voto 1–5, citazione, <strong>Coperta</strong>{" "}
                (condivisa). A destra la <strong>copertura dei criteri</strong>,
                con &quot;Nessuna prova&quot; finché non arriva evidenza e
                &quot;Nessuna domanda&quot; se il kit non copre un criterio. Note
                e voti si salvano da soli e restano in locale se cade la
                connessione.
              </>
            ),
          },
          {
            title: "Scheda intervistatore",
            body: (
              <>
                Precompilata con i propri voti e note; raccomandazione finale;
                invio <strong>bloccante</strong> (dopo non si modifica più,
                nemmeno dall&apos;autore). Note e voti non inviati degli altri non
                sono mai visibili; le schede già inviate sono in una sezione
                chiusa, con l&apos;invito a leggerle dopo il proprio invio.
              </>
            ),
          },
        ]}
      />

      <div className="flex flex-col gap-6 mt-1">
        <GuideFigure
          src="/guida/08-tab-colloqui.png"
          alt="Tab Colloqui di una candidatura con i colloqui pianificati"
          caption="Tab Colloqui di una candidatura"
          width={1440}
          height={1067}
        />
        <GuideFigure
          src="/guida/09-preparazione-colloquio.png"
          alt="Preparazione del colloquio in sola lettura con dettagli, scaletta, briefing e domande"
          caption="Preparazione in sola lettura: dettagli, scaletta, briefing e domande"
          width={1440}
          height={1500}
        />
        <GuideFigure
          src="/guida/10-live-copertura.png"
          alt="Modalità live con timer, domanda, ancore e copertura dei criteri"
          caption="Modalità live con la copertura dei criteri"
          width={1440}
          height={1063}
        />
        <GuideFigure
          src="/guida/11-scheda-inviata.png"
          alt="Scheda intervistatore già inviata, in sola lettura"
          caption="Scheda inviata: non è più modificabile"
          width={1440}
          height={1507}
        />
      </div>
    </GuideSection>
  );
}
