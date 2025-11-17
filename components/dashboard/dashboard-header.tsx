"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { BrainCircuit, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CurrentUserAvatar } from "../auth/current-user-avatar";
import { LogoutButton } from "../auth/logout-button";
import { ThemeToggle } from "../theme-toggle";
import Breadcrumbs from "./Breadcumbs";

export function DashboardHeader() {
  const { data, isPending } = authClient.useSession();
  const user = data?.user ?? null;

  return (
    <header className="top-0 z-30 sticky flex items-center gap-4 bg-background supports-backdrop-filter:bg-background/80 backdrop-blur-md px-6 border-b h-16">
      <div className="flex items-center gap-2 font-bold text-xl">
        <Link href="/" className="flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-primary" />
          <span>DevRecruit AI</span>
        </Link>
        <Suspense>
          <Breadcrumbs />
        </Suspense>
      </div>
      <div className="flex items-center gap-4 ml-auto">
        <ThemeToggle />
        {isPending ? (
          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
        ) : (
          <>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <CurrentUserAvatar />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Il mio account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {/* <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile">Profilo</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">Impostazioni</Link>
                  </DropdownMenuItem> */}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogoutButton />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild>
                <Link href="/auth/login">Accedi</Link>
              </Button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
