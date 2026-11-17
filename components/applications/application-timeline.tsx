import type { TimelineEntry } from "@/lib/utils/application-timeline";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import Link from "next/link";

/** Evidence timeline of an application, newest first. */
export function ApplicationTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="py-6 text-muted-foreground text-sm text-center">
        Nessuna prova raccolta
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-4 pl-4 border-l">
      {entries.map((entry, index) => (
        <li key={`${entry.kind}-${index}`} className="relative">
          <span
            aria-hidden
            className="top-1.5 -left-[1.3rem] absolute bg-primary rounded-full size-2"
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
              className="font-medium text-sm hover:underline"
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
