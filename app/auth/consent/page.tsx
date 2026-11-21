import { ConsentForm } from "@/components/auth/consent-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MCP_SCOPE_LABEL } from "@/components/mcp/mcp-presentation";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth-server";
import { MCP_SCOPES, type McpScope } from "@/lib/mcp/config";
import { ACCOUNT_NOT_ENABLED_MESSAGE } from "@/lib/mcp/oauth-registration";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

type ConsentSearchParams = Promise<Record<string, string | string[] | undefined>>;

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** The query the provider sent, to come back here after sign-in */
function currentConsentUrl(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const entry of Array.isArray(value) ? value : value ? [value] : []) {
      query.append(key, entry);
    }
  }
  const search = query.toString();
  return search ? `/auth/consent?${search}` : "/auth/consent";
}

/** Public name of the requesting client, or null when it is unknown */
async function loadClientName(clientId: string): Promise<string | null> {
  try {
    const client = await auth.api.getOAuthClientPublic({
      query: { client_id: clientId },
      headers: await headers(),
    });
    return client.client_name || client.client_id;
  } catch {
    return null;
  }
}

function ConsentCard({
  description,
  children,
}: {
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-center items-center bg-linear-to-br from-background via-background/95 to-muted/30 p-6 md:p-10 w-full min-h-dvh">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Autorizza l&apos;accesso a dev-recruit
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Consent of an MCP authorization: names the client, the requested scopes
 * and the signed-in user. An account that cannot sign in gets no buttons.
 */
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: ConsentSearchParams;
}) {
  await connection();
  const params = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect(
      `/auth/login?callbackUrl=${encodeURIComponent(currentConsentUrl(params))}`,
    );
  }

  if (!user.emailVerified || user.banned) {
    return (
      <ConsentCard>
        <p className="text-sm">{ACCOUNT_NOT_ENABLED_MESSAGE}</p>
      </ConsentCard>
    );
  }

  const clientId = firstValue(params.client_id);
  const clientName = clientId ? await loadClientName(clientId) : null;

  if (!clientName) {
    return (
      <ConsentCard>
        <p className="text-sm text-destructive">
          Richiesta di autorizzazione non valida: client non riconosciuto.
        </p>
      </ConsentCard>
    );
  }

  const requested = (firstValue(params.scope) ?? "").split(" ");
  const scopes = MCP_SCOPES.filter((scope: McpScope) => requested.includes(scope));

  return (
    <ConsentCard description={`Il client ${clientName} chiede di:`}>
      <ul className="flex flex-col gap-1 pl-5 text-sm list-disc">
        {scopes.map((scope) => (
          <li key={scope}>{MCP_SCOPE_LABEL[scope]}</li>
        ))}
      </ul>
      <p className="text-sm">
        Accesso come {user.name} ({user.email})
      </p>
      <p className="text-muted-foreground text-sm">
        Usalo solo con piani Claude Team/Enterprise: i dati dei candidati
        arrivano al tuo assistente.
      </p>
      <ConsentForm />
    </ConsentCard>
  );
}
