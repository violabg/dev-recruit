import { cn } from "cn";
import { ApplicationStageBadge } from "@/components/applications/application-stage-badge";
import PageHeader from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { deleteCandidateAction } from "@/lib/actions/candidates";
import { getCandidateWithDetails } from "@/lib/data/candidates";
import { furthestApplication } from "@/lib/utils/application-stage";
import { ClipboardCheck, Edit, Link2 } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

export async function CandidateHeader({ params }: Props) {
  const { id } = await params;
  const candidate = await getCandidateWithDetails(id);

  if (!candidate) {
    return (
      <div className="flex flex-col justify-center items-center h-100">
        <p className="font-medium text-lg">Candidato non trovato</p>
        <Link
          href="/dashboard/candidates"
          className={cn("mt-4", buttonVariants({ variant: "default" }))}
        >
          Torna ai candidati
        </Link>
      </div>
    );
  }

  const fullName = `${candidate.firstName} ${candidate.lastName}`.trim();
  const furthest = furthestApplication(candidate.applications);

  return (
    <PageHeader
        section="candidates"
      title={fullName}
      info={
        <>
          {furthest && <ApplicationStageBadge stage={furthest.stage} />}
          {candidate.doNotContact &&
            (candidate.doNotContactNote ? (
              <Tooltip>
                <TooltipTrigger>
                  <Badge className="bg-destructive/10 text-destructive">
                    Non ricontattare
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{candidate.doNotContactNote}</TooltipContent>
              </Tooltip>
            ) : (
              <Badge className="bg-destructive/10 text-destructive">
                Non ricontattare
              </Badge>
            ))}
          <span className="text-muted-foreground text-sm">
            {candidate.email}
          </span>
        </>
      }
      actionBtns={
        <>
          <Link
            href={`/dashboard/candidates/${candidate.id}/quiz`}
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}
          >
            <Link2 className="mr-1 size-4" />
            Associa quiz
          </Link>
          <Link
            href={`/dashboard/candidates/${candidate.id}/evaluations`}
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}
          >
            <ClipboardCheck className="mr-1 size-4" />
            Valutazioni
          </Link>
          <Link
            href={`/dashboard/candidates/${candidate.id}/edit`}
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}
          >
            <Edit className="mr-1 size-4" />
            Modifica
          </Link>
          <DeleteWithConfirm
            deleteAction={deleteCandidateAction.bind(null, candidate.id)}
            description="Questa azione non può essere annullata. Il candidato e tutti i dati associati verranno eliminati permanentemente."
            errorMessage="Errore durante l'eliminazione del candidato"
          />
        </>
      }
    />
  );
}
