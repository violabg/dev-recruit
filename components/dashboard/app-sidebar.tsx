"use client";

import {
  BrainCircuit,
  Briefcase,
  FileQuestion,
  MessageSquareMore,
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
      href: "/dashboard/interviews",
      label: "Colloqui",
      icon: MessageSquareMore,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props} className="border-r-0">
      <SidebarHeader className="border-b-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="group font-semibold text-xl"
            >
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="relative">
                  <BrainCircuit className="size-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="flex-1 grid leading-tight">
                  <span className="font-bold tracking-tight">
                    DevRecruit AI
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <Suspense fallback={<div>Loading...</div>}>
          <NavMain items={data.navSecondary} />
        </Suspense>
      </SidebarContent>
      <SidebarFooter className="bg-sidebar m-2 border rounded-xl">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
