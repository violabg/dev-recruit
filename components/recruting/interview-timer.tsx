"use client";
import { Clock } from "lucide-react";
import { useEffect, useLayoutEffect, useState } from "react";

interface InterviewTimerProps {
  timeRemaining: number | null;
  isStarted: boolean;
  isCompleted: boolean;
  isTimeExpired: boolean;
  onTimeExpired: () => void;
}

/**
 * InterviewTimer component - handles hydration-safe timer display and countdown
 * Defers rendering until after hydration to prevent SSR/client mismatch
 */
export function InterviewTimer({
  timeRemaining,
  isStarted,
  isCompleted,
  isTimeExpired,
  onTimeExpired,
}: InterviewTimerProps) {
  const [hydrationComplete, setHydrationComplete] = useState(false);

  // Set hydration flag on client-side after mount to show timer
  // Defer state update to avoid cascading render warning
  useLayoutEffect(() => {
    Promise.resolve().then(() => {
      setHydrationComplete(true);
    });
  }, []);

  // Timer countdown effect
  const [displayTime, setDisplayTime] = useState<number | null>(timeRemaining);

  // Update display time when timeRemaining changes
  useEffect(() => {
    setDisplayTime(timeRemaining);
  }, [timeRemaining]);

  // Timer interval for countdown
  useEffect(() => {
    if (!displayTime || !isStarted || isCompleted || isTimeExpired) return;

    const timer = setInterval(() => {
      setDisplayTime((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          onTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [displayTime, isStarted, isCompleted, isTimeExpired, onTimeExpired]);

  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Only render timer after hydration and when time is available
  if (!hydrationComplete || displayTime === null) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-muted-foreground" />
      <span className="font-mono">{formatTimeRemaining(displayTime)}</span>
    </div>
  );
}
