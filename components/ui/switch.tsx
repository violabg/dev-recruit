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
        "peer inline-flex items-center data-[state=checked]:bg-primary data-[state=unchecked]:bg-input disabled:opacity-50 shadow-sm border-2 border-transparent rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background w-9 h-5 transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "block bg-background shadow-lg rounded-full ring-0 size-4 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0 pointer-events-none"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
