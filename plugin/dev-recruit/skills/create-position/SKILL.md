---
name: create-position
description: Prepara una nuova posizione in dev-recruit come bozza, da una descrizione libera del ruolo
---

Usa questa skill quando l'utente vuole aprire o preparare una nuova posizione (un ruolo da coprire).

1. Raccogli dall'utente, con al massimo una domanda per volta:
   - titolo del ruolo;
   - livello di esperienza (usa i livelli già presenti: chiama `list_positions` e riprendi il livello delle posizioni simili);
   - competenze tecniche (almeno una) e soft skill;
   - tipo di contratto, se lo conosce;
   - una descrizione breve: responsabilità, contesto del team, cosa rende il ruolo interessante.
2. Scrivi tu la descrizione se l'utente ti dà solo appunti: chiara, in italiano, senza requisiti discriminatori (età, genere, provenienza, stato civile).
3. Riassumi la bozza in poche righe e chiedi se procedere.
4. Chiama `create_position_draft`. La posizione nasce in bozza: non è visibile ai candidati.
5. Spiega che la pubblica una persona con il pulsante "Pubblica la posizione" nel riquadro o dalla pagina della posizione, e che prima conviene completare scheda di valutazione, quiz e guida colloquio. Indica il link restituito dallo strumento.

Non pubblicare tu la posizione e non dire che è aperta finché lo strumento non lo conferma.

Esempio (dati di fantasia):

> Ho preparato la bozza "Frontend Developer" (livello Senior, React e TypeScript). Vuoi che la salvi in dev-recruit?
