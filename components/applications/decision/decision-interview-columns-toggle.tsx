"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Independence view arrangement of the Decision page: the interviews whose
 * columns start collapsed for a participant who has not submitted a
 * scorecard yet. Purely visual: the data is already on the page and the read
 * is never filtered by user.
 */

type DecisionColumnsContextValue = {
  collapsed: Set<string>;
  expand: (interviewId: string) => void;
};

const DecisionColumnsContext =
  createContext<DecisionColumnsContextValue | null>(null);

export function DecisionColumnsProvider({
  collapsedInterviewIds,
  children,
}: {
  collapsedInterviewIds: string[];
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(
    () => new Set(collapsedInterviewIds),
  );

  const expand = useCallback((interviewId: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      next.delete(interviewId);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ collapsed, expand }), [collapsed, expand]);

  return (
    <DecisionColumnsContext.Provider value={value}>
      {children}
    </DecisionColumnsContext.Provider>
  );
}

export function DecisionInterviewColumnsToggle({
  interviewId,
  round,
  feedbackHref,
}: {
  interviewId: string;
  round: number;
  feedbackHref: string;
}) {
  const context = useContext(DecisionColumnsContext);

  if (!context || !context.collapsed.has(interviewId)) {
    return null;
  }

  return (
    <div className="flex flex-col items-start gap-1 mt-1 font-normal">
      <span className="bg-warning/10 px-2 py-1 rounded-md text-warning text-xs">
        Per un giudizio indipendente, invia prima il tuo feedback
      </span>
      <div className="flex items-center gap-2">
        <Link
          href={feedbackHref as never}
          className="text-primary text-xs underline-offset-4 hover:underline"
        >
          Scrivi il tuo feedback
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Mostra i feedback del Colloquio ${round}`}
          onClick={() => context.expand(interviewId)}
        >
          Mostra
        </Button>
      </div>
    </div>
  );
}

export function DecisionCollapsible({
  interviewIds,
  placeholder,
  children,
}: {
  interviewIds: string[];
  placeholder?: React.ReactNode;
  children: React.ReactNode;
}) {
  const context = useContext(DecisionColumnsContext);

  if (!context || !interviewIds.some((id) => context.collapsed.has(id))) {
    return <>{children}</>;
  }

  return (
    <span aria-label="Nascosto finché non invii il tuo feedback">
      {placeholder ?? "•••"}
    </span>
  );
}
