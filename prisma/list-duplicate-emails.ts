import { PrismaPg } from "@prisma/adapter-pg";
import "./load-env";
import { PrismaClient } from "../lib/prisma/client.js";

// Read-only: lists the candidates that share the same normalised email.
// Merging is manual; this script never writes.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type DuplicateCandidateRow = {
  normalizedEmail: string;
  id: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  linkCount: bigint | number;
};

async function applicationsTableExists(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ table: string | null }[]>`
    SELECT to_regclass('public.applications')::text AS "table"
  `;
  return rows[0]?.table != null;
}

async function findDuplicateCandidates(): Promise<DuplicateCandidateRow[]> {
  // The link table is renamed by the Phase 1 migration: count from whichever exists.
  if (await applicationsTableExists()) {
    return prisma.$queryRaw<DuplicateCandidateRow[]>`
      WITH duplicated AS (
        SELECT lower(trim(email)) AS "normalizedEmail"
        FROM "candidates"
        GROUP BY lower(trim(email))
        HAVING count(*) > 1
      )
      SELECT
        d."normalizedEmail",
        c."id",
        c."firstName",
        c."lastName",
        c."createdAt",
        (SELECT count(*) FROM "applications" a WHERE a."candidateId" = c."id") AS "linkCount"
      FROM duplicated d
      JOIN "candidates" c ON lower(trim(c."email")) = d."normalizedEmail"
      ORDER BY d."normalizedEmail", c."createdAt"
    `;
  }

  return prisma.$queryRaw<DuplicateCandidateRow[]>`
    WITH duplicated AS (
      SELECT lower(trim(email)) AS "normalizedEmail"
      FROM "candidates"
      GROUP BY lower(trim(email))
      HAVING count(*) > 1
    )
    SELECT
      d."normalizedEmail",
      c."id",
      c."firstName",
      c."lastName",
      c."createdAt",
      (SELECT count(*) FROM "candidate_positions" cp WHERE cp."candidateId" = c."id") AS "linkCount"
    FROM duplicated d
    JOIN "candidates" c ON lower(trim(c."email")) = d."normalizedEmail"
    ORDER BY d."normalizedEmail", c."createdAt"
  `;
}

async function main(): Promise<number> {
  const rows = await findDuplicateCandidates();

  if (rows.length === 0) {
    console.log("Nessun candidato duplicato");
    return 0;
  }

  const byEmail = new Map<string, DuplicateCandidateRow[]>();
  for (const row of rows) {
    const group = byEmail.get(row.normalizedEmail) ?? [];
    group.push(row);
    byEmail.set(row.normalizedEmail, group);
  }

  for (const [email, candidates] of byEmail) {
    console.log(`\n${email} (${candidates.length} candidati)`);
    for (const candidate of candidates) {
      console.log(
        `  - id: ${candidate.id} | ${candidate.firstName} ${candidate.lastName} | creato il ${candidate.createdAt.toISOString()} | candidature: ${Number(candidate.linkCount)}`,
      );
    }
  }

  console.log(
    "\nUnisci a mano questi candidati prima di applicare la migrazione",
  );
  return 1;
}

main()
  .then(async (exitCode) => {
    await prisma.$disconnect();
    process.exit(exitCode);
  })
  .catch(async (error) => {
    console.error("Errore durante la ricerca dei duplicati:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
