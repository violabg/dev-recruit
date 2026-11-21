import {
  GuideDiagram,
  GuideFigure,
  GuideList,
  GuideSection,
  GuideSubsection,
  GuideTable,
  GuideText,
} from "@/components/guide/guide-blocks";
import { GUIDE_SECTION } from "@/components/guide/sections";

const meta = GUIDE_SECTION.candidatura;

const stages = `stateDiagram-v2
    state "Candidato" as applied
    state "Screening" as screening
    state "Test" as assessment
    state "Colloquio" as interview
    state "Decisione" as decision
    state "Offerta" as offer
    state "Assunto" as hired
    state "Scartato" as rejected
    state "Ritirato" as withdrawn
    [*] --> applied: Candidatura ricevuta
    applied --> screening: CV valutato
    screening --> assessment: Test inviato
    assessment --> interview: Colloquio pianificato
    interview --> decision: tutte le schede inviate
    decision --> offer: Esito Offerta
    decision --> hired: Esito Assunto
    decision --> rejected: Esito Scartato
    applied --> withdrawn: posizione tolta
    offer --> hired: nuova decisione
    offer --> rejected: nuova decisione
    rejected --> [*]
    hired --> [*]
    withdrawn --> [*]
    class applied, screening, assessment, interview step
    class decision entity
    class offer, hired outcome
    class rejected, withdrawn danger
    note right of interview
        Spostabile a mano in ogni momento
        (avanti, indietro, Scartato, Ritirato)
    end note`;

export function CandidaturaSection() {
  return (
    <GuideSection meta={meta}>
      <GuideText>
        <strong>Dove:</strong> Candidature → clic sulla persona (oppure dal
        kanban della posizione). La pagina ha sempre la stessa struttura:
      </GuideText>

      <GuideList>
        <li>
          <strong>Intestazione:</strong> candidato, link alla posizione e alla
          scheda candidato, responsabile (&quot;Prendi in carico&quot; /
          &quot;Rilascia&quot;) e <strong>Sposta fase</strong>.
        </li>
        <li>
          <strong>Linea delle fasi:</strong> le fasi superate sono verdi, la
          fase attuale è blu con il giorno in cui è iniziata.
        </li>
        <li>
          <strong>Prossima azione:</strong> sotto la fase attuale, calcolata
          dallo stato, con il pulsante per farla. È il punto di partenza
          consigliato.
        </li>
        <li>
          <strong>Tab:</strong> Panoramica · CV · Test · Colloqui · Decisione.
        </li>
      </GuideList>

      <GuideSubsection id="fasi" title="Le fasi">
        <GuideDiagram chart={stages} title="Le fasi della candidatura" />
        <GuideText>
          Regola pratica: <strong>le azioni fanno avanzare la fase e non la fanno
          mai arretrare</strong>; il recruiter può comunque correggere a mano da{" "}
          <strong>Sposta fase</strong>.
        </GuideText>
      </GuideSubsection>

      <GuideSubsection
        id="prossima-azione"
        title="La Prossima azione dice cosa fare"
      >
        <GuideTable
          head={["Situazione", "Prossima azione"]}
          rows={[
            ["CV caricato ma non valutato", <strong key="a">Valuta CV</strong>],
            [
              "Fase Test senza test inviato",
              <span key="b">
                <strong>Invia test</strong> (quiz della posizione preselezionato)
              </span>,
            ],
            [
              "Test completato senza valutazione",
              <strong key="c">Genera valutazione</strong>,
            ],
            [
              "Fase Colloquio senza colloqui",
              <strong key="d">Pianifica colloquio</strong>,
            ],
            [
              "Colloquio pianificato, kit in bozza",
              <strong key="e">Prepara colloquio</strong>,
            ],
            [
              "Colloquio concluso, scheda mancante",
              <strong key="f">Compila scheda</strong>,
            ],
            [
              "Tutte le schede inviate",
              <strong key="g">Vai alla decisione</strong>,
            ],
            [
              "Nessuno dei casi sopra, candidatura aperta",
              <span key="h">
                <strong>Passa a</strong> {"<fase successiva>"}
              </span>,
            ],
            [
              "Candidatura Assunto, Scartato o Ritirato",
              <span key="i">
                <strong>Candidatura chiusa</strong> (riapribile se Scartato o
                Ritirato)
              </span>,
            ],
          ]}
        />
      </GuideSubsection>

      <GuideSubsection
        id="panoramica"
        title="Tab Panoramica · la cronologia delle prove"
      >
        <GuideText>
          Elenca in ordine di tempo ciò che è successo: candidatura ricevuta, CV
          valutato, test inviato/iniziato/completato/valutato, colloqui
          pianificati/iniziati/conclusi, fase attuale. Ogni voce con link porta
          alla prova.
        </GuideText>
        <GuideFigure
          src="/guida/07-candidatura-prossima-azione.png"
          alt="Pagina della candidatura con la linea delle fasi, la Prossima azione e la cronologia"
          caption="Candidatura: prossima azione e cronologia delle prove"
          width={1440}
          height={1000}
        />
      </GuideSubsection>

      <GuideSubsection id="cv" title="Tab CV">
        <GuideText>
          Mostra il CV caricato, il <strong>punteggio di fit 0–10</strong>, punti
          di forza e aree di miglioramento, e la{" "}
          <strong>valutazione per criterio</strong> della scheda (1–5 con
          evidenza). La stessa persona mantiene le valutazioni delle altre
          candidature.
        </GuideText>
      </GuideSubsection>

      <GuideSubsection id="test" title="Tab Test">
        <GuideText>
          I test inviati per quella candidatura con stato e link alla
          valutazione. Da qui si invia un nuovo test: si sceglie il quiz, si
          genera il link per il candidato e si segue lo stato.
        </GuideText>
        <GuideList>
          <li>Il candidato risponde su /recruiting/[token], senza account.</li>
          <li>
            La valutazione AI produce punteggio, punti di forza e debolezze e il{" "}
            <strong>dettaglio per risposta</strong> (punteggio 0–10, punti di
            forza, aree di miglioramento). Se il quiz è collegato ai criteri, il
            dettaglio diventa anche la prova del test per criterio nella
            Decisione.
          </li>
          <li>
            Se una valutazione non ha il dettaglio per risposta, &quot;Ricalcola
            dettaglio risposte&quot; lo ricostruisce senza cambiare il punteggio
            salvato.
          </li>
        </GuideList>
      </GuideSubsection>

      <GuideSubsection id="kanban" title="Candidature e kanban">
        <GuideList>
          <li>
            <strong>Candidature</strong> è la vista globale: ricerca, filtro per
            fase e posizione, &quot;Solo le mie&quot;.
          </li>
          <li>
            <strong>Posizioni → tab Selezione</strong> è il{" "}
            <strong>kanban</strong>: una colonna per fase (Scartato e Ritirato
            insieme in &quot;Chiuse&quot;), una card per candidatura, con i test
            inviati, il responsabile e &quot;Sposta fase&quot; direttamente
            sulla card.
          </li>
        </GuideList>
        <div className="flex flex-col gap-6">
          <GuideFigure
            src="/guida/06-pipeline-candidature.png"
            alt="Tabella globale delle candidature con ricerca e filtri"
            caption="Pipeline globale delle candidature"
            width={1440}
            height={1000}
          />
          <GuideFigure
            src="/guida/05-kanban-selezione.png"
            alt="Kanban della posizione con una colonna per fase"
            caption="Kanban della posizione: una colonna per fase"
            width={1656}
            height={1000}
          />
        </div>
      </GuideSubsection>
    </GuideSection>
  );
}
