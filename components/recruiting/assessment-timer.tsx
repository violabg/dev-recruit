"use client";
import { cn } from "cn";
import { Clock } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useState,
  useSyncExternalStore,
} from "react";

const noopSubscribe = () => () => {};

interface AssessmentTimerProps {
  timeRemaining: number | null;
  isStarted: boolean;
  isCompleted: boolean;
  isTimeExpired: boolean;
  onTimeExpired: () => void;
  totalTimeSeconds?: number;
}

/**
 * AssessmentTimer component - handles hydration-safe timer display and countdown
 * Defers rendering until after hydration to prevent SSR/client mismatch
 */
export function AssessmentTimer({
  timeRemaining,
  isStarted,
  isCompleted,
  isTimeExpired,
  onTimeExpired,
  totalTimeSeconds,
}: AssessmentTimerProps) {
  // true on the client after hydration, false during SSR — avoids mismatches
  const hydrationComplete = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  // Timer countdown effect
  const [displayTime, setDisplayTime] = useState<number | null>(timeRemaining);
  const [prevTimeRemaining, setPrevTimeRemaining] = useState(timeRemaining);

  // Update display time when timeRemaining changes (adjust state during render)
  if (timeRemaining !== prevTimeRemaining) {
    setPrevTimeRemaining(timeRemaining);
    setDisplayTime(timeRemaining);
  }

  // Effect Event: always calls the latest `onTimeExpired` without making the
  // countdown effect re-subscribe when the parent passes a new callback.
  const onExpire = useEffectEvent(() => {
    onTimeExpired();
  });

  const isRunning =
    displayTime !== null &&
    displayTime > 0 &&
    isStarted &&
    !isCompleted &&
    !isTimeExpired;

  // Single interval for the whole countdown (not recreated every tick)
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setDisplayTime((prev) => (prev === null ? prev : Math.max(prev - 1, 0)));
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning]);

  // Notify the parent once when the countdown reaches zero
  useEffect(() => {
    if (displayTime === 0 && isStarted && !isCompleted && !isTimeExpired) {
      onExpire();
    }
  }, [displayTime, isStarted, isCompleted, isTimeExpired]);

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
      return "text-destructive"; // Red at 10% or less
    } else if (percentage <= 30) {
      return "text-warning"; // Yellow at 30% or less
    }
    return "text-muted-foreground"; // Default color
  };

  // Only render timer after hydration and when time is available
  if (!hydrationComplete || displayTime === null) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Clock className={cn("size-4", getIconColor())} />
      <span className="font-mono">{formatTimeRemaining(displayTime)}</span>
    </div>
  );
}
