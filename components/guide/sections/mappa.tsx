import {
  GuideDiagram,
  GuideList,
  GuideSection,
  GuideSubsection,
  GuideTable,
  GuideText,
} from "@/components/guide/guide-blocks";
import { GUIDE_SECTION } from "@/components/guide/sections";

const meta = GUIDE_SECTION.mappa;

const map = `mindmap
  root((DevRecruit))
    Panoramica
      Le mie azioni
    Selezione
      Posizioni
        Scheda di valutazione
        Selezione kanban
        Quiz
        Guide colloquio
      Candidature
        CV
        Test
        Colloqui
        Decisione
      Candidati
      Agenda colloqui
    Libreria
      Quiz
      Test inviati
      Preset
    Impostazioni
      Dati di riferimento
      Utenti #40;solo amministratori#41;
      Profilo`;

export function MappaSection() {
  return (
    <GuideSection meta={meta}>
      <GuideDiagram chart={map} title="La mappa delle sezioni dell'app" />

      <GuideSubsection id="mappa-menu" title="Cosa trovo in ogni voce">
        <GuideTable
          head={["Voce di menu", "A cosa serve", "Cosa ci trovi dentro"]}
          rows={[
            [
              <strong key="1">Le mie azioni</strong>,
              "La homepage operativa: cosa aspetta te",
              "Test da valutare, candidature ferme da più di 7 giorni, posizioni con setup incompleto, colloqui senza kit pronto, schede da compilare",
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
            [
              <strong key="9">Utenti</strong>,
              "Gestire chi accede (Impostazioni, solo amministratori)",
              "Elenco con ricerca per nome o email, ruolo, email verificata, stato, data di creazione, ultimo accesso e sessioni attive; Nuovo utente; dettaglio con dati, ruolo, verifica email, reimposta password, blocca o sblocca, sessioni",
            ],
          ]}
        />
      </GuideSubsection>

      <GuideSubsection id="mappa-pagina" title="Come si legge una pagina">
        <GuideText>
          In alto a sinistra il titolo e il contesto (per esempio il nome del
          candidato e la posizione), sotto la <strong>card Prossima azione</strong>{" "}
          quando la pagina è una candidatura, poi i tab. Le briciole di pane
          (Panoramica / Candidature / Dettaglio) riportano sempre al livello
          superiore.
        </GuideText>
      </GuideSubsection>

      <GuideSubsection id="accesso" title="Accesso e utenti">
        <GuideText>
          <strong>Due ruoli: Utente e Amministratore.</strong> Il ruolo cambia
          solo chi vede <strong>Impostazioni → Utenti</strong>: ogni utente
          autenticato, amministratore o no, vede e modifica tutti i dati di
          selezione (posizioni, candidature, colloqui, decisioni).
        </GuideText>
        <GuideList>
          <li>
            <strong>Registrazione aperta.</strong> Chiunque si registra da
            Registrati nella pagina di accesso. L&apos;app non invia email: un
            nuovo account può accedere solo dopo che un amministratore ha
            attivato <strong>Email verificata</strong> dal suo dettaglio in
            Impostazioni → Utenti. Il nuovo utente avvisa l&apos;amministratore
            con altri mezzi, fuori dall&apos;app; finché la verifica non è
            attiva, l&apos;accesso mostra &quot;La tua email non è ancora
            verificata. Chiedi a un amministratore di verificarla per poter
            accedere.&quot;
          </li>
          <li>
            <strong>Account creati da un amministratore.</strong> In
            Impostazioni → Utenti → Nuovo utente l&apos;amministratore indica
            nome, cognome, email, password iniziale, ruolo e Email verificata
            (attiva: l&apos;utente entra subito). La password iniziale si
            comunica a mano.
          </li>
          <li>
            <strong>La propria password.</strong> Un utente autenticato la
            cambia da Profilo → Cambia password, indicando quella attuale. Una
            password dimenticata non si recupera via email: la reimposta un
            amministratore dal dettaglio utente (Reimposta password) e la
            comunica a mano.
          </li>
          <li>
            <strong>Blocco.</strong> Un amministratore blocca un utente indicando
            il motivo: l&apos;utente non può più accedere, le sue sessioni aperte
            si chiudono e non compare tra i partecipanti proponibili per un
            colloquio. Sblocca utente gli restituisce l&apos;accesso. Gli utenti
            non si eliminano mai: si bloccano.
          </li>
          <li>
            <strong>Sessioni.</strong> Il dettaglio utente elenca le sessioni
            attive: Chiudi sessione ne chiude una, Chiudi tutte le chiude tutte.
            Togliere la verifica email o reimpostare la password non chiude le
            sessioni aperte.
          </li>
          <li>
            <strong>Regole di sicurezza.</strong> Resta sempre almeno un
            amministratore attivo: l&apos;ultimo non perde il ruolo e non si
            blocca. Nessuno blocca sé stesso né cambia il proprio ruolo o la
            verifica della propria email.
          </li>
        </GuideList>
        <GuideText>
          Il primo amministratore viene impostato all&apos;installazione
          dell&apos;applicazione. Gli altri si nominano dall&apos;app, in
          Impostazioni → Utenti.
        </GuideText>
      </GuideSubsection>
    </GuideSection>
  );
}
