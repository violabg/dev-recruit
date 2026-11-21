"use client";

import { SECTIONS } from "@/components/dashboard/sections";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";

const SECTION_HREFS = Object.values(SECTIONS)
  .map((s) => s.href)
  .sort((a, b) => b.length - a.length);

/**
 * Icon-only back button in the gutter left of the page title. Hidden on a
 * section's main page and below md, where the page gutter is too narrow.
 * Goes back in the browser history; without history (page opened directly)
 * it opens the section's main page.
 */
export function PageBackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (SECTION_HREFS.includes(pathname)) return null;

  const sectionHref =
    SECTION_HREFS.find((href) => pathname.startsWith(`${href}/`)) ??
    "/dashboard";

  return (
    <button
      type="button"
      aria-label="Indietro"
      title="Indietro"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(sectionHref as Route);
      }}
      className="hidden md:inline-flex top-1.5 -left-8 absolute justify-center items-center hover:bg-muted rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring size-7 text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="size-4" />
    </button>
  );
}
