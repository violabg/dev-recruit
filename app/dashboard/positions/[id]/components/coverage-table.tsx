import { CRITERION_PRIORITY_PRESENTATION } from "@/components/scorecard/criterion-presentation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPositionCoverage } from "@/lib/data/positions";
import { coverageFixHref } from "@/lib/utils/position-coverage";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Coverage of the position's active criteria: how many questions of the tests
 * and of the traces verify each one. A criterion no question verifies is a
 * warning row with the link that adds one.
 */
export async function CoverageTable({ params }: Props) {
  const { id } = await params;
  const coverage = await getPositionCoverage(id);

  if (!coverage) return null;

  if (coverage.rows.length === 0) {
    return (
      <section id="copertura" className="flex flex-col gap-3">
        <h2 className="font-display font-bold text-heading text-xl tracking-[-0.02em]">
          Copertura dei criteri
        </h2>
        <p className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
          Nessun criterio attivo.
          <Link
            href={`/dashboard/positions/${id}/scorecard` as never}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Aggiungi i criteri
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section id="copertura" className="flex flex-col gap-3">
      <h2 className="font-display font-bold text-heading text-xl tracking-[-0.02em]">
        Copertura dei criteri
      </h2>
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Criterio</TableHead>
              <TableHead>Domande nei test</TableHead>
              <TableHead>Domande nelle tracce</TableHead>
              <TableHead>Totale</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {coverage.rows.map((row) => (
              <TableRow
                key={row.criterionId}
                className={row.uncovered ? "bg-warning/10 text-warning" : undefined}
              >
                <TableCell>
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span className="font-medium">{row.name}</span>
                    {row.priority === "must" && (
                      <Badge className={CRITERION_PRIORITY_PRESENTATION.must.className}>
                        {CRITERION_PRIORITY_PRESENTATION.must.label}
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="tabular-nums">
                  {row.quizQuestionCount}
                </TableCell>
                <TableCell className="tabular-nums">
                  {row.guideQuestionCount}
                </TableCell>
                <TableCell className="tabular-nums">{row.total}</TableCell>
                <TableCell className="text-right">
                  {row.uncovered && (
                    <Link
                      href={
                        coverageFixHref(
                          id,
                          coverage.guides,
                          row.criterionId,
                        ) as never
                      }
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      Aggiungi una domanda
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
