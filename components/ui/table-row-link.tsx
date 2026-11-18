"use client";

import Link from "next/link";
import * as React from "react";

import { cn } from "cn";

interface TableRowLinkProps
  extends Omit<React.ComponentProps<typeof Link>, "href"> {
  href: string;
  className?: string;
}

/**
 * A link that spans an entire table row.
 *
 * Usage:
 * 1. Add className="group" to the TableRow
 * 2. Put this component in the first TableCell (the cell must be `relative`)
 * 3. Add className="z-10 relative" to any TableCell with interactive elements
 *
 * The overlay width is measured against the row instead of a fixed 200vw:
 * a viewport-sized overlay created a large empty horizontal scroll area
 * inside the table container.
 *
 * With Partial Prefetching the App Shell is prefetched by default; the
 * per-link prefetch (which resolves params and includes cached content) runs
 * only once the pointer or the keyboard focus shows intent, so a table does
 * not make one server request per visible row.
 */
export function TableRowLink({
  className,
  children,
  href,
  ...props
}: TableRowLinkProps) {
  const linkRef = React.useRef<HTMLAnchorElement>(null);
  const [overlayWidth, setOverlayWidth] = React.useState<number>();
  const [intent, setIntent] = React.useState(false);

  React.useEffect(() => {
    const link = linkRef.current;
    const cell = link?.closest("td");
    const row = link?.closest("tr");
    if (!link || !cell || !row) return;

    const measure = () => {
      const cellRect = cell.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      // The cell is the overlay's containing block: the overlay covers the
      // rest of the row from the cell's left edge.
      setOverlayWidth(Math.max(0, rowRect.right - cellRect.left));
    };

    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  return (
    <Link
      ref={linkRef}
      href={href as never}
      prefetch={intent ? true : undefined}
      onMouseEnter={() => setIntent(true)}
      onFocus={() => setIntent(true)}
      onTouchStart={() => setIntent(true)}
      style={
        overlayWidth
          ? ({
              "--row-link-width": `${overlayWidth}px`,
            } as React.CSSProperties)
          : undefined
      }
      className={cn(
        "before:absolute before:inset-y-0 before:left-0 before:w-[var(--row-link-width,100%)] before:content-['']",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
