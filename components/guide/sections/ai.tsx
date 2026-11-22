import {
  GuideCallout,
  GuideSection,
  GuideSubsection,
  GuideTable,
  GuideText,
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

      <GuideSubsection id="ai-assistente-esterno" title="L'assistente esterno">
        <GuideText>
          Oltre all&apos;AI dentro l&apos;app, un assistente esterno — Claude con
          il plugin dev-recruit, oppure VS Code Copilot — può leggere gli stessi
          dati e preparare bozze da fuori. È un canale facoltativo: l&apos;app
          resta il posto dove si conferma, si salva e si decide.
        </GuideText>

        <GuideTable
          head={["Cosa può fare", "Cosa prepara", "Cosa confermi tu"]}
          rows={[
            [
              "Leggere",
              "Le mie azioni, posizioni, candidature, colloqui, preparazione e kit",
              "Niente: la lettura non modifica nulla",
            ],
            [
              "Posizione",
              "Una bozza o il modulo precompilato con i campi della posizione",
              "Pubblica la posizione, dal riquadro o dalla pagina",
            ],
            [
              "Quiz",
              "I parametri di generazione e l'anteprima delle domande",
              "Salva il quiz dal riquadro; nessun candidato viene invitato",
            ],
            [
              "Colloquio",
              "Una proposta con guida, round, data, durata e partecipanti",
              'Pianifica, dal riquadro o da "Pianifica" nella proposta del tab Colloqui',
            ],
            [
              "Kit",
              "Modifiche a domande, briefing, ipotesi e checklist",
              "Segna il kit come pronto, dal riquadro o dalla preparazione",
            ],
          ]}
        />

        <GuideText>
          La preparazione del colloquio che l&apos;assistente legge non contiene
          l&apos;identità del candidato né il CV. Una proposta di colloquio non
          invia email: crea il colloquio e il kit in bozza solo dopo la tua
          conferma. Nei client senza riquadri, posizione, proposta e kit si
          confermano dalla pagina; il quiz si salva solo dal riquadro.
        </GuideText>

        <GuideCallout title="Cosa resta nella dashboard">
          Decisioni finali, eliminazioni, messaggi e inviti ai candidati,
          assegnazione dei test, kanban e azioni massive si fanno solo
          nell&apos;app. L&apos;assistente non può confermare le proprie bozze
          da solo: il pulsante lo premi tu.
        </GuideCallout>
      </GuideSubsection>
    </GuideSection>
  );
}
