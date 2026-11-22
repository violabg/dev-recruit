/**
 * Frame of the React widgets: the header band with the section stripe of
 * the dashboard, and the error line.
 */

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Section of the dashboard the widget belongs to: its stripe and icon colour */
const SECTION = {
  positions: { stripe: "border-l-section-positions", icon: "text-section-positions" },
  quizzes: { stripe: "border-l-section-quizzes", icon: "text-section-quizzes" },
  candidates: { stripe: "border-l-section-candidates", icon: "text-section-candidates" },
} as const;

export function WidgetHeader({
  icon: Icon,
  section,
  eyebrow,
  title,
  children,
}: {
  icon: LucideIcon;
  section: keyof typeof SECTION;
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  const tone = SECTION[section];
  return (
    <header
      className={`flex items-start gap-3 bg-band px-5 pt-4 pb-3 border-b border-l-4 ${tone.stripe}`}
    >
      <Icon aria-hidden className={`mt-1 size-5 shrink-0 ${tone.icon}`} />
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          {eyebrow} · dev-recruit
        </p>
        <h1 className="font-display font-semibold text-heading text-lg truncate">{title}</h1>
        {children}
      </div>
    </header>
  );
}

export function ErrorLine({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="bg-destructive/10 px-3 py-2 rounded-md text-destructive text-sm">
      {children}
    </p>
  );
}

/** Done state of a widget: a check, what happened, what comes next */
export function DoneLine({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon aria-hidden className="mt-0.5 size-5 text-success shrink-0" />
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{children}</p>
      </div>
    </div>
  );
}
