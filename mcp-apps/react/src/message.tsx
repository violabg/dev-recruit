import { cn } from "cn";
import type { ReactNode } from "react";

/** One-line state of the widget: loading, error, no data */
export function Message({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "error";
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "px-4 py-6 text-sm text-center",
        tone === "error" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}
