"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  revokeUserSessionAction,
  revokeUserSessionsAction,
} from "@/lib/actions/users";
import type { UserSessionRow } from "@/lib/data/users";
import {
  errorMessage,
  GENERIC_ERROR,
  type ActionResult,
} from "@/lib/utils/action-result";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** Active sessions of one user: close one, or close them all. */
export function UserSessionsCard({
  userId,
  sessions,
}: {
  userId: string;
  sessions: UserSessionRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (call: () => Promise<ActionResult>, successMessage: string) => {
    startTransition(async () => {
      try {
        const result = await call();

        if (!result.success) {
          toast.error(errorMessage(result.error));
          return;
        }

        toast.success(successMessage);
        router.refresh();
      } catch {
        toast.error(GENERIC_ERROR);
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center gap-4">
        <CardTitle>Sessioni attive</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={sessions.length === 0 || isPending}
          onClick={() =>
            run(() => revokeUserSessionsAction(userId), "Sessioni chiuse")
          }
        >
          Chiudi tutte
        </Button>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nessuna sessione attiva
          </p>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creata il</TableHead>
                  <TableHead>Scade il</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Browser</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Azioni</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const createdAt = formatDateTime(session.createdAt);
                  return (
                    <TableRow key={session.id}>
                      <TableCell>{createdAt}</TableCell>
                      <TableCell>{formatDateTime(session.expiresAt)}</TableCell>
                      <TableCell>{session.ipAddress ?? "—"}</TableCell>
                      <TableCell className="max-w-64">
                        <span
                          className="block truncate"
                          title={session.userAgent ?? undefined}
                        >
                          {session.userAgent ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          aria-label={`Chiudi sessione del ${createdAt}`}
                          onClick={() =>
                            run(
                              () =>
                                revokeUserSessionAction(userId, session.id),
                              "Sessione chiusa",
                            )
                          }
                        >
                          Chiudi sessione
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
