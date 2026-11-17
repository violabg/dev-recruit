import type { PositionStatus } from "@/lib/schemas";

type PositionStatusPresentation = {
  /** Italian label shown to the recruiter */
  label: string;
  /** Tint classes for a badge */
  badge: string;
};

/** Label and badge tint of every position status, defined once */
export const POSITION_STATUS_PRESENTATION: Record<
  PositionStatus,
  PositionStatusPresentation
> = {
  draft: { label: "Bozza", badge: "bg-warning/10 text-warning" },
  open: { label: "Aperta", badge: "bg-success/10 text-success" },
  closed: { label: "Chiusa", badge: "bg-muted text-muted-foreground" },
};

export function getPositionStatusPresentation(
  status: string,
): PositionStatusPresentation {
  return (
    POSITION_STATUS_PRESENTATION[status as PositionStatus] ?? {
      label: status,
      badge: "bg-muted text-muted-foreground",
    }
  );
}
