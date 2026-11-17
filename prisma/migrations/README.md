# Migrazioni del database

Lo schema cambia solo con migrazioni versionate di Prisma Migrate, salvate in questa cartella e committate insieme al codice che le richiede. `prisma db push` non si usa mai.

- `0_init` è la baseline: crea lo schema completo da un database vuoto.

## Database nuovo

```bash
pnpm db:migrate:deploy
pnpm db:seed   # facoltativo: dati di esempio
```

## Nuova modifica dello schema

1. Modifica `prisma/schema.prisma`.
2. In sviluppo (`DATABASE_URL` sul ramo Neon `development`): `pnpm db:migrate` crea la migrazione e la applica.
3. Committa la cartella della migrazione con il codice che la richiede.
4. Al rilascio: `pnpm db:migrate:deploy` sul database di produzione.

Rinominare una tabella o una colonna si fa con `ALTER TABLE … RENAME` nella migrazione; un backfill è SQL nella stessa migrazione, prima della rimozione delle colonne che legge.

## Verifica

```bash
pnpm exec prisma migrate status
pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
```

Il primo deve riportare "Database schema is up to date", il secondo nessuna differenza tra database e schema.
