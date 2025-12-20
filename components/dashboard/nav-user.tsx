"use client";

import { BadgeCheck, ChevronsUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { CurrentUserAvatar } from "../auth/current-user-avatar";
import { LogoutButton } from "../auth/logout-button";

export function NavUser() {
  const { data, isPending } = authClient.useSession();
  const user = data?.user ?? null;
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            {isPending ? (
              <>
                <Skeleton className="dark:bg-muted-foreground/30 rounded-full size-8" />
                <div className="flex-1 gap-1 grid">
                  <Skeleton className="dark:bg-muted-foreground/30 w-24 h-4" />
                  <Skeleton className="dark:bg-muted-foreground/30 w-32 h-3" />
                </div>
              </>
            ) : (
              <>
                <CurrentUserAvatar />
                <div className="flex-1 grid text-sm text-left leading-tight">
                  <span className="font-medium truncate">
                    {user?.name ?? user?.email ?? ""}
                  </span>
                  <span className="text-xs truncate">{user?.email}</span>
                </div>
              </>
            )}
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="rounded-lg w-(--radix-dropdown-menu-trigger-width) min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-sm text-left">
                  <CurrentUserAvatar />
                  <div className="flex-1 grid text-sm text-left leading-tight">
                    <span className="font-medium truncate">
                      {user?.name ?? user?.email ?? ""}
                    </span>
                    <span className="text-xs truncate">{user?.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheck />
                <Link href="/dashboard/profile">Profilo</Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <LogoutButton variant="ghost" />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
