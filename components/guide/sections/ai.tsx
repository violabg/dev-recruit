import {
  GuideCallout,
  GuideSection,
  GuideTable,
} from "@/components/guide/guide-blocks";
import { GUIDE_SECTION } from "@/components/guide/sections";

const meta = GUIDE_SECTION.ai;

export function AiSection() {
  return (
    <GuideSection meta={meta}>
      <GuideTable
        head={["Momento", "Cosa propone l'AI", "Cosa fa la persona"]}
        rows={[
          ["Descrizione posizione", "Testo della job description", "Modifica e salva"],
          [
            "Scheda di valutazione",
            "Criteri, categorie, priorità, pesi",
            "Conferma, modifica, archivia",
          ],
          [
            "Quiz",
            "Domande (e collegamento ai criteri)",
            "Rivede, modifica, salva",
          ],
          ["Guida colloquio", "Sezioni e domande dalla scheda", "Rivede, modifica, salva"],
          [
            "Valutazione CV",
            "Fit, punti di forza e debolezze, voto per criterio",
            "Legge; può ricalcolare il dettaglio",
          ],
          [
            "Valutazione test",
            "Punteggio e dettaglio per risposta",
            "Legge; può ricalcolare il dettaglio",
          ],
          [
            "Kit colloquio",
            "Briefing, ipotesi, domande dai CV, dai test e dai round precedenti",
            "Conferma e salva il kit",
          ],
          ["Decisione", "Avvocato del diavolo", "Sceglie l'esito e scrive la motivazione"],
          [
            "Assistente (Claude, fuori dall'app)",
            "Bozza di posizione, anteprima del quiz, bozza del kit, proposta di colloquio",
            "Conferma nel riquadro dell'assistente o dalla dashboard (il quiz solo nel riquadro)",
          ],
        ]}
      />

      <GuideCallout title="Regola costante">
        La generazione AI <strong>non salva mai da sola</strong>. Nell&apos;app
        ogni proposta passa da una conferma umana e le proposte non confermate
        non compaiono nelle altre pagine. L&apos;assistente esterno (Claude con
        il plugin dev-recruit) può preparare bozze e proposte: restano in attesa
        finché una persona non le conferma, come le proposte di colloquio in
        &quot;Proposte da confermare&quot;, nel tab Colloqui.
      </GuideCallout>
    </GuideSection>
  );
}
