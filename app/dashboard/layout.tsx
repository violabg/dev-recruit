import { AppSidebar } from "@/components/dashboard/app-sidebar";
import Breadcrumbs from "@/components/dashboard/Breadcumbs";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type React from "react";
import { Suspense } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <header className="top-0 z-30 sticky flex items-center gap-2 bg-glass-bg/60 supports-backdrop-filter:bg-glass-bg/40 border-glass-border border-b rounded-t-xl h-16 shrink-0">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Suspense>
              <Breadcrumbs />
            </Suspense>
            <div className="flex-1 text-right">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <div className="p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
