---
name: schedule-interview
description: Propone un colloquio per una candidatura di dev-recruit (guida, data, partecipanti), da confermare nel riquadro
---

Usa questa skill quando l'utente vuole fissare o organizzare un colloquio con un candidato.

1. Individua la candidatura: chiama `action_center` o `get_application` e conferma con l'utente quale usare.
2. Dove ci sono i riquadri, chiama `open_schedule_form` con `applicationId` e quello che sai già (guida, round, `scheduledAt` ISO con il fuso, durata, link della call, partecipanti): la persona completa i campi e preme "Pianifica colloquio" nel riquadro, che pianifica senza inviare email. Non servono i passi seguenti. Senza riquadri, prosegui così.
3. Chiama `get_scheduling_options` con `applicationId`: restituisce le guide della posizione, le persone del team, il prossimo round e le proposte già in attesa.
4. Se non ci sono guide, spiega che va creata una guida colloquio dalla dashboard e fermati.
5. Concorda con l'utente: guida, round (di solito quello proposto), data e ora, durata in minuti, link della call (facoltativo), partecipanti. Serve esattamente un conduttore (`lead`); gli altri sono osservatori (`observer`).
6. Scrivi `scheduledAt` in formato ISO con il fuso, per esempio `2026-11-25T10:00:00+01:00`, e ripeti all'utente data e ora in italiano prima di procedere.
7. Chiama `propose_interview_slot`. Lo strumento salva solo una proposta: non pianifica nulla e non invia email.
8. Spiega che il colloquio si pianifica con il pulsante "Pianifica il colloquio" nel riquadro, oppure con "Pianifica" sulla proposta nel tab Colloqui della candidatura; la pianificazione crea anche il kit in bozza.

Non dire che il colloquio è pianificato finché il riquadro non lo conferma. Non promettere inviti o email: dev-recruit non ne invia.
