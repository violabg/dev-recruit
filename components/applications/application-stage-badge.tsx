import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import { getApplicationStagePresentation } from "./application-stage";

/** Badge of an application stage: label and tint from the shared map */
export function ApplicationStageBadge({
  stage,
  className,
}: {
  stage: string;
  className?: string;
}) {
  const presentation = getApplicationStagePresentation(stage);
  return (
    <Badge className={cn("w-fit", presentation.badge, className)}>
      {presentation.label}
    </Badge>
  );
}
