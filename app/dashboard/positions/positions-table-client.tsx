"use client";

import { Badge } from "@/components/ui/badge";
import { EntityActionsMenu } from "@/components/ui/entity-actions-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { deletePosition } from "@/lib/actions/positions";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const handleRowClick = (id: string) => {
    router.push(`/dashboard/positions/${id}`);
  };

  return (
    <>
      {positions.map((position) => (
        <TableRow
          key={position.id}
          className="cursor-pointer"
          onClick={() => handleRowClick(position.id)}
        >
          <TableCell className="font-medium">{position.title}</TableCell>
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
          <TableCell
            className="text-right"
            onClick={(e) => e.stopPropagation()}
          >
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
