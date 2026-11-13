import { AppSidebar } from "@/components/dashboard/app-sidebar";
import Breadcrumbs from "@/components/dashboard/Breadcrumbs";
import { SessionRefreshProvider } from "@/components/dashboard/session-refresh-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import type React from "react";
import { Suspense, ViewTransition } from "react";

/**
 * Shell: light rail (navy ink in dark mode) on the left; content sits on a rounded canvas sheet
 * (inset variant). The top bar shows the location as a slash path.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <SessionRefreshProvider />
      <AppSidebar />
      <SidebarInset className="md:peer-data-[variant=inset]:shadow-none md:peer-data-[variant=inset]:ring-1 md:peer-data-[variant=inset]:ring-border overflow-clip">
        <header className="top-0 z-30 sticky flex items-center gap-3 bg-background/85 supports-backdrop-filter:bg-background/70 backdrop-blur px-4 md:px-8 border-b h-12 shrink-0">
          <SidebarTrigger className="-ml-1.5 text-muted-foreground" />
          <div className="bg-border w-px h-4" aria-hidden />
          <Suspense fallback={<Skeleton className="w-40 h-4" />}>
            <Breadcrumbs />
          </Suspense>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        {/* React 19.3 View Transition: route navigations are Transitions, so the
            content area cross-fades between pages (header/sidebar stay put). */}
        <ViewTransition default="none" update="page-fade">
          <div className="mx-auto px-4 md:px-8 pt-6 md:pt-8 pb-12 w-full max-w-[1400px] h-full">
            {children}
          </div>
        </ViewTransition>
      </SidebarInset>
    </SidebarProvider>
  );
}
