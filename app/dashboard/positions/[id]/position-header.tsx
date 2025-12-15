import PageHeader from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import { deletePosition } from "@/lib/actions/positions";
import { getPositionById } from "@/lib/data/positions";
import { formatDate } from "@/lib/utils";
import { Edit } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PositionHeader({ params }: Props) {
  const { id } = await params;
  const position = await getPositionById(id);

  if (!position) {
    return (
      <div className="flex flex-col justify-center items-center h-100">
        <p className="font-medium text-lg">Posizione non trovata</p>
        <Button className="mt-4" asChild size="sm">
          <Link href="/dashboard/positions">Torna alle posizioni</Link>
        </Button>
      </div>
    );
  }

  return (
    <PageHeader
      title={position.title}
      info={
        <>
          <Badge variant="outline">{position.experienceLevel}</Badge>
          {position.contractType && (
            <Badge variant="outline">{position.contractType}</Badge>
          )}
          <span className="text-muted-foreground text-sm">
            Creata il {formatDate(position.createdAt.toISOString())}
          </span>
        </>
      }
      actionBtns={
        <>
          <Button variant="outline" asChild size="sm">
            <Link href={`/dashboard/positions/${position.id}/edit`}>
              <Edit className="mr-1 size-4" />
              Modifica
            </Link>
          </Button>
          <DeleteWithConfirm
            deleteAction={deletePosition.bind(null, position.id)}
            description="Questa azione non può essere annullata. Verranno eliminati anche tutti i quiz e i candidati associati a questa posizione."
            errorMessage="Errore durante l'eliminazione della posizione"
          />
        </>
      }
    />
  );
}
