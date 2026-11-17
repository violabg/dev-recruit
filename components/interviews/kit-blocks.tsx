import { cn } from "cn";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Presentational blocks shared by the kit view (/prepare) and the live mode:
 * block labels, follow-up list and the three-level answer anchors.
 */

const ANCHORS = [
  {
    key: "weak",
    label: "Debole",
    className: "border-l-destructive bg-destructive/5",
    labelClassName: "text-destructive",
  },
  {
    key: "medium",
    label: "Media",
    className: "border-l-warning bg-warning/5",
    labelClassName: "text-warning",
  },
  {
    key: "strong",
    label: "Forte",
    className: "border-l-success bg-success/5",
    labelClassName: "text-success",
  },
] as const;

type Anchors = { weak: string; medium: string; strong: string };

/** Small uppercase label that separates a block's name from its content. */
export function BlockLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
      {children}
    </span>
  );
}

export function hasAnchors(anchors: Anchors) {
  return Boolean(anchors.weak || anchors.medium || anchors.strong);
}

export function FollowUpList({ followUps }: { followUps: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <BlockLabel>Approfondimenti</BlockLabel>
      <ul className="flex flex-col gap-1.5 text-sm">
        {followUps.map((followUp, index) => (
          <li key={index} className="flex items-start gap-2 leading-relaxed">
            <ChevronRight
              className="mt-0.5 size-4 text-primary shrink-0"
              aria-hidden
            />
            <span>{followUp}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Weak, medium and strong expected answers, tinted red, amber and green. */
export function AnswerAnchors({
  anchors,
  className,
}: {
  anchors: Anchors;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <BlockLabel>Come valutare la risposta</BlockLabel>
      <div className={cn("gap-2 grid md:grid-cols-3", className)}>
        {ANCHORS.map((anchor) => (
          <div
            key={anchor.key}
            className={cn(
              "flex flex-col gap-1 px-3 py-2 border-l-4 rounded-md text-sm",
              anchor.className,
            )}
          >
            <span
              className={cn(
                "font-semibold text-xs uppercase tracking-wide",
                anchor.labelClassName,
              )}
            >
              {anchor.label}
            </span>
            <p className="leading-relaxed">{anchors[anchor.key] || "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
