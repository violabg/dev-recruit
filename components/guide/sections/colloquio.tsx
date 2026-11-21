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
        <strong>Pianifica colloquio</strong>. Le pagine del colloquio hanno in
        alto le quattro fasi (<strong>Preparazione → Live → Scheda →
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
                Round, guida colloquio (obbligatoria), data e ora, durata, link
                della call, partecipanti con ruolo (Conduttore / Osservatore). Si
                crea il colloquio e il <strong>kit in bozza</strong>; la fase
                passa a <strong>Colloquio</strong>.
              </>
            ),
          },
          {
            title: "Proposte da confermare",
            body: (
              <>
                Un colloquio preparato con l&apos;assistente (Claude con il
                plugin dev-recruit) arriva come <strong>proposta</strong>: in
                cima al tab Colloqui, con badge <strong>Proposta</strong>,
                round, guida, data, partecipanti e chi l&apos;ha proposta.
                Finché nessuno la conferma non è pianificato nulla.{" "}
                <strong>Pianifica</strong> crea il colloquio come la
                pianificazione (kit in bozza, fase Colloquio) e apre la
                preparazione; <strong>Scarta</strong> la chiude senza
                pianificare. Su una candidatura chiusa resta solo Scarta.
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
                In alto lo stato, le domande coperte con una barra di
                avanzamento e i pulsanti per avviare o concludere. A sinistra la{" "}
                <strong>scaletta</strong>: sezioni con il <strong>timer</strong>{" "}
                e domande numerate (spunta verde se coperte, pallino blu se
                obbligatorie). Al centro la domanda con approfondimenti e le tre
                risposte attese (debole, media, forte); sotto, nel riquadro{" "}
                <strong>Le tue note</strong>: nota rapida, voto 1–5, citazione e{" "}
                <strong>Coperta</strong> (condivisa). La{" "}
                <strong>copertura dei criteri</strong> sta a destra sugli schermi
                larghi, sotto la scaletta sugli altri, con &quot;Nessuna
                prova&quot; finché non arriva evidenza e &quot;Nessuna
                domanda&quot; se il kit non copre un criterio. Note e voti si
                salvano da soli e restano in locale se cade la connessione.
              </>
            ),
          },
          {
            title: "Scheda intervistatore",
            body: (
              <>
                In alto il riepilogo (criteri con voto, senza prove,
                raccomandazione, stato); poi una scheda per criterio con voto
                1–5 o &quot;Senza prove&quot; ed evidenze; infine il giudizio
                complessivo. Salva bozza e Invia scheda restano in una barra
                fissa in basso. Precompilata con i propri voti e note;
                raccomandazione finale;
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
          height={1000}
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
          alt="Modalità live con scaletta e timer, domanda, risposte attese, note e copertura dei criteri"
          caption="Modalità live con la copertura dei criteri"
          width={1440}
          height={1215}
        />
        <GuideFigure
          src="/guida/11-scheda-inviata.png"
          alt="Scheda intervistatore con le fasi del colloquio e le schede già inviate, in sola lettura"
          caption="Schede inviate: in sola lettura, non più modificabili"
          width={1440}
          height={1198}
        />
      </div>
    </GuideSection>
  );
}
