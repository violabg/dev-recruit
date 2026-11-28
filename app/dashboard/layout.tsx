import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SessionRefreshProvider } from "@/components/dashboard/session-refresh-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { CircleHelp } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { ViewTransition } from "react";

/**
 * Shell: navy rail on the left (both themes); on the right a white band (top
 * bar + page header) above the grey canvas. Breadcrumbs live in each page
 * header; the top bar holds the navigation and theme controls. `page-shell`/
 * `page-frame` (globals.css) centre the content and let the page header band
 * span the whole width.
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
      {/* min-w-0: as a flex item the inset defaults to min-width:auto, so the
          nowrap content of a wide table would push the whole page instead of
          scrolling inside the table container. */}
      <SidebarInset className="page-shell overflow-clip min-w-0">
        <header className="top-0 z-30 sticky flex items-center gap-3 bg-band/90 supports-backdrop-filter:bg-band/75 backdrop-blur px-4 md:px-8 border-b h-12 shrink-0">
          <SidebarTrigger className="-ml-1.5 text-muted-foreground" />
          <div className="flex items-center gap-1 ml-auto">
            <Link
              href="/guida"
              title="Guida operativa"
              aria-label="Apri la guida operativa"
              className={buttonVariants({
                variant: "ghost",
                size: "icon-sm",
                className: "text-muted-foreground",
              })}
            >
              <CircleHelp className="size-[1.2rem]" />
            </Link>
            <ThemeToggle />
          </div>
        </header>
        {/* React 19.3 View Transition: route navigations are Transitions, so the
            content area cross-fades between pages (header/sidebar stay put). */}
        <ViewTransition default="none" update="page-fade">
          <div className="page-frame pb-12 w-full h-full">
            {children}
          </div>
        </ViewTransition>
      </SidebarInset>
    </SidebarProvider>
  );
}
