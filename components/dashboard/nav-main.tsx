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
                    "group relative rounded-md overflow-hidden transition-all duration-200",
                    "hover:bg-muted-foreground/20 dark:hover:bg-muted-foreground/30 hover:text-foreground hover:scale-[1.02] hover:shadow-sm",
                    "active:scale-[0.98]",
                    isActive
                      ? "bg-muted-foreground/15 dark:bg-muted-foreground/25 text-foreground font-medium shadow-sm border-l-2 border-primary"
                      : "text-muted-foreground hover:translate-x-0.5"
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
                    className="relative flex items-center px-2 py-2 w-full cursor-pointer"
                  >
                    <route.icon
                      className={cn(
                        "mr-2 w-4 h-4 transition-colors",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "flex-1 text-sm transition-colors",
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {route.label}
                    </span>

                    {isLoading && (
                      <Loader2 className="ml-2 w-4 h-4 text-primary animate-spin" />
                    )}
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
