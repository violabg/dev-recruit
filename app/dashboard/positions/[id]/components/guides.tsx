import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInterviewGuidesByPosition } from "@/lib/data/interview-guides";
import type { Route } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
  /** This section holds the page's next step: its creation link is primary */
  primary?: boolean;
};

/** Tab "Tracce": the interview guides of the position. */
export async function Guides({ params, primary = false }: Props) {
  const { id } = await params;
  const guides = await getInterviewGuidesByPosition(id);
  const newGuideHref = `/dashboard/positions/${id}/guides/new` as const;

  return (
    <>
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="font-display font-bold text-heading text-xl tracking-[-0.02em]">
          Tracce del colloquio
        </h2>
        <Link
          href={newGuideHref}
          className={buttonVariants({
            variant: primary ? "default" : "outline",
            size: "sm",
          })}
        >
          <Plus className="mr-1 size-4" />
          Nuova traccia
        </Link>
      </div>

      {guides.length > 0 ? (
        <div className="gap-4 grid md:grid-cols-2">
          {guides.map((guide) => (
            <Card key={guide.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{guide.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Round {guide.round}
                    </span>
                    <span className="text-muted-foreground">
                      {guide.durationMinutes} minuti
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">
                      {guide.sectionCount} sezioni · {guide.questionCount}{" "}
                      domande
                    </span>
                    <Link
                      href={
                        `/dashboard/positions/${id}/guides/${guide.id}` as Route<`/dashboard/positions/${string}/guides/${string}`>
                      }
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      Apri
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Nessuna traccia per questa posizione
        </p>
      )}
    </>
  );
}
