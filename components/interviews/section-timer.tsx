"use client";

import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

/** Under this many seconds left the timer turns to the warning tint */
const WARNING_SECONDS = 120;

function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Countdown of the planned minutes of a kit section, started by the user. */
export function SectionTimer({ minutes }: { minutes: number }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);

  const remaining = minutes * 60 - elapsed;
  const over = remaining < 0;

  return (
    <div className="flex items-center gap-1">
      <span
        className={cn(
          "font-mono text-sm tabular-nums",
          over
            ? "text-destructive"
            : remaining < WARNING_SECONDS
              ? "text-warning"
              : "text-muted-foreground",
        )}
        aria-live="off"
      >
        {over ? `+${formatSeconds(-remaining)}` : formatSeconds(remaining)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={running ? "Pausa" : "Start"}
        onClick={() => setRunning((value) => !value)}
      >
        {running ? <Pause className="size-4" /> : <Play className="size-4" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Azzera"
        onClick={() => {
          setRunning(false);
          setElapsed(0);
        }}
      >
        <RotateCcw className="size-4" />
      </Button>
    </div>
  );
}
