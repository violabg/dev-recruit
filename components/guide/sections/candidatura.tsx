import {
  GuideDiagram,
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
    interview --> decision: tutti i feedback inviati
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
        kanban della posizione o da Le mie azioni). La pagina ha sempre la stessa
        struttura:
      </GuideText>

      <GuideList>
        <li>
          <strong>Intestazione:</strong> nome del candidato, una riga di
          contesto (posizione, data, fase e responsabile) e le azioni{" "}
          <strong>Profilo candidato</strong>, <strong>Sposta di fase</strong> e{" "}
          <strong>Prendi in carico</strong> / <strong>Rilascia</strong>.
        </li>
        <li>
          <strong>Storia verticale:</strong> una fermata CV, una per ogni test
          inviato, una per ogni colloquio e una Decisione.
        </li>
        <li>
          <strong>Colonna laterale:</strong> Contatti (email, CV, &quot;Non
          ricontattare&quot;) e Altre candidature della stessa persona.
        </li>
      </GuideList>

      <GuideSubsection id="fasi" title="Le fasi">
        <GuideDiagram chart={stages} title="Le fasi della candidatura" />
        <GuideText>
          Regola pratica: <strong>le azioni fanno avanzare la fase e non la fanno
          mai arretrare</strong>; il recruiter può comunque correggere a mano da{" "}
          <strong>Sposta di fase</strong>.
        </GuideText>
      </GuideSubsection>

      <GuideSubsection
        id="prossima-azione"
        title="La fermata corrente dice cosa fare"
      >
        <GuideTable
          head={["Situazione", "Prossima azione"]}
          rows={[
            ["CV caricato ma non valutato", <strong key="a">Valuta CV</strong>],
            [
              "Fase Test senza test inviato",
              <span key="b">
                <strong>Invia test</strong> (test della posizione preselezionato)
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
              "Colloquio pianificato, preparazione in bozza",
              <strong key="e">Prepara colloquio</strong>,
            ],
            [
              "Colloquio concluso, feedback mancante",
              <strong key="f">Scrivi il feedback</strong>,
            ],
            [
              "Tutti i feedback inviati",
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
        title="La storia della candidatura"
      >
        <GuideText>
          Ogni fermata mostra lo stato della sua prova:
        </GuideText>
        <GuideList>
          <li>
            <strong>Conclusa:</strong> una riga con il titolo, l&apos;esito e il
            pulsante <strong>Apri</strong>, che mostra il contenuto (valutazione
            del CV, risultati del test, feedback del colloquio, decisione).
          </li>
          <li>
            <strong>Corrente:</strong> aperta, con i dettagli e l&apos;unico
            pulsante blu della pagina: la prossima azione.
          </li>
          <li>
            <strong>Futura:</strong> tratteggiata, con la condizione che la
            sblocca (per esempio &quot;Si apre quando tutti i feedback dei
            colloqui sono inviati&quot;).
          </li>
        </GuideList>
      </GuideSubsection>

      <GuideSubsection id="cv" title="La fermata CV">
        <GuideText>
          Mostra il CV caricato, il <strong>punteggio di fit 0–10</strong>, punti
          di forza e aree di miglioramento, e la{" "}
          <strong>valutazione per criterio</strong> (1–5 con evidenza). La stessa
          persona mantiene le valutazioni delle altre candidature.
        </GuideText>
      </GuideSubsection>

      <GuideSubsection id="test" title="Le fermate Test">
        <GuideText>
          Una fermata per ogni test inviato, con stato e link alla valutazione.
          Nella fermata corrente di un test da inviare si sceglie il test, si
          genera il link per il candidato e si segue lo stato.
        </GuideText>
        <GuideList>
          <li>Il candidato risponde su /recruiting/[token], senza account.</li>
          <li>
            La valutazione AI produce punteggio, punti di forza e debolezze e il{" "}
            <strong>analisi per risposta</strong> (punteggio 0–10, punti di
            forza, aree di miglioramento). Se il test è collegato ai criteri,
            l&apos;analisi diventa anche la prova del test per criterio nella
            Decisione.
          </li>
          <li>
            Se una valutazione non ha l&apos;analisi per risposta, &quot;Ricalcola
            le risposte&quot; la ricostruisce senza cambiare il punteggio
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
            <strong>Posizioni → tab Candidati</strong> è il{" "}
            <strong>kanban</strong>: una colonna per fase (Scartato e Ritirato
            insieme in &quot;Chiuse&quot;), una card per candidatura, con i test
            inviati, il responsabile e &quot;Sposta fase&quot; direttamente
            sulla card. Le card che aspettano un&apos;azione tua sono
            evidenziate.
          </li>
        </GuideList>
      </GuideSubsection>
    </GuideSection>
  );
}
