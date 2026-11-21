import * as React from "react";

import { cn } from "cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex bg-card dark:bg-input/30 hover:bg-muted/40 disabled:opacity-50 shadow-xs px-3 py-2 border border-input aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive hover:border-ring/30 focus-visible:border-ring/50 focus-within:border-ring/30 rounded-lg outline-none aria-invalid:focus-visible:ring-3 aria-invalid:focus-visible:ring-destructive/20 focus-visible:ring-4 focus-visible:ring-ring/20 w-full min-h-16 placeholder:text-muted-foreground md:text-sm text-base transition-all min-w-0 disabled:pointer-events-none field-sizing-content disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
