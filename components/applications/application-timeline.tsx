import { cn } from "cn";
import type { TimelineEntry } from "@/lib/utils/application-timeline";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import Link from "next/link";

/**
 * Evidence timeline of an application, newest first, as small stations on a
 * vertical line: the latest event is ringed blue, earlier ones are passed.
 */
export function ApplicationTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="py-6 text-muted-foreground text-sm text-center">
        Nessuna prova raccolta
      </p>
    );
  }

  return (
    <ol className="relative flex flex-col gap-3 pl-8 before:top-2 before:bottom-2 before:left-[5.5px] before:absolute before:bg-track-rail before:rounded-full before:w-[3px]">
      {entries.map((entry, index) => (
        <li key={`${entry.kind}-${index}`} className="relative">
          <span
            aria-hidden
            className={cn(
              "top-1 -left-8 absolute border-[3px] rounded-full size-3.5",
              index === 0
                ? "bg-card border-primary"
                : "bg-track-done border-track-done",
            )}
          />
          <time
            dateTime={entry.at.toISOString()}
            className="block text-muted-foreground text-xs"
          >
            {format(entry.at, "d MMMM yyyy, HH:mm", { locale: it })}
          </time>
          {entry.href ? (
            <Link
              href={entry.href as never}
              className="font-medium text-primary-ink text-sm hover:underline"
            >
              {entry.label}
            </Link>
          ) : (
            <span className="font-medium text-sm">{entry.label}</span>
          )}
        </li>
      ))}
    </ol>
  );
}
