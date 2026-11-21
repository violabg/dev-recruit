---
name: action-center
description: Mostra e ordina il lavoro che ti aspetta in dev-recruit (Le mie azioni)
---

Usa questa skill quando l'utente chiede cosa deve fare in dev-recruit, cosa lo aspetta oggi o qual è il prossimo passo della selezione.

1. Chiama lo strumento `action_center` con `mineOnly: true`. Usa `mineOnly: false` solo se l'utente chiede esplicitamente il lavoro di tutti.
2. Presenta le code in questo ordine, saltando quelle vuote e indicando quante voci ha ciascuna:
   1. Schede di valutazione da compilare (colloqui conclusi senza la scheda).
   2. Kit da preparare (colloqui di oggi e domani senza kit pronto).
   3. Test da valutare.
   4. Candidature ferme da più di 7 giorni.
   5. Posizioni con setup incompleto.
3. Per ogni voce indica il link alla dashboard restituito dallo strumento.
4. Proponi le prossime azioni, una per coda, partendo dalla prima non vuota. Chiedi sempre conferma prima di usare uno strumento che scrive.
5. Se tutte le code sono vuote, dillo in una riga e indica il link a "Le mie azioni".

Esempio (nomi di fantasia):

> Hai 1 scheda da compilare: Mario Rossi, Backend Developer, round 2.
> Hai 1 kit da preparare: Giulia Bianchi, Frontend Developer, domani alle 10:00.
> Vuoi iniziare dalla scheda di Mario Rossi? Apri in dev-recruit: (link restituito dallo strumento)
