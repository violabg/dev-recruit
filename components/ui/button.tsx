import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group inline-flex relative justify-center items-center gap-2 disabled:opacity-50 aria-invalid:border-destructive focus-visible:border-ring rounded-xl outline-none aria-invalid:ring-destructive/20 focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 overflow-hidden font-medium text-vision-sm whitespace-nowrap transition-all duration-300 ease-vision [&_svg]:pointer-events-none disabled:pointer-events-none shrink-0 [&_svg]:shrink-0 vision-interactive",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-vision hover:shadow-vision-md hover:-translate-y-0.5 active:translate-y-0 backdrop-blur-[20px] border border-primary/30 hover:border-primary/50 vision-elevated vision-primary",
        success:
          "bg-gradient-to-br from-green-500 to-green-500/80 text-green-500-foreground shadow-vision hover:shadow-vision-md hover:-translate-y-0.5 active:translate-y-0 backdrop-blur-[20px] border border-green-500/30 hover:border-green-500/50 vision-elevated vision-success text-black",
        destructive:
          "bg-gradient-to-br from-destructive to-destructive/80 text-white shadow-vision hover:shadow-vision-md hover:-translate-y-0.5 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 backdrop-blur-[20px] border border-destructive/30 hover:border-destructive/50 vision-elevated vision-destructive",
        outline:
          "border border-glass-border/80 hover:border-glass-border bg-glass-bg hover:bg-card-hover backdrop-blur-[20px] shadow-vision-sm hover:shadow-vision hover:-translate-y-0.5 text-foreground vision-elevated vision-outline",
        outlineDestructive:
          "shadow-vision-sm border border-destructive/50 hover:border-destructive/70 backdrop-blur-[20px] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive hover:-translate-y-0.5 hover:bg-destructive/5 vision-elevated vision-outline-destructive",
        secondary:
          "bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground shadow-vision-sm hover:shadow-vision hover:-translate-y-0.5 backdrop-blur-[20px] border border-secondary/30 hover:border-secondary/50 vision-elevated vision-secondary",
        ghost:
          "border border-transparent hover:border-glass-border/60 bg-transparent hover:bg-glass-bg/50 backdrop-blur-[20px] hover:text-accent-foreground text-foreground hover:-translate-y-0.5",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80 transition-colors",
        glass:
          "bg-glass-bg border border-glass-border/80 hover:border-glass-border backdrop-blur-[20px] shadow-glass hover:shadow-vision-md hover:-translate-y-0.5 text-foreground vision-elevated",
      },
      size: {
        default: "h-10 px-6 py-2.5 has-[>svg]:px-4",
        sm: "h-9 rounded-lg gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-12 rounded-xl px-8 has-[>svg]:px-6",
        icon: "size-10",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  const hasShimmer = variant !== "link";

  // Universal shimmer classes that work with both asChild and regular buttons
  const shimmerClasses = hasShimmer
    ? "before:absolute before:inset-0 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 before:pointer-events-none before:content-[''] after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:skew-x-12 after:transition-transform after:-translate-x-full hover:after:translate-x-full after:duration-1000 after:ease-out after:opacity-0 hover:after:opacity-100 after:pointer-events-none after:content-['']"
    : "";

  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size }),
        shimmerClasses,
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}

export { Button, buttonVariants };
