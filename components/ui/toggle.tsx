"use client";

import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "inline-flex justify-center items-center gap-2 hover:bg-glass-bg data-[state=on]:bg-gradient-to-br data-[state=on]:from-primary/20 data-[state=on]:to-primary/10 disabled:opacity-50 data-[state=on]:shadow-vision-sm data-[state=on]:border-primary/30 aria-invalid:border-destructive hover:border-glass-border/60 focus-visible:border-ring rounded-lg outline-none aria-invalid:ring-destructive/20 focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 font-medium data-[state=on]:text-primary hover:text-foreground text-sm whitespace-nowrap transition-all duration-300 ease-vision [&_svg]:pointer-events-none disabled:pointer-events-none [&_svg]:shrink-0 vision-interactive",
  {
    variants: {
      variant: {
        default: "bg-transparent border border-transparent",
        outline:
          "border border-glass-border/60 bg-glass-bg/50 shadow-vision-xs hover:bg-glass-bg hover:text-foreground hover:border-glass-border",
      },
      size: {
        default: "h-9 px-2 min-w-9",
        sm: "h-8 px-1.5 min-w-8",
        lg: "h-10 px-2.5 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
