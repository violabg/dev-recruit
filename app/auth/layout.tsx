import { ThemeToggle } from "@/components/theme-toggle";
import { BrainCircuit } from "lucide-react";
import Link from "next/link";
import type React from "react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="top-0 z-30 sticky flex items-center gap-4 bg-background supports-backdrop-filter:bg-background/80 backdrop-blur-md px-6 border-b h-16">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Link href="/" className="flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-primary" />
            <span>DevRecruit AI</span>
          </Link>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <ThemeToggle />
        </div>
      </header>
      {children}
    </>
  );
}
