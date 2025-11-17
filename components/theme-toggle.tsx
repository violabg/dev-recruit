"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MonitorCog, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="glass"
          size="icon"
          className="group relative hover:shadow-vision-md overflow-hidden transition-all duration-300 ease-vision"
        >
          <Sun className="w-[1.2rem] h-[1.2rem] text-primary group-hover:text-gradient-primary rotate-0 dark:-rotate-90 scale-100 dark:scale-0 transition-all duration-500 ease-vision" />
          <Moon className="absolute w-[1.2rem] h-[1.2rem] text-primary group-hover:text-gradient-secondary rotate-90 dark:rotate-0 scale-0 dark:scale-100 transition-all duration-500 ease-vision" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="shadow-vision-lg border-glass-border min-w-[180px] glass-card"
      >
        <DropdownMenuItem
          className="group justify-between hover:bg-primary/10 focus:bg-primary/10 rounded-lg hover:text-primary focus:text-primary transition-all duration-300 cursor-pointer"
          onClick={() => setTheme("light")}
        >
          <span className="font-medium">Chiaro</span>
          <Sun className="w-4 h-4 group-hover:text-gradient-primary transition-colors duration-300" />
        </DropdownMenuItem>
        <DropdownMenuItem
          className="group justify-between hover:bg-primary/10 focus:bg-primary/10 rounded-lg hover:text-primary focus:text-primary transition-all duration-300 cursor-pointer"
          onClick={() => setTheme("dark")}
        >
          <span className="font-medium">Scuro</span>
          <Moon className="w-4 h-4 group-hover:text-gradient-secondary transition-colors duration-300" />
        </DropdownMenuItem>
        <DropdownMenuItem
          className="group justify-between hover:bg-primary/10 focus:bg-primary/10 rounded-lg hover:text-primary focus:text-primary transition-all duration-300 cursor-pointer"
          onClick={() => setTheme("system")}
        >
          <span className="font-medium">Sistema</span>
          <MonitorCog className="w-4 h-4 group-hover:text-gradient-accent transition-colors duration-300" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
