import { PrismaPg } from "@prisma/adapter-pg";
import "./load-env";
import { PrismaClient } from "../lib/prisma/client.js";

// Read-only verification of the Phase 1 migration (application hub).
// Prints the figures to compare with the counts noted before the migration and
// exits with code 1 on the first failed assertion. It never writes.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

class VerificationError extends Error {}

function assert(condition: boolean, message: string) {
  if (!condition) throw new VerificationError(message);
  console.log(`✓ ${message}`);
}

type CountRow = { count: bigint | number };
type GroupRow = { key: string | null; count: bigint | number };
type NameRow = { kind: string; name: string };

const toNumber = (value: bigint | number) => Number(value);

async function count(sql: TemplateStringsArray): Promise<number> {
  const rows = await prisma.$queryRaw<CountRow[]>(sql);
  return toNumber(rows[0]?.count ?? 0);
}

function printGroups(title: string, rows: GroupRow[]) {
  console.log(`\n${title}`);
  if (rows.length === 0) {
    console.log("  (nessuna riga)");
    return;
  }
  for (const row of rows) {
    console.log(`  ${row.key ?? "(null)"}: ${toNumber(row.count)}`);
  }
}

async function main() {
  // Row counts
  const candidates = await count`SELECT count(*) AS count FROM "candidates"`;
  const applications = await count`SELECT count(*) AS count FROM "applications"`;
  const assessments = await count`SELECT count(*) AS count FROM "assessments"`;
  const evaluations = await count`SELECT count(*) AS count FROM "evaluations"`;

  console.log("Righe dopo la migrazione");
  console.log(`  candidates: ${candidates}`);
  console.log(`  applications: ${applications}`);
  console.log(`  assessments: ${assessments}`);
  console.log(`  evaluations: ${evaluations}`);

  printGroups(
    "Candidature per fase",
    await prisma.$queryRaw<GroupRow[]>`
      SELECT "stage"::text AS key, count(*) AS count
        FROM "applications"
       GROUP BY "stage"
       ORDER BY "stage"
    `,
  );

  printGroups(
    "Posizioni per stato",
    await prisma.$queryRaw<GroupRow[]>`
      SELECT "status"::text AS key, count(*) AS count
        FROM "positions"
       GROUP BY "status"
       ORDER BY "status"
    `,
  );

  console.log("");

  // Every test belongs to an application of the same candidate
  const withoutApplication =
    await count`SELECT count(*) AS count FROM "assessments" WHERE "applicationId" IS NULL`;
  assert(
    withoutApplication === 0,
    withoutApplication === 0
      ? "Nessun test senza candidatura"
      : `Errore: ${withoutApplication} test senza candidatura`,
  );

  const wrongCandidate = await count`
    SELECT count(*) AS count
      FROM "assessments" s
      JOIN "applications" a ON a."id" = s."applicationId"
     WHERE a."candidateId" <> s."candidateId"
  `;
  assert(
    wrongCandidate === 0,
    wrongCandidate === 0
      ? "Ogni test appartiene a una candidatura dello stesso candidato"
      : `Errore: ${wrongCandidate} test collegati alla candidatura di un altro candidato`,
  );

  // Normalised, unique emails
  const duplicatedEmails = await count`
    SELECT count(*) AS count
      FROM (
        SELECT lower(trim("email"))
          FROM "candidates"
         GROUP BY lower(trim("email"))
        HAVING count(*) > 1
      ) AS d
  `;
  assert(
    duplicatedEmails === 0,
    duplicatedEmails === 0
      ? "Nessuna email di candidato duplicata"
      : `Errore: ${duplicatedEmails} email condivise da più candidati`,
  );

  // No old name left in the public schema
  const oldNames = await prisma.$queryRaw<NameRow[]>`
    SELECT 'tabella' AS kind, table_name AS name
      FROM information_schema.tables
     WHERE table_schema = 'public'
    UNION ALL
    SELECT 'colonna', table_name || '.' || column_name
      FROM information_schema.columns
     WHERE table_schema = 'public'
    UNION ALL
    SELECT 'tipo', t.typname
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public'
    UNION ALL
    SELECT 'vincolo', c.conname
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
     WHERE n.nspname = 'public'
    UNION ALL
    SELECT 'indice', indexname
      FROM pg_indexes
     WHERE schemaname = 'public'
  `;

  // The Phase 2 table interview_guides (with its columns, types, constraints
  // and indexes) is a new table, not a leftover of the Phase 1 rename.
  const interviewNames = oldNames.filter(
    (row) =>
      /interview/i.test(row.name) &&
      row.name !== "evaluations.interviewNotes" &&
      !/^_?interview_guides(?:$|[._])/.test(row.name),
  );
  assert(
    interviewNames.length === 0,
    interviewNames.length === 0
      ? "Nessun nome con interview nel database (a parte evaluations.interviewNotes e la tabella interview_guides della Fase 2)"
      : `Errore: nomi con interview ancora presenti: ${interviewNames
          .map((row) => `${row.kind} ${row.name}`)
          .join(", ")}`,
  );

  const legacyNames = oldNames.filter((row) =>
    /candidate_positions|isPrimary/i.test(row.name),
  );
  assert(
    legacyNames.length === 0,
    legacyNames.length === 0
      ? "Nessun nome con candidate_positions o isPrimary nel database"
      : `Errore: nomi obsoleti ancora presenti: ${legacyNames
          .map((row) => `${row.kind} ${row.name}`)
          .join(", ")}`,
  );

  const statusColumn = oldNames.some(
    (row) => row.kind === "colonna" && row.name === "candidates.status",
  );
  assert(
    !statusColumn,
    statusColumn
      ? "Errore: la colonna candidates.status esiste ancora"
      : "La colonna candidates.status non esiste più",
  );

  console.log("\nVerifica completata");
  return 0;
}

main()
  .then(async (exitCode) => {
    await prisma.$disconnect();
    process.exit(exitCode);
  })
  .catch(async (error) => {
    if (error instanceof VerificationError) {
      console.error(`\n✗ ${error.message}`);
    } else {
      console.error("Errore durante la verifica:", error);
    }
    await prisma.$disconnect();
    process.exit(1);
  });
