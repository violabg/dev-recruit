import { McpAuditTable } from "@/components/mcp/mcp-audit-table";
import { McpSwitches } from "@/components/mcp/mcp-switches";
import { McpTokensTable } from "@/components/mcp/mcp-tokens-table";
import PageHeader from "@/components/page-header";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAdminPage } from "@/lib/auth-server";
import {
  getActiveMcpTokens,
  getMcpAccessState,
  getMcpAudit,
} from "@/lib/data/mcp-admin";
import { SECTIONS } from "@/components/dashboard/sections";
import { sectionTrail } from "@/lib/utils/breadcrumbs";
import { connection } from "next/server";
import { Suspense } from "react";

type McpSearchParams = Promise<{
  tab?: string;
  page?: string;
  user?: string;
  tool?: string;
}>;

const TABS = ["token", "interruttori", "registro"] as const;
type McpTab = (typeof TABS)[number];

const AUDIT_PAGE_SIZE = 50;

const TITLE = "Accesso MCP";
const DESCRIPTION = "Token, interruttori e registro delle chiamate da Claude e VS Code";

async function TokensSection() {
  return <McpTokensTable tokens={await getActiveMcpTokens()} />;
}

async function SwitchesSection() {
  return <McpSwitches state={await getMcpAccessState()} />;
}

async function AuditSection({
  page,
  userId,
  tool,
}: {
  page: number;
  userId?: string;
  tool?: string;
}) {
  const data = await getMcpAudit({ page, userId, tool, pageSize: AUDIT_PAGE_SIZE });
  return <McpAuditTable data={data} page={page} pageSize={AUDIT_PAGE_SIZE} />;
}

const TokensSkeleton = () => (
  <TableSkeleton
    className="rounded-lg"
    columns={[
      { header: "Utente", cell: "stacked" },
      { header: "Client" },
      { header: "Permessi", cell: "muted" },
      { header: "Rilasciato", cell: "muted" },
      { header: "Scade", cell: "muted" },
      { header: "", cell: "action" },
    ]}
  />
);

const AuditSkeleton = () => (
  <TableSkeleton
    className="rounded-lg"
    columns={[
      { header: "Data", cell: "muted" },
      { header: "Utente" },
      { header: "Client", cell: "muted" },
      { header: "Strumento" },
      { header: "Esito", cell: "badge" },
      { header: "Riepilogo", cell: "muted" },
    ]}
  />
);

/**
 * Administrators only: the server role check runs before anything renders,
 * so a non-admin gets the not-found page and no data.
 */
async function McpContent({ searchParams }: { searchParams: McpSearchParams }) {
  await connection();
  await requireAdminPage();
  const params = await searchParams;

  const tab: McpTab = TABS.includes(params.tab as McpTab)
    ? (params.tab as McpTab)
    : "token";
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  const userId = params.user?.trim() || undefined;
  const tool = params.tool?.trim() || undefined;

  return (
    <div className="flex flex-col gap-6 w-full">
      <PageHeader
        title={TITLE}
        description={DESCRIPTION}
        breadcrumbs={sectionTrail(SECTIONS.settings, { label: "MCP" })}
      />

      <Tabs defaultValue={tab} className="flex flex-col gap-6">
        <TabsList variant="line">
          <TabsTrigger value="token">Token attivi</TabsTrigger>
          <TabsTrigger value="interruttori">Interruttori</TabsTrigger>
          <TabsTrigger value="registro">Registro</TabsTrigger>
        </TabsList>

        <TabsContent value="token">
          <Suspense fallback={<TokensSkeleton />}>
            <TokensSection />
          </Suspense>
        </TabsContent>

        <TabsContent value="interruttori">
          <Suspense fallback={<TableSkeleton columns={[{ header: "Utenti" }]} />}>
            <SwitchesSection />
          </Suspense>
        </TabsContent>

        <TabsContent value="registro">
          <Suspense fallback={<AuditSkeleton />}>
            <AuditSection page={page} userId={userId} tool={tool} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function McpAccessPage({
  searchParams,
}: {
  searchParams: McpSearchParams;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 w-full">
          <PageHeaderSkeleton title={TITLE} description={DESCRIPTION} />
          <TokensSkeleton />
        </div>
      }
    >
      <McpContent searchParams={searchParams} />
    </Suspense>
  );
}
