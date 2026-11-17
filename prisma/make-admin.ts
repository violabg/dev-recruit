import "./load-env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/prisma/client.js";
import { logger } from "../lib/services/logger";
import { makeAdmin } from "../lib/services/users";

/**
 * Sets the first administrator of a database: promotes an existing account to
 * an active, verified administrator. Never creates users.
 *
 * Usage: pnpm user:make-admin <email>
 * DATABASE_URL decides the database (.env.local wins over .env).
 */
async function main() {
  const email = process.argv[2];
  if (!email || email.startsWith("--")) {
    logger.error("Uso: pnpm user:make-admin <email>");
    process.exitCode = 1;
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.error("DATABASE_URL non impostata");
    process.exitCode = 1;
    return;
  }

  // Host only: never log the user or the password of the connection string
  logger.warn("Database di destinazione", { host: new URL(databaseUrl).host });

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const result = await makeAdmin(prisma, email);
    if (result.status === "promoted") {
      logger.warn(
        "Utente promosso ad amministratore (email verificata, account attivo)",
        { email: result.email },
      );
    } else {
      logger.warn("L'utente era già amministratore", { email: result.email });
    }
  } catch (error) {
    logger.error("Impossibile impostare l'amministratore", {
      email,
      error: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
