"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";

import type { Section } from "@/components/dashboard/sections";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/**
 * Fixed-size pending dot, always rendered and toggled via opacity so the row
 * never shifts. Only visible while a non-prefetched navigation is pending.
 */
function PendingDot() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "ml-auto rounded-full size-1.5 bg-primary transition-opacity group-data-[collapsible=icon]:hidden",
        pending ? "opacity-100 motion-safe:animate-pulse" : "opacity-0"
      )}
    />
  );
}

function NavItem({ item, isActive }: { item: Section; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={item.label}
        render={
          <Link
            href={item.href as never}
            aria-current={isActive ? "page" : undefined}
          />
        }
        className={cn(
          "relative h-9 text-muted-foreground transition-colors",
          // Active: brand-blue marker on the left edge
          "data-active:text-sidebar-accent-foreground data-active:shadow-xs",
          "before:absolute before:inset-y-2 before:left-0 before:rounded-full before:w-0.5 before:bg-primary before:opacity-0 data-active:before:opacity-100"
        )}
      >
        <Icon className={item.text} />
        <span>{item.label}</span>
        <PendingDot />
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function NavMain({
  items,
  ...props
}: {
  items: Section[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const pathname = usePathname();
  // The settings href points at its first sub-page; match on the section root.
  const isActive = (href: string) => {
    const root = href.split("/").slice(0, 3).join("/");
    return pathname === root || pathname.startsWith(`${root}/`);
  };

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => (
            <NavItem key={item.key} item={item} isActive={isActive(item.href)} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/**
 * Suspense fallback for <NavMain>: identical markup without the
 * pathname-dependent active state, so nothing shifts when it hydrates.
 */
export function NavMainFallback({ items }: { items: Section[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => (
            <NavItem key={item.key} item={item} isActive={false} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
