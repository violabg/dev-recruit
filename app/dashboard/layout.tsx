import { AppSidebar } from "@/components/dashboard/app-sidebar";
import Breadcrumbs from "@/components/dashboard/Breadcrumbs";
import { SessionRefreshProvider } from "@/components/dashboard/session-refresh-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import type React from "react";
import { Suspense } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <SessionRefreshProvider />
      <AppSidebar />
      {/* <SidebarInset> */}
      <SidebarInset>
        {/* <SidebarInset className="dark:bg-[linear-gradient(to_bottom_right,var(--background),oklch(0.18_0.03_260.5))]"> */}
        <header className="top-0 z-30 sticky flex items-center gap-2 bg-background/95 supports-backdrop-filter:bg-background/60 backdrop-blur px-4 border-b rounded-t-lg h-16 group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 transition-[width,height] ease-linear shrink-0">
          <div className="flex items-center gap-2 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Suspense fallback={<Skeleton className="w-40 h-4" />}>
              <Breadcrumbs />
            </Suspense>
            <div className="flex-1 text-right">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <div className="p-4 h-full">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
