import "./load-env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/prisma/client.js";
import {
  MCP_ACCESS_TOKEN_TTL_SECONDS,
  MCP_REDIRECT_ALLOWLIST,
  MCP_RESOURCE_URL,
  MCP_SCOPES,
  VSCODE_CLIENT_ID,
} from "../lib/mcp/config";
import { logger } from "../lib/services/logger";

/** VS Code redirects of the allowlist: the loopback entry and vscode.dev */
const VSCODE_REDIRECT_URIS = MCP_REDIRECT_ALLOWLIST.filter(
  (uri) => uri.startsWith("http://127.0.0.1") || uri.startsWith("https://vscode.dev/"),
);

/**
 * Creates or refreshes the pre-registered public OAuth clients (VS Code uses
 * VSCODE_CLIENT_ID as its oauthClientId). Public client: no secret, PKCE
 * required, linked to the MCP resource. Idempotent: run once per environment.
 *
 * Usage: pnpm mcp:register-clients
 * DATABASE_URL decides the database (.env.local wins over .env).
 */
async function main() {
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
  const now = new Date();

  const client = {
    name: "VS Code",
    redirectUris: VSCODE_REDIRECT_URIS,
    tokenEndpointAuthMethod: "none",
    applicationType: "native",
    grantTypes: ["authorization_code", "refresh_token"],
    responseTypes: ["code"],
    // offline_access: the provider issues refresh tokens only with it
    scopes: [...MCP_SCOPES, "offline_access"],
    requirePKCE: true,
    clientSecret: null,
    disabled: false,
    updatedAt: now,
  };

  try {
    // The MCP resource, as the provider seeds it (kept when already present)
    await prisma.oauthResource.upsert({
      where: { identifier: MCP_RESOURCE_URL },
      create: {
        identifier: MCP_RESOURCE_URL,
        name: "dev-recruit MCP",
        accessTokenTtl: MCP_ACCESS_TOKEN_TTL_SECONDS,
        allowedScopes: [...MCP_SCOPES, "offline_access"],
        createdAt: now,
        updatedAt: now,
      },
      update: {},
    });

    await prisma.oauthClient.upsert({
      where: { clientId: VSCODE_CLIENT_ID },
      create: { clientId: VSCODE_CLIENT_ID, createdAt: now, ...client },
      update: client,
    });

    await prisma.oauthClientResource.upsert({
      where: {
        clientId_resourceId: {
          clientId: VSCODE_CLIENT_ID,
          resourceId: MCP_RESOURCE_URL,
        },
      },
      create: {
        clientId: VSCODE_CLIENT_ID,
        resourceId: MCP_RESOURCE_URL,
        createdAt: now,
      },
      update: {},
    });

    logger.warn("Client OAuth registrato", {
      clientId: VSCODE_CLIENT_ID,
      redirectUris: VSCODE_REDIRECT_URIS,
      resource: MCP_RESOURCE_URL,
    });
  } catch (error) {
    logger.error("Impossibile registrare i client OAuth", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
