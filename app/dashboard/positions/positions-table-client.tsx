"use client";
import { Badge } from "@/components/ui/badge";
import { EntityActionsMenu } from "@/components/ui/entity-actions-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { TableRowLink } from "@/components/ui/table-row-link";
import { deletePosition } from "@/lib/actions/positions";
import { formatDate } from "@/lib/utils";

type Position = {
  id: string;
  title: string;
  experienceLevel: string;
  skills: string[];
  createdAt: string;
};

type PositionsTableClientProps = {
  positions: Position[];
};

export function PositionsTableClient({ positions }: PositionsTableClientProps) {
  return (
    <>
      {positions.map((position) => (
        <TableRow key={position.id} className="group">
          <TableCell className="relative font-medium">
            <TableRowLink href={`/dashboard/positions/${position.id}`} />
            {position.title}
          </TableCell>
          <TableCell>
            <Badge variant="outline">{position.experienceLevel}</Badge>
          </TableCell>
          <TableCell>
            <div className="flex flex-wrap gap-1">
              {position.skills.slice(0, 3).map((skill, index) => (
                <Badge key={index} variant="secondary">
                  {skill}
                </Badge>
              ))}
              {position.skills.length > 3 && (
                <Badge variant="secondary">+{position.skills.length - 3}</Badge>
              )}
            </div>
          </TableCell>
          <TableCell>{formatDate(position.createdAt)}</TableCell>
          <TableCell className="z-10 relative text-right">
            <EntityActionsMenu
              entityId={position.id}
              editHref={`/dashboard/positions/${position.id}/edit`}
              deleteAction={deletePosition.bind(null, position.id)}
              deleteTitle="Elimina posizione"
              deleteDescription="Sei sicuro di voler eliminare questa posizione? Questa azione non può essere annullata."
              deleteErrorMessage="Errore durante l'eliminazione della posizione"
            />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
