"use client";

import { BrainCircuit } from "lucide-react";

import { NavMain, NavMainFallback } from "@/components/dashboard/nav-main";
import { NavUser } from "@/components/dashboard/nav-user";
import { NAV_SECTIONS } from "@/components/dashboard/sections";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Suspense } from "react";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" collapsible="icon" {...props} className="bg-sidebar border-r-0">
      <SidebarHeader className="p-2 border-sidebar-border/50 border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <Link href="/dashboard" className="flex items-center gap-3" />
              }
              className="group data-[state=open]:bg-sidebar-accent hover:bg-transparent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex justify-center items-center bg-primary shadow-sm rounded-lg size-8 aspect-square text-primary-foreground">
                <BrainCircuit className="size-5" />
              </div>
              <div className="flex-1 grid text-sm text-left leading-tight">
                <span className="font-semibold truncate">DevRecruit AI</span>
                <span className="text-muted-foreground text-xs truncate">
                  Enterprise
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <Suspense fallback={<NavMainFallback items={NAV_SECTIONS} />}>
          <NavMain items={NAV_SECTIONS} />
        </Suspense>
      </SidebarContent>
      <SidebarFooter className="p-2 border-sidebar-border/50 border-t">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
