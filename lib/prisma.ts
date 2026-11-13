import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";
import { ENV } from "varlock/env";
import { PrismaClient } from "./prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  // Neon recommends TCP (node-postgres) + a pool on Vercel Fluid compute:
  // warm instances reuse connections instead of paying the handshake per request.
  const pool = new Pool({ connectionString: ENV.DATABASE_URL });

  // Lets Vercel close idle connections gracefully before an instance is
  // suspended (no leaked connections). No-op outside Vercel.
  attachDatabasePool(pool);

  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (ENV.APP_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
