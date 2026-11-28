"use client";

import { NextActionCallout } from "@/components/flow";
import { Button, buttonVariants } from "@/components/ui/button";
import { moveApplicationStageAction } from "@/lib/actions/applications";
import type { ApplicationStage } from "@/lib/schemas";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import type { NextAction } from "@/lib/utils/next-action";
import { AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

/**
 * "Prossima azione" of an application: what to do next, with its action.
 * Stage corrections stay in the header's "Sposta di fase".
 */
export function NextActionCard({
  applicationId,
  action,
  candidateEditHref,
  showAction = true,
}: {
  applicationId: string;
  action: NextAction;
  candidateEditHref: string;
  /** false when the stop body holds the action: no control in the card */
  showAction?: boolean;
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
      case "send_assessment":
      case "schedule_interview":
        // The current stop's body holds this action and its primary button
        return null;
      case "generate_evaluation":
        return (
          <Link
            href={`/dashboard/assessments/${action.assessmentId}`}
            className={linkClass}
          >
            Genera valutazione
          </Link>
        );
      case "prepare_interview":
        return (
          <Link
              href={
                `${applicationHref}/interviews/${action.interviewId}/prepare` as never
              }
              className={linkClass}
            >
              Prepara colloquio
            </Link>
        );
      case "fill_feedback":
        return (
          <Link
              href={
                `${applicationHref}/interviews/${action.interviewId}/feedback` as never
              }
              className={linkClass}
            >
              Scrivi il feedback
            </Link>
        );
      case "go_to_decision":
        return (
          <Link
            href={`${applicationHref}/decision` as never}
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
    <NextActionCallout
      title={action.label}
      action={showAction ? renderAction() : undefined}
    >
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
    </NextActionCallout>
  );
}
