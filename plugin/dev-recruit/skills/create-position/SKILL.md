---
name: create-position
description: Prepara una nuova posizione in dev-recruit come bozza, da una descrizione libera del ruolo
---

Usa questa skill quando l'utente vuole aprire o preparare una nuova posizione (un ruolo da coprire).

Nei client con i riquadri (claude.ai, Claude desktop) usa il modulo:

1. Chiama `open_position_form` con quello che sai già dalla conversazione: titolo, livello, competenze, soft skill, contratto, descrizione. Tutti i campi sono facoltativi: non fare domande prima, i campi mancanti li completa la persona nel modulo.
2. Se l'utente ti ha dato appunti sul ruolo, scrivi tu la descrizione e passala nel campo `description`: chiara, in italiano, senza requisiti discriminatori (età, genere, provenienza, stato civile).
3. Spiega in una riga che il modulo è nel riquadro: la persona controlla i campi e preme "Salva bozza", poi può pubblicare con "Pubblica la posizione". Non dire che la bozza è salvata finché il riquadro non te lo comunica.
4. Se la persona preme "Scrivi con l'assistente", ricevi i campi del modulo: scrivi la descrizione e richiama `open_position_form` con gli stessi campi e la descrizione.

Se il riquadro non è disponibile (per esempio VS Code senza MCP Apps):

1. Raccogli dall'utente, con al massimo una domanda per volta:
   - titolo del ruolo;
   - livello di esperienza (usa i livelli già presenti: chiama `list_positions` e riprendi il livello delle posizioni simili);
   - competenze tecniche (almeno una) e soft skill;
   - tipo di contratto, se lo conosce;
   - una descrizione breve: responsabilità, contesto del team, cosa rende il ruolo interessante.
2. Scrivi tu la descrizione se l'utente ti dà solo appunti, con le stesse regole.
3. Riassumi la bozza in poche righe e chiedi se procedere.
4. Chiama `create_position_draft`. La posizione nasce in bozza: non è visibile ai candidati.
5. Spiega che la pubblica una persona dalla pagina della posizione, e che prima conviene completare scheda di valutazione, quiz e guida colloquio. Indica il link restituito dallo strumento.

Non pubblicare tu la posizione e non dire che è aperta finché lo strumento non lo conferma.

Esempio (dati di fantasia):

> Ho preparato la bozza "Frontend Developer" (livello Senior, React e TypeScript). Vuoi che la salvi in dev-recruit?
