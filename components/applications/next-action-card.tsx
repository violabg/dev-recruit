"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { moveApplicationStageAction } from "@/lib/actions/applications";
import type { ApplicationStage } from "@/lib/schemas";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import type { NextAction } from "@/lib/utils/next-action";
import { AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { MoveStageMenu } from "./move-stage-menu";

const PHASE_3_HINT =
  "La pianificazione del colloquio arriva con la Fase 3: per ora sposta la fase a mano";

/** Card "Prossima azione": what to do next on this application. */
export function NextActionCard({
  applicationId,
  stage,
  action,
  candidateEditHref,
}: {
  applicationId: string;
  stage: ApplicationStage;
  action: NextAction;
  candidateEditHref: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const applicationHref = `/dashboard/applications/${applicationId}`;

  const moveTo = (target: ApplicationStage) => {
    startTransition(async () => {
      try {
        unwrap(await moveApplicationStageAction({ applicationId, stage: target }));
        toast.success("Fase aggiornata");
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  };

  const linkClass = buttonVariants({ variant: "default", size: "sm" });

  const renderAction = () => {
    switch (action.kind) {
      case "evaluate_cv":
        return (
          <Link href={`${applicationHref}?tab=cv` as never} className={linkClass}>
            Valuta CV
          </Link>
        );
      case "send_assessment":
        return (
          <Link href={`${applicationHref}?tab=test` as never} className={linkClass}>
            Invia test
          </Link>
        );
      case "generate_evaluation":
        return (
          <Link
            href={`/dashboard/assessments/${action.assessmentId}`}
            className={linkClass}
          >
            Genera valutazione
          </Link>
        );
      case "schedule_interview":
      case "prepare_interview":
      case "fill_feedback":
        return (
          <div className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground text-sm">{PHASE_3_HINT}</p>
            <MoveStageMenu applicationId={applicationId} stage={stage} />
          </div>
        );
      case "go_to_decision":
        return (
          <Link
            href={`${applicationHref}?tab=decisione` as never}
            className={linkClass}
          >
            Vai alla decisione
          </Link>
        );
      case "advance_stage":
        return action.targetStage ? (
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() => moveTo(action.targetStage as ApplicationStage)}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {action.label}
          </Button>
        ) : null;
      case "closed":
        return (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-muted-foreground text-sm">Candidatura chiusa</p>
            {action.canReopen && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => moveTo("applied")}
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Riapri
              </Button>
            )}
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm">
          Prossima azione
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="font-display font-bold text-heading text-xl">
          {action.label}
        </p>
        {renderAction()}
        {action.missingResume && (
          <div className="flex flex-wrap items-center gap-2 bg-warning/10 px-3 py-2 rounded-lg text-warning text-sm">
            <AlertTriangle className="size-4 shrink-0" />
            <span>CV mancante</span>
            <Link
              href={candidateEditHref as never}
              className="font-medium underline underline-offset-2"
            >
              Carica il CV
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
