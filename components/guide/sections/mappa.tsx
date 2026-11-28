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
              "Posizioni da preparare, test da valutare, colloqui senza preparazione pronta, feedback da inviare; a parte, le candidature ferme da più di 7 giorni",
            ],
            [
              <strong key="2">Posizioni</strong>,
              "Preparare l'offerta",
              "Candidati (kanban) · Criteri e domande · Dettagli",
            ],
            [
              <strong key="3">Candidati</strong>,
              "Anagrafica della persona",
              'Dati, flag "Non ricontattare", elenco delle sue candidature, valutazioni',
            ],
            [
              <strong key="4">Agenda</strong>,
              "La giornata degli intervistatori",
              'Colloqui pianificati e in corso, filtro "Solo i miei", pulsanti Prepara e Live',
            ],
            [
              <strong key="5">Candidature</strong>,
              "Seguire tutte le persone",
              'Tutte le candidature, con ricerca, filtro per fase e posizione e "Solo le mie"; ognuna si apre anche dalla posizione, dal candidato o da Le mie azioni',
            ],
            [
              <strong key="6">Test</strong>,
              "I test da assegnare",
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
          In alto, nella fascia bianca, il colore della sezione: la riga lungo
          il bordo superiore e, sopra il titolo, l&apos;icona della{" "}
          <strong>sidebar</strong> con il nome del gruppo (nella pagina
          principale) o della sezione (nelle pagine interne). Seguono il
          titolo, il contesto (per esempio il nome del candidato e la
          posizione) e i pulsanti. I <strong>breadcrumbs</strong> riportano i
          nomi reali (Posizioni / Senior Frontend Developer / Luca Bianchi) e
          sono la navigazione all&apos;indietro: non c&apos;è freccia indietro.
          Ogni
          pagina ha <strong>un solo pulsante blu</strong>, il prossimo passo;
          gli altri sono outline. La pagina della candidatura è una{" "}
          <strong>storia di fermate</strong>: le concluse sono una riga con esito
          e &quot;Apri&quot;, quella corrente è aperta con l&apos;unico pulsante
          blu, le future sono tratteggiate con la condizione che le sblocca.
        </GuideText>
      </GuideSubsection>
    </GuideSection>
  );
}
