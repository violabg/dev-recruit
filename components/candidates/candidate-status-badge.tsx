import { Badge } from "@/components/ui/badge";
import { getStatusColor } from "@/lib/utils";

// Props for the candidate status badge
interface CandidateStatusBadgeProps {
  status: string;
}

// Map status to display text
const statusText: Record<string, string> = {
  pending: "In attesa",
  contacted: "Contattato",
  interviewing: "In colloquio",
  hired: "Assunto",
  rejected: "Rifiutato",
};

// Candidate status badge component
export function CandidateStatusBadge({ status }: CandidateStatusBadgeProps) {
  return (
    <Badge className={getStatusColor(status)}>
      {statusText[status] || status}
    </Badge>
  );
}
