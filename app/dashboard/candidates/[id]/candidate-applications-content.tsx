import { ApplicationStageBadge } from "@/components/applications/application-stage-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCandidateWithDetails } from "@/lib/data/candidates";
import { formatDate } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

/** The candidate's applications, most recent activity first. */
export async function CandidateApplicationsContent({ params }: Props) {
  const { id } = await params;
  const candidate = await getCandidateWithDetails(id);

  if (!candidate) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Candidature</CardTitle>
      </CardHeader>
      <CardContent>
        {candidate.applications.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nessuna candidatura</p>
        ) : (
          <ul className="flex flex-col -mx-2">
            {candidate.applications.map((application) => (
              <li key={application.id}>
                <Link
                  href={`/dashboard/applications/${application.id}` as never}
                  className="group flex items-center gap-3 hover:bg-muted/70 focus-visible:bg-muted/70 px-2 py-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {application.position.title}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Ultimo cambio di fase:{" "}
                      {formatDate(
                        new Date(application.stageChangedAt).toISOString(),
                      )}
                    </p>
                  </div>
                  <ApplicationStageBadge stage={application.stage} />
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
