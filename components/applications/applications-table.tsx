import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableRowLink } from "@/components/ui/table-row-link";
import type { ApplicationListItem } from "@/lib/data/applications";
import { formatDate } from "@/lib/utils";
import { SquareKanban } from "lucide-react";
import { ApplicationStageBadge } from "./application-stage-badge";

/**
 * Table of the applications list. The date of the last stage change is an
 * absolute date: the clock is never read while prerendering.
 */
export function ApplicationsTable({
  applications,
}: {
  applications: ApplicationListItem[];
}) {
  if (applications.length === 0) {
    return (
      <Empty className="border h-[200px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SquareKanban />
          </EmptyMedia>
          <EmptyTitle>Nessuna candidatura trovata</EmptyTitle>
          <EmptyDescription>
            Prova a modificare i filtri di ricerca.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candidato</TableHead>
            <TableHead>Posizione</TableHead>
            <TableHead>Fase</TableHead>
            <TableHead>Responsabile</TableHead>
            <TableHead>Ultimo cambio di fase</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <TableRow key={application.id} className="group">
              <TableCell className="relative">
                <TableRowLink
                  href={`/dashboard/applications/${application.id}`}
                />
                <div className="font-medium">
                  {`${application.candidate.firstName} ${application.candidate.lastName}`.trim()}
                </div>
                <div className="text-muted-foreground text-sm">
                  {application.candidate.email}
                </div>
              </TableCell>
              <TableCell>{application.position.title}</TableCell>
              <TableCell>
                <ApplicationStageBadge stage={application.stage} />
              </TableCell>
              <TableCell>
                {application.owner?.name ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(new Date(application.stageChangedAt).toISOString())}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
