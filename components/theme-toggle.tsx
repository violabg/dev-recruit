"use client";

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * One click switches theme: light ↔ dark.
 *
 * The first visit follows the system preference (`defaultTheme="system"` in the
 * root provider); after the first click the choice is the user's and is saved.
 * The icons are switched by CSS, not by state, so the server and the client
 * render the same markup.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground"
      title="Cambia tema"
      aria-label="Cambia tema"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="w-[1.2rem] h-[1.2rem] rotate-0 dark:-rotate-90 scale-100 dark:scale-0 transition-all" />
      <Moon className="absolute w-[1.2rem] h-[1.2rem] rotate-90 dark:rotate-0 scale-0 dark:scale-100 transition-all" />
    </Button>
  );
}
