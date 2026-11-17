"use client";

import { cn } from "cn";
import { useEffect, useState } from "react";

import { GUIDE_SECTIONS } from "./sections";

/**
 * Index of the guide: sticky rail on desktop, collapsible card on mobile.
 * Highlights the section being read; the active entry is only a hint, so it
 * never traps keyboard focus.
 */
export function GuideToc() {
  const [active, setActive] = useState<string>(GUIDE_SECTIONS[0].id);

  useEffect(() => {
    const sections = GUIDE_SECTIONS.map((section) =>
      document.getElementById(section.id),
    ).filter((section): section is HTMLElement => section !== null);
    if (sections.length === 0) return;

    let ticking = false;
    const sync = () => {
      const y = window.scrollY + 160;
      let current = sections[0].id;
      for (const section of sections) {
        if (section.offsetTop <= y) current = section.id;
      }
      // At the bottom of the page the last section stays selected
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      setActive(atBottom ? sections[sections.length - 1].id : current);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        sync();
        ticking = false;
      });
    };

    sync();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("hashchange", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("hashchange", onScroll);
    };
  }, []);

  const items = GUIDE_SECTIONS.map((section) => {
    const isActive = section.id === active;
    return (
      <li key={section.id}>
        <a
          href={`#${section.id}`}
          aria-current={isActive ? "true" : undefined}
          className={cn(
            "block border-l-2 -ml-px py-1.5 pr-2 pl-3 text-[0.82rem] leading-snug transition-colors",
            isActive
              ? "border-primary bg-primary/8 font-medium text-primary"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
          )}
        >
          <span className="text-muted-foreground/70 mr-1.5 tabular-nums">
            {section.number}
          </span>
          {section.title}
        </a>
      </li>
    );
  });

  return (
    <>
      <nav
        aria-label="Indice della guida"
        className="top-20 hidden sticky self-start lg:block"
      >
        <p className="mb-3 pl-3 font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
          Indice
        </p>
        <ol className="border-border border-l">{items}</ol>
      </nav>

      <details className="group bg-card rounded-xl ring-1 ring-border lg:hidden">
        <summary className="flex items-center justify-between gap-2 px-4 py-3 font-medium text-sm cursor-pointer select-none">
          Indice della guida
          <span
            aria-hidden
            className="text-muted-foreground text-xs transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </summary>
        <ol className="pb-3 px-2 border-border border-t">{items}</ol>
      </details>
    </>
  );
}
