import { NextActionCallout } from "@/components/flow";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";
import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Building blocks shared by the read-only detail pages of the dashboard:
 * facts strip, summary numbers, chapter headers, block labels and the
 * "next step" callout. Server-safe: no hooks.
 */

/** Small label that separates a block's name from its content. */
export function BlockLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-semibold text-muted-foreground text-xs">
      {children}
    </span>
  );
}

/** One fact with its icon: label above, value below. */
export function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <span className="flex justify-center items-center bg-primary/10 rounded-md size-8 shrink-0 text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-muted-foreground text-xs">{label}</span>
        <div className="font-medium text-sm">{children}</div>
      </div>
    </div>
  );
}

/** Card holding a row of facts: two per row, four on wide screens. */
export function FactStrip({ children }: { children: ReactNode }) {
  return (
    <Card size="sm">
      <CardContent className="gap-4 grid sm:grid-cols-2 xl:grid-cols-4">
        {children}
      </CardContent>
    </Card>
  );
}

/** A summary number with its caption; `tone` tints the number. */
export function Stat({
  value,
  label,
  tone,
}: {
  value: ReactNode;
  label: string;
  tone?: "warning" | "success" | "destructive";
}) {
  return (
    <div className="flex flex-col">
      <span
        className={cn(
          "font-display font-bold text-heading text-2xl tabular-nums leading-none",
          tone === "warning" && "text-warning",
          tone === "success" && "text-success",
          tone === "destructive" && "text-destructive",
        )}
      >
        {value}
      </span>
      <span className="mt-1 text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="gap-4 grid grid-cols-2 sm:grid-cols-4">{children}</div>
  );
}

/**
 * Chapter header of a long read-only page: number, title and a meta line,
 * underlined in the brand tint. `id` makes it a jump target.
 */
export function ChapterHeader({
  number,
  title,
  meta,
}: {
  number?: number;
  title: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end gap-x-3 gap-y-1 pb-2 border-b-2 border-primary/30">
      {number !== undefined && (
        <span className="font-display font-bold text-primary text-sm tabular-nums">
          {String(number).padStart(2, "0")}
        </span>
      )}
      <h2 className="font-display font-bold text-heading text-xl leading-tight tracking-[-0.02em]">
        {title}
      </h2>
      {meta && (
        <span className="ml-auto text-muted-foreground text-sm">{meta}</span>
      )}
    </header>
  );
}

/**
 * The one thing to do next on a page, with its primary action (the shared
 * "Prossima azione" callout). `pointer` aims its notch at the current
 * station of a track above it.
 */
export function NextStep({
  title,
  description,
  href,
  actionLabel,
  action,
  pointer,
}: {
  title: string;
  description?: ReactNode;
  href?: string;
  actionLabel?: string;
  /** Custom action (e.g. a form button) instead of a link */
  action?: ReactNode;
  pointer?: number;
}) {
  return (
    <NextActionCallout
      title={title}
      description={description}
      pointer={pointer}
      action={
        action ??
        (href && actionLabel ? (
          <Link
            href={href as never}
            className={cn(buttonVariants({ size: "sm" }), "inline-flex")}
          >
            {actionLabel}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null)
      }
    />
  );
}

/** Loading state of a FactStrip with the same labels. */
export function FactStripSkeleton({ labels }: { labels: string[] }) {
  return (
    <Card size="sm">
      <CardContent className="gap-4 grid sm:grid-cols-2 xl:grid-cols-4">
        {labels.map((label) => (
          <div key={label} className="flex items-start gap-3">
            <Skeleton className="rounded-md size-8 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">{label}</span>
              <Skeleton className="w-28 h-4" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
