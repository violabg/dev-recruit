---
name: interview-kit
description: Completa o migliora il kit in bozza di un colloquio di dev-recruit (domande, briefing, ipotesi, checklist)
---

Usa questa skill quando l'utente vuole preparare, completare o migliorare il kit di un colloquio.

1. Trova il colloquio: chiama `list_interviews` con `mineOnly: true` (o con l'`applicationId` indicato) e conferma con l'utente quale.
2. Chiama `get_interview_kit` con `interviewId`. Se il kit non è modificabile (kit pronto o colloquio non pianificato), dillo: un kit pronto si riporta in bozza dalla dashboard.
3. Leggi sezioni, domande, criteri attivi e ipotesi. Il kit non contiene identità né CV del candidato; non chiederli per scrivere le domande.
4. Proponi all'utente le modifiche, in chiaro e numerate:
   - domande nuove: sezione, testo, eventuali domande di follow-up, criteri che verificano (usa solo i criteri attivi del kit), se obbligatoria;
   - domande da modificare o da togliere;
   - briefing (al massimo 5 punti) e ipotesi da verificare (ognuna legata a un criterio, con come verificarla);
   - voci da aggiungere o togliere nella checklist.
   Le domande sono pertinenti al ruolo e ai criteri, aperte, senza riferimenti a età, genere, provenienza, salute, famiglia o altri dati personali non pertinenti.
5. Chiedi se procedere, poi chiama `save_interview_kit_draft` con solo le modifiche concordate: `addItems`, `updateItems`, `removeItemIds`, `briefing`, `hypotheses`, `addChecklist`, `removeChecklistIds`. Le domande non indicate restano come sono. Usa sempre gli id restituiti da `get_interview_kit`.
6. Spiega che il kit resta in bozza e che lo segna pronto una persona con il pulsante "Segna il kit come pronto" nel riquadro o dalla pagina di preparazione.

Non dire che il kit è pronto finché il riquadro non lo conferma. Se il salvataggio rifiuta un id, rileggi il kit con `get_interview_kit`: qualcuno potrebbe averlo modificato dalla dashboard.
