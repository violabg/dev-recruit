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
            "Criteri",
            "Criteri, categorie, priorità, pesi",
            "Conferma, modifica, archivia",
          ],
          [
            "Test",
            "Domande (e collegamento ai criteri)",
            "Rivede, modifica, salva",
          ],
          [
            "Traccia del colloquio",
            "Sezioni e domande dai criteri",
            "Rivede, modifica, salva",
          ],
          [
            "Valutazione CV",
            "Fit, punti di forza e debolezze, voto per criterio",
            "Legge; può ricalcolare l'analisi",
          ],
          [
            "Valutazione test",
            "Punteggio e analisi per risposta",
            "Legge; può ricalcolare l'analisi",
          ],
          [
            "Preparazione",
            "Briefing, ipotesi, domande dai CV, dai test e dai round precedenti",
            "Segna come pronta, dal riquadro o dalla preparazione",
          ],
          ["Decisione", "Avvocato del diavolo", "Sceglie l'esito e scrive la motivazione"],
          [
            "Assistente (Claude, fuori dall'app)",
            "Bozza di posizione, anteprima del test, preparazione in bozza, proposta di colloquio",
            "Conferma nel riquadro dell'assistente o dalla dashboard (il test solo nel riquadro)",
          ],
        ]}
      />

      <GuideCallout title="Regola costante">
        La generazione AI <strong>non salva mai da sola</strong>. Nell&apos;app
        ogni proposta passa da una conferma umana e le proposte non confermate
        non compaiono nelle altre pagine. L&apos;assistente esterno (Claude con
        il plugin dev-recruit) può preparare bozze e proposte: restano in attesa
        finché una persona non le conferma, come le proposte di colloquio in
        &quot;Proposte da confermare&quot;, nella fermata del colloquio.
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
              "Le mie azioni, posizioni, candidature, colloqui, preparazioni",
              "Niente: la lettura non modifica nulla",
            ],
            [
              "Posizione",
              "Una bozza o il modulo precompilato con i campi della posizione",
              "Pubblica la posizione, dal riquadro o dalla pagina",
            ],
            [
              "Test",
              "I parametri di generazione e l'anteprima delle domande",
              "Salva il test dal riquadro; nessun candidato viene invitato",
            ],
            [
              "Colloquio",
              "Una proposta con traccia, round, data, durata e partecipanti",
              'Pianifica, dal riquadro o da "Pianifica" nella proposta della fermata del colloquio',
            ],
            [
              "Preparazione",
              "Modifiche a domande, briefing, ipotesi e checklist",
              "Segna come pronta, dal riquadro o dalla preparazione",
            ],
          ]}
        />

        <GuideText>
          La preparazione del colloquio che l&apos;assistente legge non contiene
          l&apos;identità del candidato né il CV. Una proposta di colloquio non
          invia email: crea il colloquio e la preparazione in bozza solo dopo la
          tua conferma. Nei client senza riquadri, posizione, proposta e
          preparazione si confermano dalla pagina; il test si salva solo dal
          riquadro.
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
