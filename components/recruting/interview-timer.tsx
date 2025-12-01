"use client";
import { Clock } from "lucide-react";
import { useEffect, useLayoutEffect, useState } from "react";

interface InterviewTimerProps {
  timeRemaining: number | null;
  isStarted: boolean;
  isCompleted: boolean;
  isTimeExpired: boolean;
  onTimeExpired: () => void;
  totalTimeSeconds?: number;
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
  totalTimeSeconds,
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

  // Calculate icon color based on time remaining percentage
  const getIconColor = () => {
    if (!displayTime || !totalTimeSeconds) return "text-muted-foreground";

    const percentage = (displayTime / totalTimeSeconds) * 100;

    if (percentage <= 10) {
      return "text-red-500"; // Red at 10% or less
    } else if (percentage <= 30) {
      return "text-yellow-500"; // Yellow at 30% or less
    }
    return "text-muted-foreground"; // Default color
  };

  // Only render timer after hydration and when time is available
  if (!hydrationComplete || displayTime === null) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Clock className={`size-4 ${getIconColor()}`} />
      <span className="font-mono">{formatTimeRemaining(displayTime)}</span>
    </div>
  );
}
