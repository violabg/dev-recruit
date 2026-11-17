import { Fact, FactStrip } from "@/components/detail-blocks";
import { getCandidateWithDetails } from "@/lib/data/candidates";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Cake, ExternalLink, FileText, Mail, PhoneOff } from "lucide-react";

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
    <FactStrip>
      <Fact icon={Mail} label="Email">
        <span className="break-all">{candidate.email}</span>
      </Fact>
      <Fact icon={Cake} label="Data di nascita">
        {candidate.dateOfBirth
          ? format(new Date(candidate.dateOfBirth), "dd MMMM yyyy", {
              locale: it,
            })
          : "—"}
      </Fact>
      <Fact icon={FileText} label="Curriculum">
        {candidate.resumeUrl ? (
          <a
            href={candidate.resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Visualizza
            <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="font-normal text-warning">Non caricato</span>
        )}
      </Fact>
      <Fact icon={PhoneOff} label="Ricontattabile">
        {candidate.doNotContact ? (
          <span className="text-destructive">No</span>
        ) : (
          "Sì"
        )}
        {candidate.doNotContact && candidate.doNotContactNote && (
          <span className="block font-normal text-muted-foreground text-xs">
            {candidate.doNotContactNote}
          </span>
        )}
      </Fact>
    </FactStrip>
  );
}
