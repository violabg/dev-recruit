import { AppMap } from "@/components/guide/app-map";
import {
  GuideSection,
  GuideSubsection,
  GuideTable,
  GuideText,
} from "@/components/guide/guide-blocks";
import { GUIDE_SECTION } from "@/components/guide/sections";

const meta = GUIDE_SECTION.mappa;

export function MappaSection() {
  return (
    <GuideSection meta={meta}>
      <AppMap />

      <GuideSubsection id="mappa-menu" title="Cosa trovo in ogni voce">
        <GuideTable
          head={["Voce di menu", "A cosa serve", "Cosa ci trovi dentro"]}
          rows={[
            [
              <strong key="1">Le mie azioni</strong>,
              "La homepage operativa: cosa aspetta te",
              "Posizioni con setup incompleto, test da valutare, colloqui senza kit pronto, schede da compilare; a parte, le candidature ferme da più di 7 giorni",
            ],
            [
              <strong key="2">Posizioni</strong>,
              "Preparare l'offerta",
              "Dettagli · Scheda di valutazione · Selezione (kanban) · Quiz · Guide colloquio",
            ],
            [
              <strong key="3">Candidature</strong>,
              "Seguire tutte le persone",
              'Tabella con ricerca, filtro per fase e posizione, "Solo le mie"; si apre la pagina della candidatura',
            ],
            [
              <strong key="4">Candidati</strong>,
              "Anagrafica della persona",
              'Dati, flag "Non ricontattare", elenco delle sue candidature, valutazioni',
            ],
            [
              <strong key="5">Agenda colloqui</strong>,
              "La giornata degli intervistatori",
              'Colloqui pianificati e in corso, filtro "Solo i miei", pulsanti Prepara e Live',
            ],
            [
              <strong key="6">Quiz</strong>,
              "Libreria dei test",
              "Creazione manuale o con AI, domande riusabili, invio",
            ],
            [
              <strong key="7">Test inviati</strong>,
              "Monitorare i test",
              "Stato per candidato (in attesa, completato, valutato), valutazione AI",
            ],
            [
              <strong key="8">Preset</strong>,
              "Modelli di generazione",
              "Parametri per la generazione delle domande",
            ],
          ]}
        />
      </GuideSubsection>

      <GuideSubsection id="mappa-pagina" title="Come si legge una pagina">
        <GuideText>
          In alto, nella fascia bianca, il colore della sezione: la riga
          lungo il bordo superiore e, sopra il titolo, l&apos;icona della{" "}
          <strong>sidebar</strong> con il nome del gruppo (nella pagina
          principale) o della sezione (nelle pagine interne). Seguono il
          titolo, il contesto (per esempio
          il nome del candidato e la posizione) e i pulsanti. Nelle pagine con
          un percorso (candidatura, colloquio) la fascia mostra anche la linea
          delle fasi e, sotto la fase attuale, la{" "}
          <strong>Prossima azione</strong>; sotto la fascia ci sono i tab e il
          contenuto. I{" "}
          <strong>breadcrumbs</strong> (Panoramica / Candidature / Dettaglio)
          riportano sempre al livello superiore. Nelle pagine interne a una
          sezione, la freccia a sinistra del titolo torna alla pagina
          precedente (non visibile su schermi piccoli).
        </GuideText>
      </GuideSubsection>
    </GuideSection>
  );
}
