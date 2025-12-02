import { CandidateStatusBadge } from "@/components/candidates/candidate-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCandidateWithDetails } from "@/lib/data/candidates";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ExternalLink, FileText } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
};

export async function CandidateDetailsContent({ params }: Props) {
  const { id } = await params;
  const candidate = await getCandidateWithDetails(id);

  if (!candidate) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dettagli Candidato</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gap-4 grid md:grid-cols-2">
          <div>
            <div className="font-semibold">Nome</div>
            <div>{candidate.firstName}</div>
          </div>
          <div>
            <div className="font-semibold">Cognome</div>
            <div>{candidate.lastName}</div>
          </div>
          <div>
            <div className="font-semibold">Email</div>
            <div>{candidate.email}</div>
          </div>
          <div>
            <div className="font-semibold">Data di nascita</div>
            <div>
              {candidate.dateOfBirth
                ? format(new Date(candidate.dateOfBirth), "dd MMMM yyyy", {
                    locale: it,
                  })
                : "-"}
            </div>
          </div>
          <div>
            <div className="font-semibold">Stato</div>
            <CandidateStatusBadge status={candidate.status} />
          </div>
          <div>
            <div className="font-semibold">Posizione</div>
            <div>{candidate.position?.title || "-"}</div>
          </div>
          <div className="md:col-span-2">
            <div className="font-semibold">Curriculum</div>
            {candidate.resumeUrl ? (
              <a
                href={candidate.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <FileText className="size-4" />
                Visualizza curriculum
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-muted-foreground">Non disponibile</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
