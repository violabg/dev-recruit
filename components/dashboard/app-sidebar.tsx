"use client";

import {
  BrainCircuit,
  Briefcase,
  FileQuestion,
  MessageSquareMore,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

import { NavMain } from "@/components/dashboard/nav-main";
import { NavUser } from "@/components/dashboard/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Suspense } from "react";

const data = {
  navSecondary: [
    // {
    //   href: "/dashboard",
    //   label: "Dashboard",
    //   icon: LayoutDashboard,
    // },
    {
      href: "/dashboard/positions",
      label: "Posizioni",
      icon: Briefcase,
    },
    {
      href: "/dashboard/candidates",
      label: "Candidati",
      icon: Users,
    },
    {
      href: "/dashboard/quizzes",
      label: "Quiz",
      icon: FileQuestion,
    },
    {
      href: "/dashboard/presets",
      label: "Presets",
      icon: Sparkles,
    },
    {
      href: "/dashboard/interviews",
      label: "Colloqui",
      icon: MessageSquareMore,
    },
    {
      href: "/dashboard/settings/reference-data",
      label: "Impostazioni",
      icon: Settings,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props} className="bg-sidebar border-r-0">
      <SidebarHeader className="p-4 border-sidebar-border/50 border-b">
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
      <SidebarContent className="px-2 py-2">
        <Suspense
          fallback={
            <div className="space-y-3 mt-4 p-2">
              {data.navSecondary.map((_, idx) => (
                <Skeleton
                  key={idx}
                  className="bg-foreground/10 rounded w-full h-8"
                />
              ))}
            </div>
          }
        >
          <NavMain items={data.navSecondary} />
        </Suspense>
      </SidebarContent>
      <SidebarFooter className="p-4 border-sidebar-border/50 border-t">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
