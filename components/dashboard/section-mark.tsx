"use client";

import {
  NAV_FOOTER,
  NAV_GROUPS,
  SECTIONS,
  type Section,
} from "@/components/dashboard/sections";
import { cn } from "cn";
import { usePathname } from "next/navigation";

/** Longest href first, so `/dashboard/settings/users` wins over `/dashboard`. */
const BY_HREF = Object.values(SECTIONS).sort(
  (a, b) => b.href.length - a.href.length,
);

/** Sidebar group of each section: the eyebrow of a section's main page. */
const GROUP_OF = new Map<string, string | undefined>([
  ...NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => [item.key, group.label] as const),
  ),
  ...NAV_FOOTER.map((item) => [item.key, "Impostazioni"] as const),
]);

function sectionFor(pathname: string): Section {
  return (
    BY_HREF.find(
      (s) => pathname === s.href || pathname.startsWith(`${s.href}/`),
    ) ??
    (pathname.startsWith("/dashboard/settings") ? SECTIONS.settings : undefined) ??
    SECTIONS.overview
  );
}

/** Height kept while the pathname is read, so the title does not jump. */
export function SectionMarkPlaceholder() {
  return <div aria-hidden className="mb-2 h-6" />;
}

/**
 * Section identity in the header band, from the URL: a stripe in the
 * section's hue along the top of the band (positioned against it) and an
 * eyebrow with the sidebar icon. On a section's main page the eyebrow names
 * the sidebar group; on an inner page it names the section.
 */
export function SectionMark() {
  const pathname = usePathname();
  const section = sectionFor(pathname);
  const Icon = section.icon;
  const isMain = pathname === section.href;
  const label = isMain
    ? (GROUP_OF.get(section.key) ?? section.label)
    : section.label;

  return (
    <>
      <span
        aria-hidden
        className={cn("top-0 absolute inset-x-0 h-[3px]", section.rule)}
      />
      <div className="flex items-center gap-2 mb-2 h-6">
        <span
          aria-hidden
          className={cn(
            "inline-flex justify-center items-center rounded-md ring-1 size-6",
            section.tile,
          )}
        >
          <Icon className={cn("size-3.5", section.text)} />
        </span>
        <span className={cn("font-semibold text-sm", section.text)}>
          {label}
        </span>
      </div>
    </>
  );
}
