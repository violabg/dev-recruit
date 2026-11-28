"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { StoryStop } from "@/lib/utils/application-story";
import { cn } from "cn";
import { useState, type ReactNode } from "react";

/**
 * One stop of the application story: concluded stops are a single row that
 * expands on "Apri", the current stop is an open card, future stops are dashed
 * with the condition that unlocks them. The body is server-rendered children.
 */
export function StoryStop({
  stop,
  defaultOpen,
  children,
}: {
  stop: StoryStop;
  defaultOpen?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <li id={stop.key} className="relative pl-10 scroll-mt-16">
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-3 rounded-full size-[22px]",
          stop.state === "done" && "bg-success",
          stop.state === "current" &&
            "bg-background ring-[3px] ring-primary",
          stop.state === "future" && "bg-background ring-1 ring-border",
        )}
      />

      {stop.state === "current" && (
        <section className="flex flex-col gap-4 bg-card p-6 border-2 border-primary rounded-xl">
          <h3 className="font-display font-bold text-heading text-xl tracking-[-0.01em]">
            {stop.title}
          </h3>
          {children}
        </section>
      )}

      {stop.state === "done" && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger
            render={
              <button
                type="button"
                aria-expanded={open}
                className="items-center gap-4 grid grid-cols-[9rem_minmax(0,1fr)_auto] bg-card hover:bg-muted/60 px-4 py-3 border rounded-xl w-full text-left transition-colors"
              />
            }
          >
            <span className="font-display font-semibold text-heading">
              {stop.title}
            </span>
            <span className="text-muted-foreground text-sm">
              {stop.outcomeText}
            </span>
            <span className={buttonVariants({ variant: "outline", size: "sm" })}>
              {open ? "Chiudi" : "Apri"}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">{children}</CollapsibleContent>
        </Collapsible>
      )}

      {stop.state === "future" && (
        <div className="flex flex-col gap-1 px-4 py-3 border border-dashed rounded-xl">
          <span className="font-display font-semibold text-muted-foreground">
            {stop.title}
          </span>
          {stop.unlockText && (
            <span className="text-muted-foreground text-sm">
              {stop.unlockText}
            </span>
          )}
        </div>
      )}
    </li>
  );
}
