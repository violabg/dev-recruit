import {
  GuideDiagram,
  GuideFigure,
  GuideList,
  GuideSection,
  GuideText,
} from "@/components/guide/guide-blocks";
import { GUIDE_SECTION } from "@/components/guide/sections";

const meta = GUIDE_SECTION.decisione;

const flow = `flowchart TD
    M["Matrice criteri × fonti<br/>CV · Test · Colloqui · intervistatori"]
    M --> S["Punteggio complessivo 1–5<br/>media pesata sui criteri con prove"]
    M --> W["Avvisi<br/>criteri indispensabili scoperti"]
    M --> X["Badge Disaccordo<br/>scarto ≥ 2"]
    M --> G["Righe globali<br/>CV/Test non collegati"]
    W --> F["Form decisione<br/>esito + motivazione"]
    A["Avvocato del diavolo<br/>AI, non salvato"] --> F
    F --> R["Decisione registrata<br/>esito, motivazione, utente, data, pesi"]
    R --> ST["La fase avanza<br/>Offerta · Assunto · Scartato"]`;

export function DecisioneSection() {
  return (
    <GuideSection meta={meta}>
      <GuideText>
        <strong>Dove:</strong> candidatura → tab Decisione →{" "}
        <strong>Apri la decisione</strong>, oppure &quot;Vai alla
        decisione&quot; dalla prossima azione.
      </GuideText>

      <GuideDiagram chart={flow} title="Dalla matrice alla decisione registrata" />

      <GuideText>Cosa si vede:</GuideText>

      <GuideList>
        <li>
          <strong>Punteggio complessivo</strong> su 5 con i pesi della scheda.
          Sotto la candidatura non decisa: &quot;Pesi della scheda di
          valutazione&quot;; dopo la decisione: &quot;Pesi salvati con la
          decisione del …&quot;.
        </li>
        <li>
          <strong>Matrice</strong>: una riga per criterio, una colonna per fonte
          (CV, Test, ogni colloquio con la media, ogni singolo intervistatore con
          la sua raccomandazione), più Valore e Peso. Le celle senza prova sono
          evidenziate; i voti discordanti hanno il badge{" "}
          <strong>Disaccordo</strong>.
        </li>
        <li>
          <strong>Criteri indispensabili da motivare</strong>: un criterio
          indispensabile senza prove o sotto il livello atteso{" "}
          <strong>non azzera il punteggio</strong>, ma deve essere affrontato
          nella motivazione (compare anche nel form &quot;Da motivare&quot;).
        </li>
        <li>
          <strong>Avvocato del diavolo</strong>: chiede all&apos;AI 3–5 motivi
          per cui l&apos;esito scelto potrebbe essere sbagliato. È una proposta:
          non si salva.
        </li>
        <li>
          <strong>Indipendenza</strong>: chi è partecipante di un colloquio e non
          ha ancora inviato la propria scheda vede colonne, valori, punteggio e
          avvisi chiusi con &quot;•••&quot; e il pulsante{" "}
          <strong>Mostra</strong>.
        </li>
      </GuideList>

      <GuideText>
        <strong>Registrare la decisione</strong> salva esito, motivazione,
        utente, data e pesi usati, e porta la candidatura alla fase
        dell&apos;esito. Su una candidatura Assunto, Scartato o Ritirato il form
        è disattivato (&quot;Candidatura chiusa: riaprila per registrare la
        decisione&quot;). Su Offerta si può registrare una nuova decisione (per
        esempio Assunto): l&apos;ultima sostituisce la precedente.
      </GuideText>

      <GuideFigure
        src="/guida/12-decisione.png"
        alt="Pagina Decisione con matrice criteri per fonte, punteggio complessivo e form"
        caption="Pagina Decisione: matrice, punteggio e form"
        width={1440}
        height={1918}
      />
    </GuideSection>
  );
}
