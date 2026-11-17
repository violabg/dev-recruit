"use client";

import { BrainCircuit } from "lucide-react";

import { NavMain, NavMainFallback } from "@/components/dashboard/nav-main";
import { NavUser } from "@/components/dashboard/nav-user";
import {
  NAV_FOOTER,
  NAV_GROUPS,
  visibleNavItems,
} from "@/components/dashboard/sections";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { Suspense } from "react";

/**
 * Sidebar: near-white in light mode, navy ink rail in dark mode. The `ink`
 * class (globals.css, dark only) re-tunes text and section hues for the navy; it's applied on each
 * slot so the mobile sheet gets it too.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Admin-only entries (Utenti) are hidden until the session says admin.
  // Presentation only: the pages and actions check the role on the server.
  const { data } = authClient.useSession();
  const footerGroups = [
    {
      items: visibleNavItems(
        NAV_FOOTER,
        (data?.user as { role?: string | null } | undefined)?.role,
      ),
    },
  ];

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader className="ink px-2 pt-3 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="DevRecruit AI"
              render={<Link href="/dashboard" />}
              className="hover:bg-sidebar-accent/60"
            >
              <div className="flex justify-center items-center bg-primary rounded-lg size-8 aspect-square text-primary-foreground">
                <BrainCircuit className="size-5" />
              </div>
              <div className="flex-1 grid text-left leading-tight">
                <span className="font-display font-semibold text-[1.05rem] text-sidebar-foreground tracking-tight truncate">
                  DevRecruit
                </span>
                <span className="text-sidebar-foreground/60 text-xs truncate">
                  Selezione tecnica con AI
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="ink pt-1">
        <Suspense fallback={<NavMainFallback groups={NAV_GROUPS} />}>
          <NavMain groups={NAV_GROUPS} />
        </Suspense>
      </SidebarContent>
      <SidebarFooter className="ink gap-1 p-0 pb-3">
        <Suspense fallback={<NavMainFallback groups={footerGroups} />}>
          <NavMain groups={footerGroups} />
        </Suspense>
        <div className="mx-4 border-sidebar-border border-t" />
        <div className="px-2">
          <NavUser />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
