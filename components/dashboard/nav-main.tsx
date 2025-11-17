"use client";
import { Loader2, type LucideIcon } from "lucide-react";
import * as React from "react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function NavMain({
  items,
  ...props
}: {
  items: {
    label: string;
    href: string;
    icon: LucideIcon;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const pathname = usePathname();
  const [clickedHref, setClickedHref] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const handleNavigation = (href: string) => {
    setClickedHref(href);
    startTransition(() => {
      window.location.href = href;
    });
  };

  return (
    <SidebarGroup {...props} className="mt-4">
      <SidebarGroupContent>
        <SidebarMenu className="space-y-2">
          {items.map((route) => {
            const isActive = pathname.includes(route.href);
            const isLoading = isPending && clickedHref === route.href;
            return (
              <SidebarMenuItem key={route.label}>
                <SidebarMenuButton
                  asChild
                  size="default"
                  className={cn(
                    "group relative overflow-hidden transition-all duration-300 ease-vision",
                    "hover:bg-sidebar-accent/60 hover: hover:shadow-vision-sm",
                    "rounded-xl border border-transparent hover:border-sidebar-border/30",
                    isActive && [
                      "bg-linear-to-r from-primary/50 to-gradient-secondary/30",
                      "border-primary/30 shadow-vision text-primary-foreground",
                      "",
                    ]
                  )}
                >
                  <span
                    role="link"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavigation(route.href);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleNavigation(route.href);
                      }
                    }}
                    className="relative flex items-center px-4 py-3 w-full cursor-pointer"
                  >
                    <div className="relative">
                      <route.icon
                        className={cn(
                          "w-5 h-5 group-hover:scale-110 transition-all duration-300",
                          isActive
                            ? "text-foreground"
                            : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                        )}
                      />
                      {isActive && (
                        <div className="absolute inset-0 bg-primary/20 blur-sm rounded-full" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "flex-1 ml-3 font-medium text-vision-sm tracking-tight transition-colors duration-300",
                        isActive
                          ? "text-foreground"
                          : "text-sidebar-foreground/80 group-hover:text-sidebar-foreground"
                      )}
                    >
                      {route.label}
                    </span>

                    {isLoading && (
                      <Loader2 className="ml-2 w-4 h-4 text-primary animate-spin" />
                    )}

                    {/* Glass shimmer effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent skew-x-12 transition-transform -translate-x-full group-hover:translate-x-full duration-1000 ease-out" />
                    </div>
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
