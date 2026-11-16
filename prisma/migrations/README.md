# Migrazioni del database

Lo schema cambia solo con migrazioni versionate di Prisma Migrate, salvate in questa cartella e committate insieme al codice che le richiede. `prisma db push` non si usa mai: su una tabella rinominata la elimina e la ricrea, perdendo le righe.

- `0_init` fotografa lo schema com'era prima della Fase 1. Non va mai eseguita su un database esistente: si segna soltanto come già applicata.
- `20261115000000_application_hub` è la migrazione della Fase 1 (rinomine, backfill, verifiche e rimozioni).
- `20261117000000_scorecard_guides` è la migrazione della Fase 2: nuove tabelle `scorecards`, `scorecard_criteria`, `interview_guides`, `guide_sections`, `guide_questions`; nuove colonne `quiz_questions.criterionIds`, `evaluations.answerEvaluations`, `evaluations.criteriaAssessment`. Nessun backfill: i dati esistenti restano invariati.

## Riallineamento una tantum

La procedura si esegue adesso sul ramo Neon `development` e si ripete, identica, sul database di produzione solo al momento del rilascio.

### Precondizioni

- `DATABASE_URL` in `.env.local` punta al ramo Neon `development`.
- La produzione non si tocca fino al rilascio.
- Un database di sviluppo non viene mai copiato sopra la produzione.
- In sviluppo non si cancellano mai candidati che esistono anche in produzione: il bucket R2 dei CV è condiviso, quindi eliminarli cancellerebbe anche i CV di produzione.
- Riferimenti per il rollback:
  - ramo Neon `backup/pre-application-hub-2026-11-15`;
  - tag git `backup/pre-application-hub`.

### Passo 1 — Candidati duplicati

```bash
pnpm db:duplicates
```

Lo script elenca i candidati che hanno la stessa email normalizzata (minuscole, senza spazi ai bordi) e non modifica nulla. Unisci a mano ogni duplicato elencato, poi rilancia lo script. Ripeti finché stampa `Nessun candidato duplicato`.

### Passo 2 — Baseline (una volta per database)

La tabella `_prisma_migrations` contiene 3 righe di migrazioni i cui file non esistono più. Eliminale:

```sql
DELETE FROM "_prisma_migrations";
```

Poi segna la baseline come già applicata:

```bash
pnpm exec prisma migrate resolve --applied 0_init
```

### Passo 3 — Migrazione della Fase 1

Annota il numero di righe delle tabelle `candidates`, `candidate_positions`, `interviews` ed `evaluations`, poi applica la migrazione `20261115000000_application_hub`:

```bash
pnpm db:migrate:deploy
```

Lo stesso `pnpm db:migrate:deploy` applica anche la migrazione della Fase 2 `20261117000000_scorecard_guides`, che è solo additiva; se la Fase 1 è già stata applicata, rilancialo per applicare questa migrazione.

### Passo 4 — Verifica

```bash
pnpm db:verify
pnpm exec prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code
```

`pnpm db:verify` deve terminare senza errori e `prisma migrate diff` tra la cartella delle migrazioni e lo schema non deve riportare differenze.

## Regola

Ogni modifica dello schema è una migrazione versionata (`pnpm db:migrate` in sviluppo, `pnpm db:migrate:deploy` per applicarla). `prisma db push` non si usa mai.
