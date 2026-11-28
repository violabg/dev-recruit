import { cn } from "cn";
import { Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The flow language of the dashboard: every sequence the user moves through
 * (application stages, interview steps, the home queues) is drawn as
 * stations on a line. Passed stations are brand green, the current one is
 * brand blue with a halo, the rest sit on the grey rail. Server-safe.
 */

export type StationState = "done" | "current" | "todo";

export type Station = {
  key: string;
  label: string;
  state: StationState;
  /** Short line under the label (e.g. "da 2 giorni") */
  hint?: ReactNode;
  /** Makes the station a link */
  href?: string;
};

/** Node of a station: filled when passed, ringed when current, hollow ahead. */
function StationNode({
  state,
  size = "md",
}: {
  state: StationState;
  size?: "sm" | "md";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 flex justify-center items-center rounded-full shrink-0",
        size === "md" ? "border-4 size-[22px]" : "border-[3px] size-3.5",
        state === "done" && "bg-track-done border-track-done text-white",
        state === "current" && "bg-band border-primary ring-4 ring-primary/20",
        state === "todo" && "bg-band border-track-rail",
      )}
    >
      {state === "done" && size === "md" && (
        <Check className="size-2.5" strokeWidth={4} />
      )}
    </span>
  );
}

/** Spoken state of a station, for screen readers. */
const STATE_TEXT: Record<StationState, string> = {
  done: "fatto",
  current: "fase attuale",
  todo: "da fare",
};

/**
 * Horizontal track of stations. The connector after a station is coloured
 * when the next station has been reached; connectors grow in once on load
 * (the only ambient motion, off with reduced motion). Below `sm` only the
 * current station keeps its label.
 */
export function StationTrack({
  stations,
  label,
  className,
}: {
  stations: Station[];
  /** aria-label of the list */
  label: string;
  className?: string;
}) {
  return (
    <ol
      aria-label={label}
      className={cn("grid", className)}
      style={{ gridTemplateColumns: `repeat(${stations.length}, minmax(0, 1fr))` }}
    >
      {stations.map((station, index) => {
        const next = stations[index + 1];
        const content = (
          <>
            <StationNode state={station.state} />
            <span
              className={cn(
                "flex flex-col items-center mt-2 px-1 max-w-full text-xs sm:text-sm text-center leading-tight",
                station.state === "current"
                  ? "font-semibold text-primary-ink"
                  : station.state === "done"
                    ? "text-foreground"
                    : "text-muted-foreground",
                station.state !== "current" && "max-sm:sr-only",
              )}
            >
              <span className="max-w-full truncate">{station.label}</span>
              {station.hint && (
                <span className="mt-0.5 font-normal text-muted-foreground text-xs">
                  {station.hint}
                </span>
              )}
              <span className="sr-only">, {STATE_TEXT[station.state]}</span>
            </span>
          </>
        );

        return (
          <li
            key={station.key}
            aria-current={station.state === "current" ? "step" : undefined}
            className="relative flex flex-col items-center min-w-0"
          >
            {next && (
              <span
                aria-hidden
                className="top-[9px] left-1/2 absolute bg-track-rail rounded-full w-full h-1 overflow-hidden"
              >
                {next.state !== "todo" && (
                  <span
                    className={cn(
                      "block size-full origin-left motion-safe:animate-[pipeline-grow_450ms_cubic-bezier(0.2,0.7,0.2,1)_both]",
                      next.state === "current" ? "bg-primary" : "bg-track-done",
                    )}
                    style={{ animationDelay: `${index * 60}ms` }}
                  />
                )}
              </span>
            )}
            {station.href ? (
              <Link
                href={station.href as never}
                className="group flex flex-col items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-w-full [&>span:last-child]:hover:underline"
              >
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * "Prossima azione": the one thing to do next, with its action. When it
 * belongs to a track, `pointer` (0–1) aims its notch at the current station.
 */
export function NextActionCallout({
  title,
  description,
  action,
  pointer,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Horizontal position of the notch, as a fraction of the width */
  pointer?: number;
  /** Extra content under the main row (e.g. a warning) */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 bg-primary/10 dark:bg-primary/20 px-4 py-3 rounded-xl",
        pointer !== undefined && "mt-3",
        className,
      )}
    >
      {pointer !== undefined && (
        <span
          aria-hidden
          className="-top-2 absolute bg-inherit w-4 h-2 -translate-x-1/2 [clip-path:polygon(50%_0,100%_100%,0_100%)]"
          style={{ left: `clamp(1.5rem, ${pointer * 100}%, calc(100% - 1.5rem))` }}
        />
      )}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-semibold text-primary-ink text-xs">
            Prossima azione
          </span>
          <span className="font-semibold text-foreground">{title}</span>
          {description && (
            <span className="text-muted-foreground text-sm">{description}</span>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Notch position of station `index` on a track of `count` stations. */
export function stationPointer(index: number, count: number) {
  return (index + 0.5) / count;
}

export type StopTone = "active" | "clear" | "warn";

/** Vertical line holding stops; `children` are <StationStop>s or dividers. */
export function StationLine({ children }: { children: ReactNode }) {
  return (
    <ol className="relative flex flex-col gap-5 before:top-3 before:bottom-3 before:left-[9px] before:absolute before:bg-track-rail before:rounded-full before:w-1">
      {children}
    </ol>
  );
}

/** Break in a StationLine before stops that are outside the flow. */
export function StationDivider() {
  return <li aria-hidden className="ml-[-1px] border-t" />;
}

/**
 * One stop on a StationLine: ringed blue when it holds work, filled green
 * when clear, ringed amber for a warning. A clear stop shows only its title
 * and `clearText`.
 */
export function StationStop({
  id,
  title,
  count,
  tone,
  clearText,
  children,
}: {
  id?: string;
  title: string;
  count: number;
  tone: StopTone;
  /** Shown instead of the count when the stop is clear */
  clearText?: string;
  children?: ReactNode;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <li
      id={id}
      aria-labelledby={headingId}
      className="relative pl-11 scroll-mt-16"
    >
      <span
        aria-hidden
        className={cn(
          "top-0.5 left-0 absolute border-4 rounded-full size-[22px]",
          tone === "active" && "bg-background border-primary",
          tone === "clear" && "bg-track-done border-track-done",
          tone === "warn" && "bg-background border-track-warn",
        )}
      />
      <h2
        id={headingId}
        className={cn(
          "flex flex-wrap items-baseline gap-x-2.5 font-display leading-7",
          tone === "clear"
            ? "font-semibold text-muted-foreground text-base"
            : "mb-2 font-bold text-heading text-lg tracking-[-0.01em]",
        )}
      >
        {title}
        {tone === "clear" ? (
          <span className="font-sans font-medium text-success text-sm">
            <Check className="inline mr-1 size-3.5" aria-hidden />
            {clearText ?? "Niente da fare"}
          </span>
        ) : (
          <span
            className={cn(
              "tabular-nums",
              tone === "warn" ? "text-warning" : "text-primary-ink",
            )}
          >
            {count}
          </span>
        )}
      </h2>
      {tone !== "clear" && children}
    </li>
  );
}

export type QueueSummaryItem = {
  key: string;
  label: string;
  count: number;
  href: string;
  /** Warning queues sit apart, after the flow */
  tone?: "flow" | "warn";
};

/**
 * Counts of the work queues in flow order, each a link to its stop. A bar
 * on top: blue with work, faint green when clear, amber for warnings.
 */
export function QueueSummary({ items }: { items: QueueSummaryItem[] }) {
  return (
    <ul className="gap-x-1 gap-y-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => {
        const clear = item.count === 0;
        const warn = item.tone === "warn";
        return (
          <li key={item.key} className={cn(warn && "lg:ml-5")}>
            <a
              href={item.href}
              className="group flex flex-col gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                aria-hidden
                className={cn(
                  "rounded-full h-1",
                  clear
                    ? "bg-track-done/60"
                    : warn
                      ? "bg-track-warn"
                      : "bg-primary",
                )}
              />
              <span className="flex items-baseline gap-2 text-muted-foreground group-hover:text-foreground text-sm transition-colors">
                <span
                  className={cn(
                    "font-display font-extrabold text-xl tabular-nums",
                    clear
                      ? "text-muted-foreground/70"
                      : warn
                        ? "text-warning"
                        : "text-heading",
                  )}
                >
                  {item.count}
                </span>
                {item.label}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Row of a stop's list: the whole row is the link, `verb` looks like a button. */
export function QueueRow({
  href,
  title,
  context,
  detail,
  verb,
  primary = false,
}: {
  href: string;
  title: string;
  /** Secondary line under the title (e.g. the position) */
  context?: ReactNode;
  detail?: ReactNode;
  verb: string;
  /** The page's single next step: a filled primary, never a hover fill */
  primary?: boolean;
}) {
  return (
    <li>
      <Link
        href={href as never}
        className="group items-center gap-x-4 gap-y-1 grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] hover:bg-muted/60 focus-visible:bg-muted/60 px-4 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset transition-colors"
      >
        <span className="flex flex-col min-w-0">
          <span className="font-medium truncate">{title}</span>
          {context && (
            <span className="text-muted-foreground text-sm truncate">
              {context}
            </span>
          )}
        </span>
        <span className="max-md:order-last max-md:col-span-2 min-w-0 text-muted-foreground text-sm truncate">
          {detail}
        </span>
        <span
          className={cn(
            "inline-flex items-center px-2.5 border rounded-md h-7 font-medium text-xs whitespace-nowrap transition-colors",
            primary
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground",
          )}
        >
          {verb}
        </span>
      </Link>
    </li>
  );
}

/** Card holding the rows of a stop. */
export function QueueList({ children }: { children: ReactNode }) {
  return (
    <ul className="bg-card rounded-xl ring-1 ring-border overflow-hidden divide-y">
      {children}
    </ul>
  );
}
