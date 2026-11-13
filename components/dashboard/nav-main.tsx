"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

import type { Section } from "@/components/dashboard/sections";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type NavGroup = { label?: string; items: Section[] };

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
        "ml-auto rounded-full size-1.5 bg-sidebar-ring transition-opacity group-data-[collapsible=icon]:hidden",
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
          "relative h-9 text-sidebar-foreground/75 transition-colors",
          "hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
          "data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground",
          // Active marker on the rail edge
          "before:absolute before:inset-y-2 before:left-0 before:rounded-r-full before:w-[3px] before:bg-sidebar-ring before:opacity-0 data-active:before:opacity-100 group-data-[collapsible=icon]:before:hidden"
        )}
      >
        <Icon className={item.text} />
        <span>{item.label}</span>
        <PendingDot />
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function useIsActive() {
  const pathname = usePathname();
  // Match on the section root (settings links to its first sub-page).
  return (href: string) => {
    const root = href.split("/").slice(0, 3).join("/");
    return pathname === root || pathname.startsWith(`${root}/`);
  };
}

function NavGroups({
  groups,
  isActive,
}: {
  groups: NavGroup[];
  isActive: (href: string) => boolean;
}) {
  return groups.map((group, i) => (
    <SidebarGroup key={group.label ?? i} className="py-1">
      {group.label && (
        <SidebarGroupLabel className="text-sidebar-foreground/55">
          {group.label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {group.items.map((item) => (
            <NavItem key={item.key} item={item} isActive={isActive(item.href)} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ));
}

export function NavMain({ groups }: { groups: NavGroup[] }) {
  const isActive = useIsActive();
  return <NavGroups groups={groups} isActive={isActive} />;
}

/**
 * Suspense fallback for <NavMain>: identical markup without the
 * pathname-dependent active state, so nothing shifts when it hydrates.
 */
export function NavMainFallback({ groups }: { groups: NavGroup[] }) {
  return <NavGroups groups={groups} isActive={() => false} />;
}
