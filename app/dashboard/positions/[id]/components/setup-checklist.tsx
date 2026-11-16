import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPositionSetupStatus } from "@/lib/data/positions";
import { SETUP_STEP_LABEL, SETUP_STEP_TAB } from "@/lib/utils/position-setup";
import { cn } from "cn";
import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

/** Setup steps of the position, each a link to its tab. */
export async function SetupChecklist({ params }: Props) {
  const { id } = await params;
  const setup = await getPositionSetupStatus(id);

  if (!setup) return null;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">Setup della posizione</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-wrap gap-x-6 gap-y-2">
          {setup.steps.map((step) => (
            <li key={step.key}>
              <Link
                href={`/dashboard/positions/${id}?tab=${SETUP_STEP_TAB[step.key]}`}
                className="flex items-center gap-2 hover:bg-muted px-2 py-1 rounded-md text-sm transition-colors"
              >
                {step.done ? (
                  <CheckCircle2 aria-hidden className="size-4 text-success" />
                ) : (
                  <Circle aria-hidden className="size-4 text-muted-foreground" />
                )}
                <span
                  className={cn(!step.done && "text-muted-foreground")}
                >
                  {SETUP_STEP_LABEL[step.key]}
                </span>
                <span className="sr-only">
                  {step.done ? "completato" : "da completare"}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
