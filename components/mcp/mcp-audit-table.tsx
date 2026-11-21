import { getMcpAuditStatusPresentation } from "@/components/mcp/mcp-presentation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UrlPagination } from "@/components/ui/url-pagination";
import type { McpAuditRow } from "@/lib/data/mcp-admin";
import { cn } from "cn";

const BADGE_CLASS = "rounded-full px-2 py-1 text-xs font-medium";

const formatDateTime = (date: Date) =>
  new Date(date).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "medium" });

/** The MCP audit log, newest first, paginated through the URL. */
export function McpAuditTable({
  data,
  page,
  pageSize,
}: {
  data: { rows: McpAuditRow[]; total: number };
  page: number;
  pageSize: number;
}) {
  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      {data.rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nessuna chiamata registrata</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Utente</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Strumento</TableHead>
                <TableHead>Esito</TableHead>
                <TableHead>Riepilogo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => {
                const status = getMcpAuditStatusPresentation(row.status);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell>{row.user?.name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{row.clientId ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{row.tool}</TableCell>
                    <TableCell>
                      <span className={cn(BADGE_CLASS, status.badge)}>{status.label}</span>
                    </TableCell>
                    <TableCell className="max-w-md text-muted-foreground text-sm truncate">
                      {row.summary}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <UrlPagination
        pagination={{
          currentPage: page,
          totalPages,
          totalCount: data.total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        }}
        itemLabel="chiamata"
        itemLabelPlural="chiamate"
      />
    </div>
  );
}
