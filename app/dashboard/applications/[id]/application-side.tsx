import { ApplicationStageBadge } from "@/components/applications/application-stage-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApplicationDetail } from "@/lib/data/applications";
import { resumePublicUrl } from "@/lib/services/r2-storage";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

const fileNameOf = (url: string) => url.split("/").pop() ?? "CV";

/**
 * Side column of the Candidatura page: the candidate's contacts and their
 * other applications.
 */
export async function ApplicationSide({ params }: Props) {
  const { id } = await params;
  const detail = await getApplicationDetail(id);

  if (!detail) return null;

  const { candidate, otherApplications } = detail;

  return (
    <aside aria-label="Candidato" className="flex flex-[1_1_18rem] flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Contatti</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="gap-x-4 gap-y-2 grid grid-cols-[auto_1fr] text-sm">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="break-all">
              <a
                href={`mailto:${candidate.email}`}
                className="text-primary hover:underline"
              >
                {candidate.email}
              </a>
            </dd>
            <dt className="text-muted-foreground">CV</dt>
            <dd className="break-all">
              {candidate.resumeUrl ? (
                <a
                  href={resumePublicUrl(candidate.resumeUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {fileNameOf(candidate.resumeUrl)}
                </a>
              ) : (
                <span className="text-muted-foreground">CV non caricato</span>
              )}
            </dd>
          </dl>
          {candidate.doNotContact && (
            <div className="mt-3 flex flex-col gap-1 border-destructive/30 border-t pt-3 text-sm">
              <span className="font-medium text-destructive">
                Non ricontattare
              </span>
              {candidate.doNotContactNote && (
                <span className="text-muted-foreground">
                  {candidate.doNotContactNote}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Altre candidature</CardTitle>
        </CardHeader>
        <CardContent>
          {otherApplications.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nessuna altra candidatura.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {otherApplications.map((application) => (
                <li
                  key={application.id}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <Link
                    href={`/dashboard/applications/${application.id}` as never}
                    className="text-primary text-sm hover:underline"
                  >
                    {application.position.title}
                  </Link>
                  <ApplicationStageBadge stage={application.stage} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
