"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-primary data-[state=checked]:to-primary/80 data-[state=unchecked]:bg-glass-bg focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-glass-bg/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-glass-border/60 shadow-vision-sm transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50  vision-interactive hover:shadow-vision data-[state=checked]:border-primary/30 data-[state=checked]:shadow-vision hover:border-glass-border",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 shadow-vision-xs data-[state=checked]:shadow-vision-sm"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
