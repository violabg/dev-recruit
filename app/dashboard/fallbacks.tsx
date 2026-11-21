import {
  QUEUE_KEYS,
  QUEUE_SUMMARY_LABELS,
  QUEUE_TITLES,
} from "@/components/dashboard/action-center";
import { TextSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Fragment } from "react";

/** Mirrors ActionSummary: bars and real labels, counts pending. */
export function ActionSummarySkeleton() {
  return (
    <ul className="gap-x-1 gap-y-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      {QUEUE_KEYS.map((key) => (
        <li
          key={key}
          className={key === "stale" ? "flex flex-col gap-2 lg:ml-5" : "flex flex-col gap-2"}
        >
          <span className="bg-track-rail rounded-full h-1" />
          <span className="flex items-center gap-2 h-7 text-muted-foreground text-sm">
            <Skeleton className="w-4 h-5" />
            {QUEUE_SUMMARY_LABELS[key]}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Mirrors ActionCenter: the station line with the real stop titles. */
export function ActionCenterSkeleton() {
  return (
    <ol className="relative flex flex-col gap-5 before:top-3 before:bottom-3 before:left-[9px] before:absolute before:bg-track-rail before:rounded-full before:w-1">
      {QUEUE_KEYS.map((key) => (
        <Fragment key={key}>
          {key === "stale" && <li aria-hidden className="border-t" />}
          <li className="relative pl-11">
            <span className="top-0.5 left-0 absolute bg-background border-4 border-track-rail rounded-full size-[22px]" />
            <p className="mb-2 font-display font-bold text-heading text-lg leading-7">
              {QUEUE_TITLES[key]}
            </p>
            <div className="flex flex-col gap-2 bg-card px-4 py-3 rounded-xl ring-1 ring-border">
              <TextSkeleton className="w-56" />
              <TextSkeleton className="w-40" />
            </div>
          </li>
        </Fragment>
      ))}
    </ol>
  );
}
