import { existsSync } from "node:fs";

// Next.js loads .env files for the app automatically; the Prisma CLI and the
// seed script don't, so load them here. Files are skipped when absent (e.g. on
// Vercel, where variables come from the project settings). Existing
// process.env values are never overwritten, so .env.local wins over .env.
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}
