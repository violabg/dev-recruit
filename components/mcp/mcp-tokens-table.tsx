"use client";

import { mcpScopeLabels } from "@/components/mcp/mcp-presentation";
import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { revokeMcpTokenAction } from "@/lib/actions/mcp";
import type { ActiveMcpToken } from "@/lib/data/mcp-admin";

const formatDateTime = (date: Date) =>
  new Date(date).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });

/** Active MCP grants with their revoke button. */
export function McpTokensTable({ tokens }: { tokens: ActiveMcpToken[] }) {
  if (tokens.length === 0) {
    return <p className="text-muted-foreground text-sm">Nessun token attivo</p>;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Utente</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Permessi</TableHead>
            <TableHead>Rilasciato</TableHead>
            <TableHead>Scade</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Azioni</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tokens.map((token) => (
            <TableRow key={token.id}>
              <TableCell>
                <div className="font-medium">{token.user.name}</div>
                <div className="text-muted-foreground text-xs">{token.user.email}</div>
              </TableCell>
              <TableCell>{token.clientName}</TableCell>
              <TableCell>
                <ul className="flex flex-col gap-0.5 text-sm">
                  {mcpScopeLabels(token.scopes).map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              </TableCell>
              <TableCell>{formatDateTime(token.createdAt)}</TableCell>
              <TableCell>{formatDateTime(token.refreshExpiresAt ?? token.expiresAt)}</TableCell>
              <TableCell className="text-right">
                <DeleteWithConfirm
                  deleteAction={() => revokeMcpTokenAction(token.id)}
                  title="Revocare il token?"
                  description="Il client dovrà autorizzarsi di nuovo."
                  label="Revoca"
                  successMessage="Token revocato"
                  errorMessage="Impossibile revocare il token"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
