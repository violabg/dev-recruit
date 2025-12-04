"use client";

import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/utils";

interface TableRowLinkProps
  extends Omit<React.ComponentProps<typeof Link>, "href"> {
  href: string;
  className?: string;
}

/**
 * A link component designed to span an entire table row.
 * Works in Safari by using ::before pseudo-element positioned relative to the table cell.
 *
 * Usage:
 * 1. Add className="group" to the TableRow
 * 2. Wrap your first TableCell content with this component
 * 3. Add className="z-10 relative" to any TableCell with interactive elements (buttons, dropdowns)
 *
 * The link uses a large fixed width to cover all columns reliably.
 */
export function TableRowLink({
  className,
  children,
  href,
  ...props
}: TableRowLinkProps) {
  return (
    <Link
      href={href as never}
      className={cn(
        // Position the ::before pseudo-element to cover the entire row
        // Using a very large width ensures it covers all columns
        "before:absolute before:inset-y-0 before:left-0 before:w-[200vw] before:-translate-x-1/2 before:content-['']",
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
