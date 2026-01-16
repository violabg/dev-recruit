import { Input as InputPrimitive } from "@base-ui/react/input";
import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "bg-muted/50 hover:bg-muted/80 disabled:opacity-50 shadow-sm px-3 py-1 border border-transparent aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive hover:border-ring/30 focus-visible:border-ring/50 focus-within:border-ring/30 rounded-lg focus-visible:outline-none aria-invalid:focus-visible:ring-[3px] aria-invalid:focus-visible:ring-destructive/20 focus-visible:ring-4 focus-visible:ring-ring/20 w-full h-9 file:h-6 file:font-medium placeholder:text-muted-foreground md:text-sm file:text-sm text-base transition-all disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  );
}

export { Input };
