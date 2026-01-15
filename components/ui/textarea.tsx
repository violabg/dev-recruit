import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex bg-muted/50 hover:bg-muted/80 disabled:opacity-50 shadow-sm px-3 py-2 border-transparent hover:border-ring/30 focus-visible:border-ring/50 focus-within:border-ring/30 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20 w-full min-h-16 placeholder:text-muted-foreground md:text-sm text-base transition-all field-sizing-content disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
