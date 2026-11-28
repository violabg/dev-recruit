"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { moveApplicationStageAction } from "@/lib/actions/applications";
import { APPLICATION_STAGE_VALUES, type ApplicationStage } from "@/lib/schemas";
import { errorMessage, unwrap } from "@/lib/utils/action-result";
import { cn } from "cn";
import { ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { APPLICATION_STAGE_PRESENTATION } from "./application-stage";

/**
 * Manual move of an application: any stage to any stage. The current stage
 * is listed but disabled.
 */
export function MoveStageMenu({
  applicationId,
  stage,
}: {
  applicationId: string;
  stage: ApplicationStage;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" disabled={isPending} />}
      >
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Sposta di fase
        <ChevronDown className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {APPLICATION_STAGE_VALUES.map((value) => {
          const presentation = APPLICATION_STAGE_PRESENTATION[value];
          return (
            <DropdownMenuItem
              key={value}
              disabled={value === stage}
              onClick={() => moveTo(value)}
            >
              <span
                aria-hidden
                className={cn("rounded-full size-2", presentation.dot)}
              />
              {presentation.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
