import { buttonVariants } from "@/components/ui/button";
import { getPositionCoverage } from "@/lib/data/positions";
import { coverageFixHref } from "@/lib/utils/position-coverage";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Warning on the Candidati tab when at least one active criterion is verified
 * by no question: names the uncovered criteria and links to where a question
 * is added.
 */
export async function CoverageAlert({ params }: Props) {
  const { id } = await params;
  const coverage = await getPositionCoverage(id);

  if (!coverage || coverage.uncovered.length === 0) return null;

  const names = coverage.uncovered.map((row) => row.name);
  const namesText =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning"
    >
      <span className="flex-1 min-w-0">
        {names.length === 1 ? (
          <>
            <strong>{namesText} non è coperto.</strong> Nessuna domanda del test
            o della traccia lo verifica, quindi nella decisione resterà senza
            prove.
          </>
        ) : (
          <>
            <strong>{namesText} non sono coperti.</strong> Nessuna domanda del
            test o della traccia li verifica, quindi nella decisione resteranno
            senza prove.
          </>
        )}
      </span>
      <Link
        href={
          coverageFixHref(
            id,
            coverage.guides,
            coverage.uncovered[0].criterionId,
          ) as never
        }
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Aggiungi una domanda
      </Link>
    </div>
  );
}
